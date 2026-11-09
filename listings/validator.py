"""Deterministic producer validator for ogverse.listings 1.0.0.

The rules are the pinned contract
``GoodnessOni/pathsync-ai`` ``docs/data-contract.md`` at
``b50440dc738d86ff3070386d8709b8faf2bc5982``, vendored under
``listings/reference/pathsync-ai/``. This module does not fetch that pin,
does not read the wall clock, and does not rewrite a listing.

``accept_url`` is the section 12.1 record check. It does not normalise.
Section 12.2 ``normalise_url`` is a producer helper and is not implemented
here. Student matching, sync, storage, and retention enforcement are not
this validator.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from datetime import datetime, timedelta
from http import HTTPStatus
from zoneinfo import ZoneInfo

CONTRACT_EVALUATION_TIME = "2026-11-08T12:00:00Z"
SCHEMA_VERSION = "1.0.0"
MAX_SAFE_INT = 2**53 - 1
WAT = "Africa/Lagos"
UTC = ZoneInfo("UTC")

TS_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$")
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
TIME_RE = re.compile(r"^[0-9]{2}:[0-9]{2}:[0-9]{2}$")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
LISTING_ID_RE = re.compile(r"^lst_[0-9A-HJKMNP-TV-Z]{26}$")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
EMAIL_SEARCH_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
NIN_RE = re.compile(r"\b\d{11}\b")
PHONE_RE = re.compile(r"\b(?:\+?234|0)[789]\d{9}\b")
# A whole evidence string is an HTTP status line when it is only a status code,
# or that code plus a known reason phrase for it. Terminal . ! ? and letter
# case do not make it something else. This is not a reading of a sentence.
_HTTP_STATUS_LINE = re.compile(
    r"(?:(?:HTTP(?:/[0-9]+(?:\.[0-9]+)?)?|status):?\s+)?"
    r"([1-5][0-9]{2})"
    r"(?:\s+(.+))?",
    re.IGNORECASE,
)
# Earlier RFC spellings of the same code. http.HTTPStatus on Python 3.12 already
# carries the other historical spelling, including 418 "I'm a Teapot" from
# RFC 2324. RFC 9110 marks 418 unused; that library phrase is still a status
# line, and this table does not call 418 a current IANA assignment.
_HTTP_HISTORICAL_REASON_PHRASES = {
    302: ("Moved Temporarily",),  # RFC 1945; later "Found"
    413: ("Payload Too Large", "Content Too Large"),  # RFC 7231, RFC 9110
    414: ("URI Too Long",),  # RFC 7231 / RFC 9110
    416: ("Range Not Satisfiable",),  # RFC 7231 / RFC 9110
    422: ("Unprocessable Content",),  # RFC 9110
    504: ("Gateway Time-out",),  # RFC 2616; later "Gateway Timeout"
}


def _normalise_http_reason(phrase):
    return re.sub(r"\s+", " ", phrase).strip().casefold()


def _build_http_reason_phrases():
    phrases = {}
    for status in HTTPStatus:
        phrases.setdefault(int(status), set()).add(_normalise_http_reason(status.phrase))
    for code, aliases in _HTTP_HISTORICAL_REASON_PHRASES.items():
        bucket = phrases.setdefault(int(code), set())
        for alias in aliases:
            bucket.add(_normalise_http_reason(alias))
    return {code: frozenset(values) for code, values in phrases.items()}


_HTTP_REASON_PHRASES = _build_http_reason_phrases()
# A whole line that starts with an HTTP version or a Status label. The reason
# phrase may be any text for that line. A missing space after Status: or
# between the code and the reason is still that line. A . ! or ? before more
# text is a second sentence, so the string is not the status line alone.
_EXPLICIT_STATUS_LINE = re.compile(
    r"(?:HTTP(?:/[0-9]+(?:\.[0-9]+)?)?\s+|status(?::\s*|\s+))"
    r"[1-5][0-9]{2}(?:\s*[^!?.]+)?",
    re.IGNORECASE,
)

# ISO 3166-1 alpha-2 assigned codes from the local iso-codes list used while
# implementing this pin (249 codes). ZZ is the contract's explicit unknown
# country, not an assigned ISO code. Citizenship lists do not use ZZ.
_ISO_ASSIGNED = (
    "ADAEAFAGAIALAMAOAQARASATAUAWAXAZBABBBDBEBFBGBHBIBJBLBMBNBOBQBRBSBTBVBWBYBZ"
    "CACCCDCFCGCHCICKCLCMCNCOCRCUCVCWCXCYCZDEDJDKDMDODZECEEEGEHERESETFIFJFKFMFO"
    "FRGAGBGDGEGFGGGHGIGLGMGNGPGQGRGSGTGUGWGYHKHMHNHRHTHUIDIEILIMINIOIQIRISITJE"
    "JMJOJPKEKGKHKIKMKNKPKRKWKYKZLALBLCLILKLRLSLTLULVLYMAMCMDMEMFMGMHMKMLMMMNMO"
    "MPMQMRMSMTMUMVMWMXMYMZNANCNENFNGNINLNONPNRNUNZOMPAPEPFPGPHPKPLPMPNPRPSPTPW"
    "PYQARERORSRURWSASBSCSDSESGSHSISJSKSLSMSNSOSRSSSTSVSXSYSZTCTDTFTGTHTJTKTLTM"
    "TNTOTRTTTVTWTZUAUGUMUSUYUZVAVCVEVGVIVNVUWFWSYEYTZAZMZW"
)
ISO_ASSIGNED = frozenset(_ISO_ASSIGNED[i : i + 2] for i in range(0, len(_ISO_ASSIGNED), 2))
assert len(ISO_ASSIGNED) == 249
COUNTRY_OR_ZZ = ISO_ASSIGNED | {"ZZ"}

TRACKING = frozenset(
    {
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
)

PLACEHOLDERS = frozenset(
    {
        "various",
        "see listing",
        "see the listing",
        "n/a",
        "na",
        "tbc",
        "tba",
        "unknown",
        "test",
        "none",
        "null",
        "not specified",
        "not available",
        "provider",
        "company",
        "remote",
    }
)
TITLE_PLACEHOLDERS = PLACEHOLDERS | {"untitled", "scholarship", "job", "internship"}

STAND_INS = frozenset(
    {
        "Not specified",
        "Not available",
        "Varies",
        "TBC",
        "TBA",
        "null",
        "2099-12-31",
        "1970-01-01",
        "9999-12-31",
    }
)

KINDS = frozenset({"scholarship", "internship", "job"})
PROVIDER_TYPES = frozenset(
    {"government", "tertiary_institution", "company", "foundation", "ngo", "multilateral", "unknown"}
)
SOURCE_KINDS = frozenset({"official", "aggregator", "news", "manual", "unknown"})
URL_KINDS = frozenset(
    {"direct_application", "official_programme_page", "aggregator_page", "unknown"}
)
OFFICIAL_APPLICATION_KINDS = frozenset({"direct_application", "official_programme_page"})
CITIZENSHIP = frozenset({"explicit", "unconstrained", "unknown"})
EDUCATION = frozenset({"unrestricted", "restricted", "unknown"})
STAGES = frozenset({"secondary", "undergraduate", "postgraduate"})
QUALIFICATIONS = frozenset({"secondary_school", "bachelor", "master", "doctorate"})
COURSES = frozenset(
    {
        "agriculture",
        "architecture",
        "arts",
        "business",
        "computer_science",
        "education",
        "engineering",
        "health",
        "humanities",
        "law",
        "mathematics",
        "medicine",
        "natural_sciences",
        "social_sciences",
        "other",
    }
)
YEARS = frozenset({"100", "200", "300", "400", "500", "postgraduate"})
GRADE = frozenset({"explicit", "none", "unknown"})
DEMOGRAPHICS = frozenset(
    {
        "female",
        "disability",
        "first_generation",
        "low_income",
        "northern_nigeria",
        "niger_delta",
        "rural",
    }
)
AUDIENCE = frozenset(
    {
        "nigerian_university_student",
        "nigerian_postgraduate",
        "nigerian_secondary",
        "african_student",
        "open_international",
    }
)
AWARD_KINDS = frozenset({"cash", "full_tuition", "stipend", "unpaid", "mixed", "not_stated"})
FUNDED_AWARDS = frozenset({"cash", "full_tuition", "stipend", "mixed"})
CURRENCIES = frozenset({"NGN", "USD", "GBP", "EUR", "OTHER"})
AMOUNT_CURRENCIES = frozenset({"NGN", "USD", "GBP", "EUR"})
PERIODS = frozenset({"one_off", "per_year", "per_month", "full_programme"})
ARRANGEMENTS = frozenset({"on_site", "remote", "hybrid", "unknown"})
JOB_EMPLOYMENT = frozenset({"full_time", "part_time", "contract", "temporary", "unspecified"})
PUBLICATION = frozenset({"draft", "published", "withdrawn"})
LIFE_STATUS = frozenset({"open", "closed", "expired"})
CLOSED_REASONS = frozenset(
    {
        "deadline_passed",
        "provider_closed",
        "duplicate",
        "untrusted",
        "removed_by_producer",
        "superseded",
    }
)
PUBLISHED_CLOSED_REASONS = frozenset({"provider_closed", "duplicate", "untrusted"})
WITHDRAWN_REASONS = frozenset({"removed_by_producer", "superseded"})
VERIFY_STATE = frozenset({"unverified", "verified"})
OUTCOMES = frozenset(
    {"confirmed_open", "confirmed_closed", "confirmed_expired", "confirmed_withdrawn"}
)
ATTEMPT_OUTCOMES = OUTCOMES | {"inconclusive", "failed"}
METHODS = frozenset({"automated_review", "human_review"})
REVIEWED_BY = frozenset({"automation", "human"})

FREE_TEXT_EXACT = frozenset(
    {
        "title",
        "summary",
        "description",
        "how_to_apply",
        "eligibility.criteria_text",
        "deadline.raw_text",
        "provider.name",
        "location.locality",
        "award.summary",
        "employment.duration_text",
    }
)


class _Field:
    def __init__(self, type_name, nullable=False, children=None, item=None):
        self.type_name = type_name
        self.nullable = nullable
        self.children = children
        self.item = item


def _obj(children, nullable=False):
    return _Field("object", nullable=nullable, children=children)


def _arr(item="string"):
    return _Field("array", nullable=False, item=item)


def _str(nullable=False):
    return _Field("string", nullable=nullable)


def _int(nullable=False):
    return _Field("integer", nullable=nullable)


def _bool(nullable=False):
    return _Field("boolean", nullable=nullable)


_INSTITUTIONS = {
    "requirement": _str(),
    "names": _arr(),
}
_EDUCATION = {
    "requirement": _str(),
    "stages": _arr(),
    "qualifications": _arr(),
    "courses": _arr(),
    "years": _arr(),
    "institutions": _obj(_INSTITUTIONS),
    "source_wording": _str(),
}
_ELIGIBILITY = {
    "citizenship": _obj({"requirement": _str(), "countries": _arr()}),
    "education": _obj(_EDUCATION),
    "grade": _obj(
        {
            "requirement": _str(),
            "scale": _str(True),
            "minimum_hundredths": _int(True),
            "source_wording": _str(),
        }
    ),
    "demographics": _obj({"requirements": _arr(), "preferences": _arr()}),
    "audience_tags": _arr(),
    "criteria_stated": _bool(),
    "criteria_text": _str(),
}
_DEADLINE = {
    "kind": _str(),
    "form": _str(True),
    "stated_timezone": _str(True),
    "resolved_timezone": _str(True),
    "display_date": _str(True),
    "local_time": _str(True),
    "boundary": _str(True),
    "fixed_at": _str(True),
    "raw_text": _str(True),
}
_VERIFICATION = {
    "state": _str(),
    "outcome": _str(True),
    "method": _str(True),
    "reviewed_by": _str(True),
    "reviewer_id": _str(True),
    "source_checked_url": _str(True),
    "evidence": _str(True),
    "last_attempt_at": _str(True),
    "last_attempt_outcome": _str(True),
    "last_success_at": _str(True),
    "fresh_until": _str(True),
}
_TIMESTAMPS = {
    "created_at": _str(),
    "updated_at": _str(),
    "published_at": _str(True),
    "expired_at": _str(True),
    "closed_at": _str(True),
    "withdrawn_at": _str(True),
}
_TOP = {
    "schema_version": _str(),
    "listing_id": _str(),
    "kind": _str(),
    "synthetic": _bool(),
    "revision": _int(),
    "title": _str(),
    "summary": _str(),
    "description": _str(),
    "provider": _obj(
        {"name": _str(), "type": _str(), "country": _str(), "url": _str(True)}
    ),
    "source": _obj(
        {"name": _str(), "kind": _str(), "url": _str(), "retrieved_at": _str()}
    ),
    "application": _obj({"url": _str(), "url_kind": _str(), "contact_email": _str(True)}),
    "eligibility": _obj(_ELIGIBILITY),
    "deadline": _obj(_DEADLINE),
    "award": _obj(
        {
            "kind": _str(),
            "summary": _str(True),
            "currency": _str(True),
            "amount_minor": _int(True),
            "period": _str(True),
        }
    ),
    "location": _obj({"country": _str(), "locality": _str(True), "arrangement": _str()}),
    "employment": _obj(
        {
            "employment_type": _str(),
            "duration_text": _str(True),
            "paid": _bool(True),
        },
        nullable=True,
    ),
    "documents_required": _arr(),
    "how_to_apply": _str(),
    "lifecycle": _obj(
        {
            "publication_status": _str(),
            "status": _str(),
            "closed_reason": _str(True),
        }
    ),
    "verification": _obj(_VERIFICATION),
    "timestamps": _obj(_TIMESTAMPS),
    "identity": _obj(
        {
            "provider_key": _str(),
            "opportunity_key": _str(),
            "round_key": _str(),
            "round_evidence": _str(),
        }
    ),
    "dedupe_key": _str(),
    "content_hash": _str(),
    "previous_round_id": _str(True),
}


class _DuplicateKey(Exception):
    pass


def _pairs(pairs):
    seen = set()
    obj = {}
    for key, value in pairs:
        if key in seen:
            raise _DuplicateKey()
        seen.add(key)
        obj[key] = value
    return obj


def _join(path, key):
    name = key if isinstance(key, str) else str(key)
    return name if path == "" else f"{path}.{name}"


def json_type(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return "invalid"


def _type_ok(expected, value):
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    return False


def _error(code, field, expected=None, actual=None, evaluation_time=None):
    item = {"code": code, "field": field, "message": f"{code}: {field}"}
    if expected is not None:
        item["expected"] = expected
    if actual is not None:
        item["actual"] = actual
    if evaluation_time is not None:
        item["evaluation_time"] = evaluation_time
    return item


def _push(errors, code, field, expected=None, actual=None, evaluation_time=None):
    for existing in errors:
        if existing["code"] == code and existing["field"] == field:
            return
    errors.append(
        _error(
            code,
            field,
            expected=expected,
            actual=actual,
            evaluation_time=evaluation_time,
        )
    )


def _sort(errors):
    return sorted(errors, key=lambda item: (item["field"].encode("utf-8"), item["code"].encode("utf-8")))


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
    """RFC 8785 subset used by this contract: UTF-8, sorted keys, no extra space."""
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def content_hash(listing: dict) -> str:
    """SHA-256 of the listing with content_hash removed. Strings are NFC first."""
    body = {key: value for key, value in listing.items() if key != "content_hash"}
    return sha256_hex(jcs_bytes(nfc(body)))


def dedupe_key(listing: dict) -> str:
    """SHA-256 of kind, provider_key, opportunity_key, and round_key. URL is not an input."""
    identity = listing["identity"]
    parts = [
        listing["kind"],
        identity["provider_key"],
        identity["opportunity_key"],
        identity["round_key"],
    ]
    return sha256_hex("\n".join(parts).encode("utf-8"))


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
    """Section 12.1 record acceptance. Returns an internal reason, or None.

    The reason is not a public validator code. Callers report ``non_canonical_url``.
    This function does not rewrite the string.
    """
    if not isinstance(url, str) or re.search(r"[\s]", url):
        return "whitespace"
    if "#" in url:
        return "fragment"
    if not url.startswith("https://"):
        return "scheme"
    rest = url[len("https://") :]
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


def _valid_date(value):
    if not isinstance(value, str) or DATE_RE.fullmatch(value) is None:
        return False
    year, month, day = (int(part) for part in value.split("-"))
    try:
        datetime(year, month, day)
    except ValueError:
        return False
    return True


def _valid_hms(value):
    if not isinstance(value, str) or TIME_RE.fullmatch(value) is None:
        return False
    hour, minute, second = (int(part) for part in value.split(":"))
    return 0 <= hour <= 23 and 0 <= minute <= 59 and 0 <= second <= 59


def parse_utc(value):
    """Return a naive UTC datetime, or None when the instant is not the contract form."""
    if not isinstance(value, str) or TS_RE.fullmatch(value) is None:
        return None
    date, clock = value[:-1].split("T")
    if not _valid_date(date) or not _valid_hms(clock):
        return None
    year, month, day = (int(part) for part in date.split("-"))
    hour, minute, second = (int(part) for part in clock.split(":"))
    return datetime(year, month, day, hour, minute, second)


def canonical_zone(name):
    if not isinstance(name, str) or name == "":
        return False
    try:
        zone = ZoneInfo(name)
    except Exception:
        return False
    return zone.key == name


def measured_fixed_at(display_date, local_time, resolved_timezone):
    """UTC instant of a civil time in an IANA zone, fold=0.

    Raises ValueError('gap') when the local time does not exist, and
    ValueError('zone') when the zone name is not canonical.
    """
    if not canonical_zone(resolved_timezone):
        raise ValueError("zone")
    if not _valid_date(display_date) or not _valid_hms(local_time):
        raise ValueError("clock")
    zone = ZoneInfo(resolved_timezone)
    year, month, day = (int(part) for part in display_date.split("-"))
    hour, minute, second = (int(part) for part in local_time.split(":"))
    naive = datetime(year, month, day, hour, minute, second)
    aware = naive.replace(tzinfo=zone)
    # fold=0 is the earlier occurrence. A spring-forward gap does not round-trip.
    if aware.astimezone(UTC).astimezone(zone).replace(tzinfo=None) != naive:
        raise ValueError("gap")
    utc = aware.astimezone(UTC)
    if utc.microsecond:
        raise ValueError("fraction")
    return utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def _load(listing):
    if isinstance(listing, (str, bytes)):
        try:
            parsed = json.loads(listing, object_pairs_hook=_pairs)
        except _DuplicateKey:
            return None, [_error("invalid_json", "$")]
        except json.JSONDecodeError:
            return None, [_error("invalid_json", "$")]
        if not isinstance(parsed, dict):
            return None, [
                _error("invalid_type", "$", expected="object", actual=json_type(parsed))
            ]
        return parsed, []
    if isinstance(listing, dict):
        return listing, []
    return None, [_error("invalid_type", "$", expected="object", actual=json_type(listing))]


def _walk(value, schema, path, errors):
    if not isinstance(value, dict):
        return
    for key in value:
        if key not in schema:
            _push(errors, "unknown_field", _join(path, key))
    for key, field in schema.items():
        fpath = _join(path, key)
        if key not in value:
            _push(errors, "missing_required_field", fpath)
            continue
        item = value[key]
        if item is None:
            if not field.nullable:
                _push(
                    errors,
                    "invalid_type",
                    fpath,
                    expected=field.type_name,
                    actual="null",
                )
            continue
        if not _type_ok(field.type_name, item):
            _push(
                errors,
                "invalid_type",
                fpath,
                expected=field.type_name,
                actual=json_type(item),
            )
            continue
        if field.type_name == "object":
            _walk(item, field.children, fpath, errors)
        elif field.type_name == "array":
            for index, element in enumerate(item):
                ipath = f"{fpath}[{index}]"
                if not _type_ok(field.item, element):
                    _push(
                        errors,
                        "invalid_type",
                        ipath,
                        expected=field.item,
                        actual=json_type(element),
                    )


def _stage1(listing):
    errors = []
    _walk(listing, _TOP, "", errors)
    return _sort(errors)


def _each_string(value, path, visit):
    if isinstance(value, str):
        visit(path, value)
    elif isinstance(value, dict):
        for key, item in value.items():
            _each_string(item, _join(path, key), visit)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _each_string(item, f"{path}[{index}]", visit)


def _ascii_lower(value):
    return "".join(chr(ord(char) + 32) if "A" <= char <= "Z" else char for char in value)


def _hygiene_problem(value):
    if unicodedata.normalize("NFC", value) != value:
        return True
    if value != value.strip():
        return True
    if any(ord(char) <= 0x1F for char in value):
        return True
    if "<" in value or ">" in value:
        return True
    return False


def _free_text(path):
    if path in FREE_TEXT_EXACT:
        return True
    if path.startswith("documents_required[") or path.startswith(
        "eligibility.education.institutions.names["
    ):
        return True
    return False


def _evidence_is_http_status_alone(evidence):
    """True when the whole string is an HTTP status line, not other prose.

    An explicit ``HTTP`` or ``Status`` line is status-only whatever its reason
    phrase says. Without that prefix, only a bare code or a known reason phrase
    is status-only. Text after ``.``, ``!``, or ``?`` is a further sentence.
    """
    core = re.sub(r"[.!?]+$", "", evidence)
    if _EXPLICIT_STATUS_LINE.fullmatch(core):
        return True
    matched = _HTTP_STATUS_LINE.fullmatch(core)
    if matched is None:
        return False
    code = int(matched.group(1))
    reason = matched.group(2)
    if reason is None:
        return True
    normalised = re.sub(r"\s+", " ", reason).strip().casefold()
    return normalised in _HTTP_REASON_PHRASES.get(code, ())


def _personal(value):
    return (
        NIN_RE.search(value) is not None
        or PHONE_RE.search(value) is not None
        or EMAIL_SEARCH_RE.search(value) is not None
    )


def _check_strings(listing, errors):
    def visit(path, value):
        if path == "":
            return
        if _hygiene_problem(value):
            _push(errors, "invalid_constraint", path)
        if path == "title" and _ascii_lower(value.strip()) in TITLE_PLACEHOLDERS:
            _push(errors, "placeholder_name", path)
        elif path == "provider.name" and _ascii_lower(value.strip()) in PLACEHOLDERS:
            _push(errors, "placeholder_name", path)
        if _free_text(path) and _personal(value):
            _push(errors, "forbidden_personal_data", path)

    _each_string(listing, "", visit)


def _length(errors, value, field, low, high):
    if not isinstance(value, str) or not (low <= len(value) <= high):
        _push(errors, "invalid_constraint", field)


def _enum(errors, value, allowed, field):
    if value not in allowed:
        _push(errors, "invalid_enum", field)
        return False
    return True


def _require_ts(errors, value, field):
    parsed = parse_utc(value)
    if parsed is None:
        _push(errors, "invalid_constraint", field)
    return parsed


def _sorted_unique(errors, items, field):
    encoded = [item.encode("utf-8") for item in items]
    if encoded != sorted(encoded) or len(items) != len(set(items)):
        _push(errors, "invalid_constraint", field)


def _tokens(errors, items, allowed, field):
    for index, item in enumerate(items):
        if item not in allowed:
            _push(errors, "invalid_enum", f"{field}[{index}]")


def _check_schema_identity(listing, errors):
    if listing["schema_version"] != SCHEMA_VERSION:
        _push(errors, "invalid_constraint", "schema_version")
    if LISTING_ID_RE.fullmatch(listing["listing_id"]) is None:
        _push(errors, "invalid_constraint", "listing_id")
    _enum(errors, listing["kind"], KINDS, "kind")
    revision = listing["revision"]
    if isinstance(revision, bool) or not isinstance(revision, int) or not (1 <= revision <= 1000000):
        _push(errors, "invalid_constraint", "revision")
    elif abs(revision) > MAX_SAFE_INT:
        _push(errors, "invalid_constraint", "revision")
    _length(errors, listing["title"], "title", 1, 180)
    _length(errors, listing["summary"], "summary", 1, 400)
    _length(errors, listing["description"], "description", 1, 8000)
    _length(errors, listing["how_to_apply"], "how_to_apply", 1, 4000)
    previous = listing["previous_round_id"]
    if previous is not None and LISTING_ID_RE.fullmatch(previous) is None:
        _push(errors, "invalid_constraint", "previous_round_id")


def _slug(errors, value, field, limit):
    if not isinstance(value, str) or SLUG_RE.fullmatch(value) is None or not (1 <= len(value) <= limit):
        _push(errors, "invalid_constraint", field)


def _check_provider_source_application(listing, errors):
    provider = listing["provider"]
    _length(errors, provider["name"], "provider.name", 1, 160)
    _enum(errors, provider["type"], PROVIDER_TYPES, "provider.type")
    if provider["country"] not in COUNTRY_OR_ZZ:
        _push(errors, "invalid_constraint", "provider.country")
    if isinstance(provider["url"], str) and accept_url(provider["url"]) is not None:
        _push(errors, "non_canonical_url", "provider.url")
    source = listing["source"]
    _slug(errors, source["name"], "source.name", 80)
    _enum(errors, source["kind"], SOURCE_KINDS, "source.kind")
    if accept_url(source["url"]) is not None:
        _push(errors, "non_canonical_url", "source.url")
    application = listing["application"]
    if accept_url(application["url"]) is not None:
        _push(errors, "non_canonical_url", "application.url")
    _enum(errors, application["url_kind"], URL_KINDS, "application.url_kind")
    email = application["contact_email"]
    if email is not None:
        if (
            not isinstance(email, str)
            or not (1 <= len(email) <= 120)
            or EMAIL_RE.fullmatch(email) is None
        ):
            _push(errors, "invalid_constraint", "application.contact_email")


def _check_eligibility(listing, errors):
    eligibility = listing["eligibility"]
    citizenship = eligibility["citizenship"]
    countries = citizenship["countries"]
    _sorted_unique(errors, countries, "eligibility.citizenship.countries")
    requirement = citizenship["requirement"]
    if requirement == "explicit":
        if (
            not (1 <= len(countries) <= 20)
            or any(country not in ISO_ASSIGNED for country in countries)
        ):
            _push(errors, "invalid_constraint", "eligibility.citizenship.requirement")
    elif requirement == "unconstrained":
        if countries != ["*"]:
            _push(errors, "invalid_constraint", "eligibility.citizenship.requirement")
    elif requirement == "unknown":
        if countries != []:
            _push(errors, "invalid_constraint", "eligibility.citizenship.requirement")
    else:
        _push(errors, "invalid_enum", "eligibility.citizenship.requirement")

    education = eligibility["education"]
    ereq = education["requirement"]
    known_education = _enum(errors, ereq, EDUCATION, "eligibility.education.requirement")
    for name, allowed in (
        ("stages", STAGES),
        ("qualifications", QUALIFICATIONS),
        ("courses", COURSES),
        ("years", YEARS),
    ):
        values = education[name]
        _sorted_unique(errors, values, f"eligibility.education.{name}")
        _tokens(errors, values, allowed, f"eligibility.education.{name}")
    institutions = education["institutions"]
    ireq = institutions["requirement"]
    _enum(errors, ireq, EDUCATION, "eligibility.education.institutions.requirement")
    names = institutions["names"]
    _sorted_unique(errors, names, "eligibility.education.institutions.names")
    if ireq == "restricted":
        if not (1 <= len(names) <= 30):
            _push(errors, "invalid_constraint", "eligibility.education.institutions.names")
    elif names:
        _push(errors, "invalid_constraint", "eligibility.education.institutions.names")
    wording = education["source_wording"]
    _length(errors, wording, "eligibility.education.source_wording", 1, 4000)
    filled = any(
        education[name]
        for name in ("stages", "qualifications", "courses", "years")
    ) or bool(names)
    withdrawn = listing["lifecycle"]["publication_status"] == "withdrawn"
    if known_education and ereq in {"unrestricted", "unknown"}:
        if filled or ireq != ereq:
            _push(errors, "invalid_constraint", "eligibility.education.requirement")
        # Unknown wording is the fixed sentence, except a tombstone, which must be [withdrawn].
        if ereq == "unknown" and not withdrawn and wording != "Not stated by the source.":
            _push(errors, "invalid_constraint", "eligibility.education.source_wording")
    elif known_education and ereq == "restricted" and not filled:
        _push(errors, "invalid_constraint", "eligibility.education.requirement")

    grade = eligibility["grade"]
    greq = grade["requirement"]
    if _enum(errors, greq, GRADE, "eligibility.grade.requirement"):
        scale = grade["scale"]
        hundredths = grade["minimum_hundredths"]
        if greq == "explicit":
            if scale not in {"4.0", "5.0"}:
                _push(errors, "invalid_constraint", "eligibility.grade.scale")
            else:
                limit = 400 if scale == "4.0" else 500
                if (
                    isinstance(hundredths, bool)
                    or not isinstance(hundredths, int)
                    or not (1 <= hundredths <= limit)
                ):
                    _push(errors, "invalid_constraint", "eligibility.grade.minimum_hundredths")
        else:
            if scale is not None:
                _push(errors, "invalid_constraint", "eligibility.grade.scale")
            if hundredths is not None:
                _push(errors, "invalid_constraint", "eligibility.grade.minimum_hundredths")
    _length(errors, grade["source_wording"], "eligibility.grade.source_wording", 1, 400)

    demographics = eligibility["demographics"]
    for name in ("requirements", "preferences"):
        values = demographics[name]
        _sorted_unique(errors, values, f"eligibility.demographics.{name}")
        _tokens(errors, values, DEMOGRAPHICS, f"eligibility.demographics.{name}")
    if set(demographics["requirements"]) & set(demographics["preferences"]):
        _push(errors, "invalid_constraint", "eligibility.demographics.requirements")

    tags = eligibility["audience_tags"]
    _sorted_unique(errors, tags, "eligibility.audience_tags")
    _tokens(errors, tags, AUDIENCE, "eligibility.audience_tags")
    if len(tags) > 6:
        _push(errors, "invalid_constraint", "eligibility.audience_tags")

    stated = eligibility["criteria_stated"]
    text = eligibility["criteria_text"]
    _length(errors, text, "eligibility.criteria_text", 1, 4000)
    if withdrawn:
        if text != "[withdrawn]":
            _push(errors, "invalid_constraint", "eligibility.criteria_text")
        if stated is not False:
            _push(errors, "invalid_constraint", "eligibility.criteria_stated")
        if wording != "[withdrawn]":
            _push(errors, "invalid_constraint", "eligibility.education.source_wording")
    else:
        if text == "[withdrawn]":
            _push(errors, "invalid_constraint", "eligibility.criteria_text")
        if wording == "[withdrawn]":
            _push(errors, "invalid_constraint", "eligibility.education.source_wording")
        if stated is False and text != "Not stated by the source.":
            _push(errors, "invalid_constraint", "eligibility.criteria_text")
        if stated is True and text in {"Not stated by the source.", "[withdrawn]"}:
            _push(errors, "invalid_constraint", "eligibility.criteria_text")


def _check_award(listing, errors):
    award = listing["award"]
    kind = award["kind"]
    summary = award["summary"]
    currency = award["currency"]
    amount = award["amount_minor"]
    period = award["period"]
    known = _enum(errors, kind, AWARD_KINDS, "award.kind")
    if summary is not None:
        _length(errors, summary, "award.summary", 1, 200)
    if currency is not None:
        _enum(errors, currency, CURRENCIES, "award.currency")
    if amount is not None and (
        isinstance(amount, bool) or not isinstance(amount, int) or not (0 <= amount <= MAX_SAFE_INT)
    ):
        _push(errors, "invalid_constraint", "award.amount_minor")
    if period is not None:
        _enum(errors, period, PERIODS, "award.period")
    if not known:
        return
    if kind == "not_stated":
        for field, value in (
            ("award.summary", summary),
            ("award.currency", currency),
            ("award.amount_minor", amount),
            ("award.period", period),
        ):
            if value is not None:
                _push(errors, "invalid_constraint", field)
    elif kind == "unpaid":
        if summary is None:
            _push(errors, "invalid_constraint", "award.summary")
        if currency is not None:
            _push(errors, "invalid_constraint", "award.currency")
        if amount is not None:
            _push(errors, "invalid_constraint", "award.amount_minor")
    elif kind in FUNDED_AWARDS:
        if summary is None:
            _push(errors, "invalid_constraint", "award.summary")
        if amount is not None:
            if currency not in AMOUNT_CURRENCIES:
                _push(errors, "invalid_constraint", "award.currency")
            if period is None:
                _push(errors, "invalid_constraint", "award.period")
        if currency == "OTHER" and amount is not None:
            _push(errors, "invalid_constraint", "award.currency")
    employment = listing["employment"]
    if isinstance(employment, dict):
        paid = employment.get("paid")
        if paid is True and kind in {"unpaid", "not_stated"}:
            _push(errors, "invalid_constraint", "award.kind")
        if paid is False and kind != "unpaid":
            _push(errors, "invalid_constraint", "award.kind")


def _check_location_employment(listing, errors):
    location = listing["location"]
    if location["country"] not in COUNTRY_OR_ZZ:
        _push(errors, "invalid_constraint", "location.country")
    if location["locality"] is not None:
        _length(errors, location["locality"], "location.locality", 1, 120)
    _enum(errors, location["arrangement"], ARRANGEMENTS, "location.arrangement")
    kind = listing["kind"]
    employment = listing["employment"]
    if kind == "scholarship":
        if employment is not None:
            _push(errors, "invalid_constraint", "employment")
        return
    if kind in {"internship", "job"} and not isinstance(employment, dict):
        _push(errors, "invalid_constraint", "employment")
        return
    if not isinstance(employment, dict):
        return
    etype = employment["employment_type"]
    if kind == "internship":
        if etype != "internship":
            _push(errors, "invalid_enum", "employment.employment_type")
    elif kind == "job":
        if etype not in JOB_EMPLOYMENT:
            _push(errors, "invalid_enum", "employment.employment_type")
    if employment["duration_text"] is not None:
        _length(errors, employment["duration_text"], "employment.duration_text", 1, 120)


def _check_documents(listing, errors):
    documents = listing["documents_required"]
    if len(documents) > 20:
        _push(errors, "invalid_constraint", "documents_required")
    _sorted_unique(errors, documents, "documents_required")
    for index, item in enumerate(documents):
        _length(errors, item, f"documents_required[{index}]", 1, 160)
    if listing["lifecycle"]["publication_status"] == "withdrawn" and documents != []:
        _push(errors, "invalid_constraint", "documents_required")
    if listing["lifecycle"]["publication_status"] != "withdrawn":
        for field in ("summary", "description", "how_to_apply"):
            if listing[field] == "[withdrawn]":
                _push(errors, "invalid_constraint", field)
    else:
        for field in ("summary", "description", "how_to_apply"):
            if listing[field] != "[withdrawn]":
                _push(errors, "invalid_constraint", field)
        if listing["title"] == "[withdrawn]":
            _push(errors, "invalid_constraint", "title")
        if listing["award"]["kind"] != "not_stated":
            _push(errors, "invalid_constraint", "award.kind")
        if listing["application"]["contact_email"] is not None:
            _push(errors, "invalid_constraint", "application.contact_email")


def _check_deadline(listing, errors):
    deadline = listing["deadline"]
    kind = deadline["kind"]
    if not _enum(errors, kind, {"fixed", "rolling", "unknown"}, "deadline.kind"):
        return
    cleared = (
        "form",
        "stated_timezone",
        "resolved_timezone",
        "display_date",
        "local_time",
        "boundary",
        "fixed_at",
    )
    if kind in {"rolling", "unknown"}:
        for field in cleared:
            if deadline[field] is not None:
                _push(errors, "invalid_constraint", f"deadline.{field}")
        raw = deadline["raw_text"]
        if kind == "unknown":
            if raw is not None:
                _push(errors, "invalid_constraint", "deadline.raw_text")
        elif not isinstance(raw, str) or not (1 <= len(raw) <= 300) or raw in STAND_INS:
            _push(errors, "invalid_constraint", "deadline.raw_text")
        return

    form = deadline["form"]
    if form not in {"date_only", "instant"}:
        _push(errors, "invalid_constraint", "deadline.form")
    stated = deadline["stated_timezone"]
    resolved = deadline["resolved_timezone"]
    if stated is not None and not canonical_zone(stated):
        _push(errors, "invalid_constraint", "deadline.stated_timezone")
    if not isinstance(resolved, str) or not canonical_zone(resolved):
        _push(errors, "invalid_constraint", "deadline.resolved_timezone")
    elif stated is None and resolved != WAT:
        _push(errors, "invalid_constraint", "deadline.resolved_timezone")
    elif isinstance(stated, str) and canonical_zone(stated) and resolved != stated:
        _push(errors, "invalid_constraint", "deadline.resolved_timezone")
    display = deadline["display_date"]
    local = deadline["local_time"]
    boundary = deadline["boundary"]
    fixed = deadline["fixed_at"]
    raw = deadline["raw_text"]
    if not isinstance(raw, str) or not (1 <= len(raw) <= 300) or raw in STAND_INS:
        _push(errors, "invalid_constraint", "deadline.raw_text")
    if not _valid_date(display) or display in STAND_INS:
        _push(errors, "invalid_constraint", "deadline.display_date")
    if not _valid_hms(local) or local in STAND_INS:
        _push(errors, "invalid_constraint", "deadline.local_time")
    if form == "date_only":
        if local != "23:59:59":
            _push(errors, "invalid_constraint", "deadline.local_time")
        if boundary != "inclusive_end_of_local_day":
            _push(errors, "invalid_constraint", "deadline.boundary")
    elif form == "instant":
        if boundary != "instant":
            _push(errors, "invalid_constraint", "deadline.boundary")
    elif boundary not in {"inclusive_end_of_local_day", "instant"}:
        _push(errors, "invalid_constraint", "deadline.boundary")
    if parse_utc(fixed) is None or (isinstance(fixed, str) and fixed in STAND_INS):
        _push(errors, "invalid_constraint", "deadline.fixed_at")
    if (
        isinstance(resolved, str)
        and canonical_zone(resolved)
        and _valid_date(display)
        and _valid_hms(local)
    ):
        try:
            measured = measured_fixed_at(display, local, resolved)
        except ValueError as exc:
            if str(exc) == "gap":
                _push(errors, "invalid_constraint", "deadline.local_time")
            else:
                _push(errors, "invalid_constraint", "deadline.resolved_timezone")
        else:
            if fixed != measured:
                _push(errors, "invalid_constraint", "deadline.fixed_at")


def _lifecycle_ok(pub, status, reason, deadline_kind):
    if pub == "draft" and status == "open" and reason is None:
        return True
    if pub == "published" and status == "open" and reason is None:
        return True
    if (
        pub == "published"
        and status == "expired"
        and reason == "deadline_passed"
        and deadline_kind == "fixed"
    ):
        return True
    if pub == "published" and status == "closed" and reason in PUBLISHED_CLOSED_REASONS:
        return True
    if pub == "withdrawn" and status == "closed" and reason in WITHDRAWN_REASONS:
        return True
    return False


def _check_lifecycle_timestamps(listing, errors):
    life = listing["lifecycle"]
    pub = life["publication_status"]
    status = life["status"]
    reason = life["closed_reason"]
    _enum(errors, pub, PUBLICATION, "lifecycle.publication_status")
    _enum(errors, status, LIFE_STATUS, "lifecycle.status")
    if reason is not None:
        _enum(errors, reason, CLOSED_REASONS, "lifecycle.closed_reason")
    if not _lifecycle_ok(pub, status, reason, listing["deadline"]["kind"]):
        _push(errors, "invalid_constraint", "lifecycle.status")

    timestamps = listing["timestamps"]
    created = _require_ts(errors, timestamps["created_at"], "timestamps.created_at")
    updated = _require_ts(errors, timestamps["updated_at"], "timestamps.updated_at")
    if created is not None and updated is not None and updated < created:
        _push(errors, "invalid_constraint", "timestamps.updated_at")
    retrieved = _require_ts(errors, listing["source"]["retrieved_at"], "source.retrieved_at")
    if retrieved is not None and updated is not None and retrieved > updated:
        _push(errors, "invalid_constraint", "source.retrieved_at")

    if pub == "draft":
        if timestamps["published_at"] is not None:
            _push(errors, "invalid_constraint", "timestamps.published_at")
    elif timestamps["published_at"] is None:
        _push(errors, "invalid_constraint", "timestamps.published_at")
    if (timestamps["expired_at"] is None) == (status == "expired"):
        _push(errors, "invalid_constraint", "timestamps.expired_at")
    closed_required = status == "closed" and pub == "published"
    if (timestamps["closed_at"] is not None) != closed_required:
        _push(errors, "invalid_constraint", "timestamps.closed_at")
    if pub == "withdrawn":
        if timestamps["withdrawn_at"] is None or timestamps["withdrawn_at"] != timestamps["updated_at"]:
            _push(errors, "invalid_constraint", "timestamps.withdrawn_at")
    elif timestamps["withdrawn_at"] is not None:
        _push(errors, "invalid_constraint", "timestamps.withdrawn_at")

    for name in ("published_at", "expired_at", "closed_at"):
        if timestamps[name] is None:
            continue
        parsed = _require_ts(errors, timestamps[name], f"timestamps.{name}")
        if (
            parsed is not None
            and created is not None
            and updated is not None
            and (parsed < created or parsed > updated)
        ):
            _push(errors, "invalid_constraint", f"timestamps.{name}")
    if status == "expired" and listing["deadline"]["kind"] == "fixed":
        expired_at = parse_utc(timestamps["expired_at"]) if timestamps["expired_at"] else None
        fixed_at = parse_utc(listing["deadline"]["fixed_at"])
        if expired_at is not None and fixed_at is not None and expired_at <= fixed_at:
            _push(errors, "invalid_constraint", "timestamps.expired_at")


def _official_targets(listing):
    targets = []
    provider_url = listing["provider"]["url"]
    if isinstance(provider_url, str):
        targets.append(provider_url)
    application = listing["application"]
    if application["url_kind"] in OFFICIAL_APPLICATION_KINDS and isinstance(application["url"], str):
        targets.append(application["url"])
    return targets


def _check_verification(listing, errors):
    verification = listing["verification"]
    state = verification["state"]
    outcome = verification["outcome"]
    method = verification["method"]
    reviewed = verification["reviewed_by"]
    reviewer = verification["reviewer_id"]
    checked = verification["source_checked_url"]
    evidence = verification["evidence"]
    attempt_at = verification["last_attempt_at"]
    attempt_outcome = verification["last_attempt_outcome"]
    success_at = verification["last_success_at"]
    fresh = verification["fresh_until"]

    _enum(errors, state, VERIFY_STATE, "verification.state")
    if outcome is not None:
        _enum(errors, outcome, OUTCOMES, "verification.outcome")
    if method is not None:
        _enum(errors, method, METHODS, "verification.method")
    if reviewed is not None:
        _enum(errors, reviewed, REVIEWED_BY, "verification.reviewed_by")
    if attempt_outcome is not None:
        _enum(errors, attempt_outcome, ATTEMPT_OUTCOMES, "verification.last_attempt_outcome")

    if (method is None) != (reviewed is None):
        _push(errors, "invalid_constraint", "verification.method")
    if reviewed == "automation" and (method != "automated_review" or reviewer is not None):
        _push(errors, "invalid_constraint", "verification.reviewed_by")
    if reviewed == "human" and (
        method != "human_review"
        or not isinstance(reviewer, str)
        or SLUG_RE.fullmatch(reviewer) is None
        or not (1 <= len(reviewer) <= 64)
    ):
        _push(errors, "invalid_constraint", "verification.reviewer_id")
    if reviewed is None and reviewer is not None:
        _push(errors, "invalid_constraint", "verification.reviewer_id")
    if reviewed != "human" and reviewer is not None and reviewed is not None:
        _push(errors, "invalid_constraint", "verification.reviewer_id")

    attempt_flags = (
        method is not None,
        checked is not None,
        evidence is not None,
        attempt_at is not None,
        attempt_outcome is not None,
    )
    if any(attempt_flags) and not all(attempt_flags):
        _push(errors, "invalid_constraint", "verification.method")
    # A success is itself an attempt. reviewer_id stays null for automation.
    if success_at is not None or outcome is not None:
        for field, value in (
            ("verification.method", method),
            ("verification.reviewed_by", reviewed),
            ("verification.source_checked_url", checked),
            ("verification.evidence", evidence),
            ("verification.last_attempt_at", attempt_at),
            ("verification.last_attempt_outcome", attempt_outcome),
        ):
            if value is None:
                _push(errors, "invalid_constraint", field)
    if isinstance(checked, str) and accept_url(checked) is not None:
        _push(errors, "non_canonical_url", "verification.source_checked_url")
    if isinstance(evidence, str) and (
        not (1 <= len(evidence) <= 2000) or _evidence_is_http_status_alone(evidence)
    ):
        _push(errors, "invalid_constraint", "verification.evidence")

    parsed_attempt = parse_utc(attempt_at) if attempt_at is not None else None
    if attempt_at is not None and parsed_attempt is None:
        _push(errors, "invalid_constraint", "verification.last_attempt_at")
    parsed_success = parse_utc(success_at) if success_at is not None else None
    if success_at is not None and parsed_success is None:
        _push(errors, "invalid_constraint", "verification.last_success_at")
    parsed_fresh = parse_utc(fresh) if fresh is not None else None
    if fresh is not None and parsed_fresh is None:
        _push(errors, "invalid_constraint", "verification.fresh_until")
    if (success_at is None) != (fresh is None):
        _push(errors, "invalid_constraint", "verification.fresh_until")
    if (
        parsed_success is not None
        and parsed_fresh is not None
        and parsed_fresh != parsed_success + timedelta(hours=168)
    ):
        _push(errors, "invalid_constraint", "verification.fresh_until")

    created = parse_utc(listing["timestamps"]["created_at"])
    updated = parse_utc(listing["timestamps"]["updated_at"])
    if parsed_success is not None and created is not None and updated is not None:
        if parsed_success < created or parsed_success > updated:
            _push(errors, "invalid_constraint", "verification.last_success_at")

    if state == "unverified" and (outcome is not None or success_at is not None):
        _push(errors, "invalid_constraint", "verification.state")
    if state == "verified" and (outcome is None or success_at is None):
        _push(errors, "invalid_constraint", "verification.state")

    if attempt_outcome in OUTCOMES:
        if (
            parsed_success is None
            or parsed_attempt is None
            or parsed_success != parsed_attempt
            or outcome != attempt_outcome
        ):
            _push(errors, "invalid_constraint", "verification.last_attempt_outcome")
    elif attempt_outcome in {"failed", "inconclusive"}:
        if (
            parsed_success is not None
            and parsed_attempt is not None
            and parsed_success >= parsed_attempt
        ):
            _push(errors, "invalid_constraint", "verification.last_success_at")

    life = listing["lifecycle"]
    if outcome == "confirmed_open":
        if life["publication_status"] != "published" or life["status"] != "open":
            _push(errors, "invalid_constraint", "verification.outcome")
        if isinstance(checked, str) and accept_url(checked) is None and checked not in _official_targets(listing):
            _push(errors, "invalid_constraint", "verification.source_checked_url")
    elif outcome == "confirmed_expired" and life["status"] != "expired":
        _push(errors, "invalid_constraint", "verification.outcome")
    elif outcome == "confirmed_withdrawn" and life["publication_status"] != "withdrawn":
        _push(errors, "invalid_constraint", "verification.outcome")
    elif outcome == "confirmed_closed" and life["status"] != "closed":
        _push(errors, "invalid_constraint", "verification.outcome")


def _check_identity_hashes(listing, errors):
    identity = listing["identity"]
    _slug(errors, identity["provider_key"], "identity.provider_key", 80)
    _slug(errors, identity["opportunity_key"], "identity.opportunity_key", 80)
    _slug(errors, identity["round_key"], "identity.round_key", 40)
    _length(errors, identity["round_evidence"], "identity.round_evidence", 1, 300)
    parts = [
        listing["kind"],
        identity["provider_key"],
        identity["opportunity_key"],
        identity["round_key"],
    ]
    if all(isinstance(part, str) for part in parts):
        digest = sha256_hex("\n".join(parts).encode("utf-8"))
        if listing["dedupe_key"] != digest:
            _push(errors, "dedupe_mismatch", "dedupe_key")
    if listing["content_hash"] != content_hash(listing):
        _push(errors, "hash_mismatch", "content_hash")


def _stage2(listing):
    errors = []
    _check_strings(listing, errors)
    _check_schema_identity(listing, errors)
    _check_provider_source_application(listing, errors)
    _check_eligibility(listing, errors)
    _check_award(listing, errors)
    _check_location_employment(listing, errors)
    _check_documents(listing, errors)
    _check_deadline(listing, errors)
    _check_lifecycle_timestamps(listing, errors)
    _check_verification(listing, errors)
    _check_identity_hashes(listing, errors)
    return _sort(errors)


def _stage3(listing, evaluation_time, mode):
    parsed = parse_utc(evaluation_time)
    if not isinstance(evaluation_time, str) or parsed is None:
        return [_error("invalid_constraint", "$evaluation_time")]
    errors = []
    updated = parse_utc(listing["timestamps"]["updated_at"])
    if updated is not None and updated > parsed + timedelta(hours=24):
        _push(
            errors,
            "timestamp_in_future",
            "timestamps.updated_at",
            evaluation_time=evaluation_time,
        )
    life = listing["lifecycle"]
    published_open = life["publication_status"] == "published" and life["status"] == "open"
    deadline = listing["deadline"]
    fixed_at = parse_utc(deadline["fixed_at"]) if deadline["kind"] == "fixed" else None
    past_deadline = fixed_at is not None and parsed > fixed_at
    if mode == "active":
        if not published_open:
            _push(
                errors,
                "not_on_active_feed",
                "lifecycle.status",
                evaluation_time=evaluation_time,
            )
        else:
            if past_deadline:
                _push(
                    errors,
                    "expired_deadline",
                    "deadline.fixed_at",
                    evaluation_time=evaluation_time,
                )
            verification = listing["verification"]
            verified_open = (
                verification["state"] == "verified" and verification["outcome"] == "confirmed_open"
            )
            if not verified_open:
                _push(
                    errors,
                    "not_verified",
                    "verification.state",
                    evaluation_time=evaluation_time,
                )
            else:
                fresh = parse_utc(verification["fresh_until"])
                if fresh is not None and parsed > fresh:
                    _push(
                        errors,
                        "stale_listing",
                        "verification.fresh_until",
                        evaluation_time=evaluation_time,
                    )
    else:
        if published_open and past_deadline:
            _push(
                errors,
                "expired_deadline",
                "deadline.fixed_at",
                evaluation_time=evaluation_time,
            )
        if (
            life["status"] == "expired"
            and fixed_at is not None
            and parsed <= fixed_at
        ):
            _push(
                errors,
                "status_deadline_mismatch",
                "lifecycle.status",
                evaluation_time=evaluation_time,
            )
    return _sort(errors)


def validate_record(listing):
    """Stage 1 then stage 2. No evaluation time and no hash check after a stage-1 error."""
    parsed, failed = _load(listing)
    if failed:
        return failed
    stage1 = _stage1(parsed)
    if stage1:
        return stage1
    return _stage2(parsed)


def validate_active_feed(listing, evaluation_time):
    """Stages 1 and 2, then the active-feed rules in section 14."""
    record_errors = validate_record(listing)
    if record_errors:
        return record_errors
    parsed, _failed = _load(listing)
    return _stage3(parsed, evaluation_time, "active")


def validate_historical(listing, evaluation_time):
    """Stages 1 and 2, then the historical rules in section 14. Staleness is not a failure."""
    record_errors = validate_record(listing)
    if record_errors:
        return record_errors
    parsed, _failed = _load(listing)
    return _stage3(parsed, evaluation_time, "historical")
