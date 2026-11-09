#!/usr/bin/env python3
"""Compute content_hash and dedupe_key for the synthetic listing fixtures.

This is the algorithm in docs/data-contract.md section 16. It is a
documentation check, not a product validator and not a sync client.

Run from the repository root:

    python3 docs/listings/compute_listing_hashes.py

The script reads the five fixture files, checks them against the matching
JSON samples in docs/data-contract.md, recomputes both digests, checks
fixed-deadline instants with the IANA timezone data, and exits non-zero
on any mismatch. Synthetic fixtures are not production listings.

accept_url is the section 12.1 record check. It does not rewrite a URL.
normalise_url is a separate producer helper. A rewritten string is not
an accepted record until accept_url is applied to that new string.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = ROOT / "docs" / "listings" / "fixtures"
CONTRACT = ROOT / "docs" / "data-contract.md"
OUTPUT = ROOT / "docs" / "listings" / "hash-output.txt"

VALID_NAMES = (
    "valid-scholarship",
    "valid-internship",
    "valid-job",
    "valid-historical-expired",
    "valid-tombstone",
)

SET_ARRAYS = (
    ("eligibility", "citizenship", "countries"),
    ("eligibility", "education", "stages"),
    ("eligibility", "education", "qualifications"),
    ("eligibility", "education", "courses"),
    ("eligibility", "education", "years"),
    ("eligibility", "education", "institutions", "names"),
    ("eligibility", "demographics", "requirements"),
    ("eligibility", "demographics", "preferences"),
    ("eligibility", "audience_tags"),
    ("documents_required",),
)
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

TRACKING = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "igshid",
    "ref",
}

LISTING_ID = re.compile(r"^lst_[0-9A-HJKMNP-TV-Z]{26}$")
UTC = ZoneInfo("UTC")
WAT = "Africa/Lagos"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def nfc(value):
    """Unicode NFC on every string. Objects, arrays, null, and numbers pass through."""
    if isinstance(value, str):
        return unicodedata.normalize("NFC", value)
    if isinstance(value, list):
        return [nfc(item) for item in value]
    if isinstance(value, dict):
        return {nfc(key): nfc(item) for key, item in value.items()}
    return value


def jcs_bytes(value) -> bytes:
    """RFC 8785 subset used by this contract: UTF-8, sorted keys, no extra space.

    This schema version has no fractional numbers. json.dumps with
    ensure_ascii=False does not escape solidus or non-ASCII characters.
    Null stays null. Absent keys are not invented.
    """
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _host_error(host: str):
    if not host or ":" in host:
        return "host"
    if re.fullmatch(r"\d+\.\d+\.\d+\.\d+", host):
        return "ip_literal"
    reserved = ("example.com", "example.org", "example.net", "localhost")
    if host in reserved or any(host.endswith("." + name) for name in reserved):
        return "placeholder_host"
    labels = host.split(".")
    if any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in labels):
        return "host"
    return None


def _query_error(query: str):
    if query == "":
        return None
    pairs = query.split("&")
    parsed = []
    for pair in pairs:
        if "=" not in pair:
            return "query"
        key, value = pair.split("=", 1)
        if not re.fullmatch(r"[a-z0-9._~-]+", key):
            return "query_key"
        if key in TRACKING:
            return "tracking_query"
        if value and not re.fullmatch(r"(?:[A-Za-z0-9._~-]|%[0-9A-F]{2})*", value):
            return "query_value"
        parsed.append((key, value))
    if parsed != sorted(parsed):
        return "query_order"
    if len(parsed) != len(set(key for key, _ in parsed)):
        return "query_duplicate"
    return None


def _path_error(path: str):
    if path == "":
        return None
    if not path.startswith("/") or path.endswith("/") or "//" in path:
        return "path"
    segments = path.split("/")[1:]
    for segment in segments:
        if segment in {".", ".."} or not re.fullmatch(r"[A-Za-z0-9._~-]+", segment):
            return "path"
    return None


def accept_url(url: str):
    """Record acceptance. Returns an error name, or None. Does not rewrite the string.

    This is the section 12.1 check. It is documentation support for that written
    rule, not a product validator, and it is not normalise_url.
    """
    if not isinstance(url, str) or re.search(r"[\s]", url):
        return "whitespace"
    if "#" in url:
        return "fragment"
    if not url.startswith("https://"):
        return "scheme"
    rest = url[len("https://"):]
    if not rest or "@" in rest.split("/")[0].split("?")[0]:
        return "userinfo"
    host_and_more = rest
    if "/" in host_and_more:
        host, tail = host_and_more.split("/", 1)
        tail = "/" + tail
    else:
        host, tail = host_and_more, ""
    if "?" in host:
        return "host"
    query = ""
    path = tail
    if "?" in tail:
        path, query = tail.split("?", 1)
        if "?" in query:
            return "query"
    if _host_error(host):
        return _host_error(host)
    path_error = _path_error(path)
    if path_error:
        return path_error
    return _query_error(query)


def normalise_url(url: str) -> str:
    """Producer prep only. Not record acceptance.

    A caller who stores the input unchanged has not accepted it. Compare the
    input with accept_url separately. The result can still fail accept_url.
    """
    if not isinstance(url, str) or re.search(r"[\s]", url):
        raise ValueError("whitespace")
    parts = urlsplit(url)
    if parts.scheme.lower() != "https" or parts.username or parts.password:
        raise ValueError("not normalisable")
    host = (parts.hostname or "").lower().rstrip(".")
    if parts.port not in (None, 443):
        raise ValueError("port")
    path = parts.path or ""
    if path == "/":
        path = ""
    elif len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    pairs = []
    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        if key.lower() in TRACKING:
            continue
        pairs.append((key.lower(), value))
    pairs.sort()
    query = urlencode(pairs)
    return urlunsplit(("https", host, path, query, ""))


def walk(obj, path):
    current = obj
    for part in path:
        if not isinstance(current, dict) or part not in current:
            return None, False
        current = current[part]
    return current, True


def array_is_sorted(items) -> bool:
    encoded = [item.encode("utf-8") if isinstance(item, str) else None for item in items]
    if any(item is None for item in encoded):
        return False
    return encoded == sorted(encoded) and len(items) == len(set(items))


def assert_canonical_shape(listing: dict) -> None:
    if not LISTING_ID.match(listing["listing_id"]):
        raise SystemExit(f"listing_id is not canonical: {listing.get('listing_id')}")
    normalized = nfc(listing)
    if normalized != listing:
        raise SystemExit(f"{listing['listing_id']} is not Unicode NFC")
    for path in SET_ARRAYS:
        value, present = walk(listing, path)
        if not present:
            continue
        if not isinstance(value, list) or not array_is_sorted(value):
            raise SystemExit(f"{listing['listing_id']} array {'.'.join(path)} is not sorted unique")
    for path in (("application", "url"), ("source", "url"), ("provider", "url")):
        value, present = walk(listing, path)
        if value is None:
            continue
        reason = accept_url(value)
        if reason:
            raise SystemExit(f"{listing['listing_id']} {'.'.join(path)} rejected by accept_url: {reason}")


def dedupe_key(listing: dict) -> str:
    """Identity of one opportunity round. The application URL is not an input."""
    identity = listing["identity"]
    parts = [
        listing["kind"],
        identity["provider_key"],
        identity["opportunity_key"],
        identity["round_key"],
    ]
    for part in parts:
        if not isinstance(part, str) or SLUG.match(part) is None:
            raise SystemExit(f"dedupe material is not a slug: {part!r}")
    return sha256_hex("\n".join(parts).encode("utf-8"))


def check_freshness(listing: dict) -> None:
    verification = listing["verification"]
    success = verification["last_success_at"]
    fresh = verification["fresh_until"]
    if (success is None) != (fresh is None):
        raise SystemExit(f"{listing['listing_id']} freshness pair is inconsistent")
    if success is None:
        return
    start = datetime.strptime(success, "%Y-%m-%dT%H:%M:%SZ")
    until = datetime.strptime(fresh, "%Y-%m-%dT%H:%M:%SZ")
    if until != start + timedelta(hours=168):
        raise SystemExit(f"{listing['listing_id']} fresh_until is not exactly 168 hours")
    if verification["reviewed_by"] == "automation" and verification["reviewer_id"] is not None:
        raise SystemExit(f"{listing['listing_id']} labels automation with a human reviewer")
    if verification["reviewed_by"] == "human" and not verification["reviewer_id"]:
        raise SystemExit(f"{listing['listing_id']} human review has no reviewer id")


def content_hash(listing: dict) -> str:
    body = {key: value for key, value in listing.items() if key != "content_hash"}
    return sha256_hex(jcs_bytes(nfc(body)))


def resolve_fixed_at(deadline: dict) -> str:
    """UTC instant for a fixed deadline. Measured with zoneinfo, not a hand offset."""
    if deadline["kind"] != "fixed":
        raise ValueError("not fixed")
    zone_name = deadline["resolved_timezone"]
    zone = ZoneInfo(zone_name)
    if zone.key != zone_name:
        raise ValueError(f"use the canonical IANA name {zone.key}")
    year, month, day = (int(part) for part in deadline["display_date"].split("-"))
    hour, minute, second = (int(part) for part in deadline["local_time"].split(":"))
    naive = datetime(year, month, day, hour, minute, second)
    aware = naive.replace(tzinfo=zone)
    # A spring-forward gap does not round-trip. Do not invent a shifted instant.
    if aware.astimezone(UTC).astimezone(zone).replace(tzinfo=None) != naive:
        raise ValueError("local time falls in a DST gap")
    utc = aware.astimezone(UTC)
    if utc.microsecond:
        raise ValueError("offset produced a fractional second")
    return utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def check_deadline(listing: dict) -> str:
    deadline = listing["deadline"]
    kind = deadline["kind"]
    if kind in {"rolling", "unknown"}:
        for field in (
            "form",
            "stated_timezone",
            "resolved_timezone",
            "display_date",
            "local_time",
            "boundary",
            "fixed_at",
        ):
            if deadline[field] is not None:
                raise SystemExit(f"{listing['listing_id']} {kind} deadline has {field}")
        if kind == "unknown" and deadline["raw_text"] is not None:
            raise SystemExit(f"{listing['listing_id']} unknown deadline has raw_text")
        if kind == "rolling" and not deadline["raw_text"]:
            raise SystemExit(f"{listing['listing_id']} rolling deadline lacks raw_text")
        return "n/a"
    if deadline["form"] not in {"date_only", "instant"}:
        raise SystemExit("fixed deadline form")
    stated = deadline["stated_timezone"]
    resolved = deadline["resolved_timezone"]
    if stated is None:
        if resolved != WAT:
            raise SystemExit("missing zone must resolve to Africa/Lagos")
    elif resolved != stated:
        raise SystemExit("stated zone and resolved zone differ")
    if deadline["form"] == "date_only":
        if deadline["local_time"] != "23:59:59" or deadline["boundary"] != "inclusive_end_of_local_day":
            raise SystemExit("date-only deadline must be 23:59:59 inclusive")
    elif deadline["boundary"] != "instant":
        raise SystemExit("explicit time must use boundary instant")
    measured = resolve_fixed_at(deadline)
    if deadline["fixed_at"] != measured:
        raise SystemExit(
            f"{listing['listing_id']} fixed_at {deadline['fixed_at']} != measured {measured}"
        )
    return measured


def contract_samples() -> dict:
    text = CONTRACT.read_text(encoding="utf-8")
    found = {}
    for name, body in re.findall(r"<!-- sample:([a-z0-9-]+) -->\n```json\n(.*?)\n```", text, re.S):
        found[name] = json.loads(body)
    return found


def tzdata_version() -> str:
    path = Path("/usr/share/zoneinfo/tzdata.zi")
    if not path.exists():
        return "unknown"
    first = path.read_text(encoding="utf-8", errors="replace").splitlines()[0]
    return first.removeprefix("# ").strip()


def self_checks() -> list[str]:
    """Measured checks for null/absent, Unicode, array order, URL, and identity."""
    lines = []
    with_null = sha256_hex(jcs_bytes({"a": None}))
    absent = sha256_hex(jcs_bytes({}))
    if with_null == absent:
        raise SystemExit("null and absent hashed the same")
    lines.append(f"self_check_null_vs_absent: null={with_null} absent={absent}")

    composed = unicodedata.normalize("NFC", "e\u0301")
    decomposed = "e\u0301"
    raw_decomposed = sha256_hex(jcs_bytes({"s": decomposed}))
    after_nfc = sha256_hex(jcs_bytes(nfc({"s": decomposed})))
    composed_hash = sha256_hex(jcs_bytes({"s": composed}))
    if after_nfc != composed_hash or raw_decomposed == composed_hash:
        raise SystemExit("NFC self-check failed")
    lines.append(f"self_check_unicode_nfc: composed={composed_hash}")

    unsorted = sha256_hex(jcs_bytes({"countries": ["NG", "GH"]}))
    sorted_hash = sha256_hex(jcs_bytes({"countries": ["GH", "NG"]}))
    if unsorted == sorted_hash:
        raise SystemExit("array order did not change the hash")
    lines.append("self_check_array_order: GH before NG differs from NG before GH")

    accepted = [
        "https://apply.rivertrust.example/2027",
        "https://rivertrust.example",
        "https://apply.rivertrust.example/Path?a=1&b=2",
    ]
    rejected = [
        ("http://apply.rivertrust.example/2027", "scheme"),
        ("https://user:pass@apply.rivertrust.example/2027", "userinfo"),
        ("https://apply.rivertrust.example/2027#form", "fragment"),
        ("https://apply.rivertrust.example:443/2027", "host"),
        ("https://Apply.Rivertrust.example/2027", "host"),
        ("https://apply.rivertrust.example/2027/", "path"),
        ("https://localhost/2027", "placeholder_host"),
        ("https://example.com/2027", "placeholder_host"),
        ("https://apply.example.com/2027", "placeholder_host"),
        ("https://apply.rivertrust.example/2027?utm_source=x", "tracking_query"),
        ("https://apply.rivertrust.example/2027?b=1&a=2", "query_order"),
        ("https://apply.rivertrust.example/2027?B=1", "query_key"),
        ("https://apply.rivertrust.example/2027?q=%2f", "query_value"),
    ]
    for url in accepted:
        if accept_url(url) is not None:
            raise SystemExit(f"expected accept {url} got {accept_url(url)}")
        lines.append(f"url_accept: {url} ok")
    for url, reason in rejected:
        got = accept_url(url)
        if got != reason:
            raise SystemExit(f"expected reject {url} {reason} got {got}")
        lines.append(f"url_reject: {url} {reason}")
    dirty = "https://Apply.River.Example/Path/?utm_source=x&b=2&a=1"
    cleaned = normalise_url(dirty)
    if accept_url(dirty) is None or cleaned != "https://apply.river.example/Path?a=1&b=2" or accept_url(cleaned) is not None:
        raise SystemExit(f"normaliser oracle failed: {accept_url(dirty)} {cleaned} {accept_url(cleaned)}")
    lines.append(f"url_normalise_not_acceptance: input={dirty}")
    lines.append("url_normalise_not_acceptance: input_accepted=no")
    lines.append(f"url_normalise_not_acceptance: output={cleaned}")
    lines.append("url_normalise_not_acceptance: output_accepted=yes")

    if LISTING_ID.match("lst_01ARZ3NDEKTSV4RRFFQ69G5FAV") is None:
        raise SystemExit("identity pattern rejected a known synthetic id")
    if LISTING_ID.match("lst_IIIIIIIIIIIIIIIIIIIIIIIIII") is not None:
        raise SystemExit("identity pattern accepted I")
    lines.append("self_check_identity: crockford listing_id accepted; I rejected")
    same_round = sha256_hex("scholarship\nriver-trust\nbridge-award\n2026".encode("utf-8"))
    next_round = sha256_hex("scholarship\nriver-trust\nbridge-award\n2027".encode("utf-8"))
    if same_round == next_round:
        raise SystemExit("round key did not change dedupe")
    lines.append(f"self_check_round: same_round={same_round}")
    lines.append(f"self_check_new_round: next_round={next_round}")
    lines.append("self_check_url_not_in_dedupe: application URL is not dedupe material")
    return lines


def main() -> int:
    embedded = contract_samples()
    lines = [
        "synthetic: true",
        "not_production_data: true",
        f"command: python3 docs/listings/compute_listing_hashes.py",
        f"python: {sys.version.split()[0]}",
        f"tzdata: {tzdata_version()}",
        "hash_excludes: content_hash",
        "hash_includes: dedupe_key and every other stored field, including JSON null",
        "collision_rule: same dedupe_key with a different listing_id is a duplicate of that round",
        "url_rule: application URL is not dedupe material and does not block a new round",
        "version_rule: same listing_id and revision with a different content_hash is revision_conflict",
    ]
    lines.extend(self_checks())
    seen_ids = {}
    seen_keys = {}
    for name in VALID_NAMES:
        path = FIXTURE_DIR / f"{name}.json"
        listing = json.loads(path.read_text(encoding="utf-8"))
        if embedded.get(name) != listing:
            raise SystemExit(f"{name} fixture does not match the contract sample")
        assert_canonical_shape(listing)
        measured_dedupe = dedupe_key(listing)
        measured_hash = content_hash(listing)
        if listing["dedupe_key"] != measured_dedupe:
            raise SystemExit(f"{name} dedupe_key mismatch\n stored {listing['dedupe_key']}\n measured {measured_dedupe}")
        if listing["content_hash"] != measured_hash:
            raise SystemExit(f"{name} content_hash mismatch\n stored {listing['content_hash']}\n measured {measured_hash}")
        instant = check_deadline(listing)
        check_freshness(listing)
        if listing["listing_id"] in seen_ids:
            raise SystemExit(f"listing_id collision {listing['listing_id']}")
        if measured_dedupe in seen_keys:
            raise SystemExit(f"dedupe_key collision {measured_dedupe}")
        seen_ids[listing["listing_id"]] = name
        seen_keys[measured_dedupe] = name
        lines.append(
            "\n".join(
                [
                    f"fixture: docs/listings/fixtures/{name}.json",
                    f"listing_id: {listing['listing_id']}",
                    f"kind: {listing['kind']}",
                    f"revision: {listing['revision']}",
                    f"dedupe_key: {measured_dedupe}",
                    f"content_hash: {measured_hash}",
                    f"deadline_fixed_at: {instant}",
                    "assert: match",
                ]
            )
        )
    # Oracle instants, measured here, including one explicit non-sample clock time.
    oracles = [
        ("date_only_no_zone", "2027-03-31", None, "23:59:59"),
        ("date_only_europe_london", "2026-10-31", "Europe/London", "23:59:59"),
        ("date_only_wat_default_check", "2026-01-15", None, "23:59:59"),
        ("instant_europe_paris", "2027-06-01", "Europe/Paris", "15:00:00"),
    ]
    for label, day, stated, local in oracles:
        resolved = stated or WAT
        instant = resolve_fixed_at(
            {
                "kind": "fixed",
                "display_date": day,
                "local_time": local,
                "resolved_timezone": resolved,
            }
        )
        lines.append(
            f"oracle: {label} stated={stated or 'none'} resolved={resolved} local={day}T{local} fixed_at={instant}"
        )
    success = datetime(2026, 11, 8, 9, 0, 0)
    fresh = success + timedelta(hours=168)
    stale = fresh + timedelta(seconds=1)
    lines.append(
        "oracle_freshness: success=2026-11-08T09:00:00Z "
        f"fresh_until={fresh.strftime('%Y-%m-%dT%H:%M:%SZ')} "
        f"still_active_at={fresh.strftime('%Y-%m-%dT%H:%M:%SZ')} "
        f"stale_at={stale.strftime('%Y-%m-%dT%H:%M:%SZ')}"
    )
    lines.append(f"fixtures_checked: {len(VALID_NAMES)}")
    lines.append("result: ok")
    report = "\n".join(lines) + "\n"
    OUTPUT.write_text(report, encoding="utf-8")
    sys.stdout.write(report)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        raise SystemExit(0)
