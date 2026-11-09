"""Section-to-test matrix for the ogverse.listings 1.0.0 producer validator.

The contract is the vendored byte copy of GoodnessOni/pathsync-ai
docs/data-contract.md at b50440dc738d86ff3070386d8709b8faf2bc5982.
Tests do not fetch that pin. Evaluation time is an argument.

| Contract section | Test |
| --- | --- |
| 6 schema identity | test_schema_version_listing_id_and_revision_bounds |
| 7 clocks and evaluation time | test_evaluation_time_and_timestamp_future_boundary |
| 8 shape, types, duplicate keys | test_stage1_shape_stops_before_hashes |
| 9 field tables | test_valid_modes_and_negative_samples |
| 9.5 eligibility metadata | test_eligibility_metadata_is_not_matching |
| 9.6 award and 9.8 employment | test_award_employment_and_lifecycle_pairs |
| 9.9 timestamps | test_evaluation_time_and_timestamp_future_boundary |
| 10 deadlines and time zones | test_timezone_oracles_fold_gap_and_deadline_equality |
| 11 student match | test_eligibility_metadata_is_not_matching |
| 12.1 URL acceptance | test_url_acceptance_oracles_do_not_rewrite |
| 12.2 normalisation | test_normalise_url_is_not_part_of_validation |
| 13 verification and freshness | test_freshness_failed_attempt_human_and_never_verified, test_confirmed_open_requires_the_attempt_bundle, test_http_status_line_is_not_evidence |
| 14 active and historical modes | test_valid_modes_and_negative_samples, test_historical_mismatch_and_short_circuit |
| 15 identity and tombstone | test_identity_url_is_not_dedupe, test_award_employment_and_lifecycle_pairs, test_unknown_education_tombstone_uses_withdrawn_wording |
| 16 digests | test_measured_digests_nfc_null_order_and_mismatch |
| 17 personal data | test_personal_data_placeholder_and_string_hygiene |
| 18 stages and card samples | test_valid_modes_and_negative_samples, test_stage1_shape_stops_before_hashes |
| 19 sync | not this card |
| 20 pin | test_pin_manifest_and_offline_reference_script |
"""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from listings.validator import (  # noqa: E402
    CONTRACT_EVALUATION_TIME,
    accept_url,
    content_hash,
    dedupe_key,
    jcs_bytes,
    measured_fixed_at,
    sha256_hex,
    validate_active_feed,
    validate_historical,
    validate_record,
)

EVAL = CONTRACT_EVALUATION_TIME
PIN = "b50440dc738d86ff3070386d8709b8faf2bc5982"
REFERENCE = REPO / "listings" / "reference" / "pathsync-ai"
FIXTURES = REFERENCE / "docs" / "listings" / "fixtures"
NEGATIVE = REPO / "listings" / "tests" / "fixtures"
LOCK = REPO / "listings" / "contract.lock.json"
VALID = (
    "valid-scholarship",
    "valid-internship",
    "valid-job",
    "valid-historical-expired",
    "valid-tombstone",
)
DIGESTS = {
    "valid-scholarship": (
        "f18f8da3972c4d1932d54f31f674ec259d4b939fb38b184876341d978895e96f",
        "64b7f2a8104bb0600312e75af20769ea4d78e47250f8c19396e9fce585680653",
    ),
    "valid-internship": (
        "695c935abed9b17a0774037c5c74101395f73462836a7116d69040237f73a58c",
        "3fbfadf0f3208ac0591f3c91b4e9103705d9e4e25041870a8f139432ea8065a1",
    ),
    "valid-job": (
        "2803f370604f5557da4817c2197a5035d9ee966a99f5bfbfb7ef6e52bee73c41",
        "7b0feda2e51ec39b8a18ff91b0e9f2081114b9896bead2309c02dbdf0748b537",
    ),
    "valid-historical-expired": (
        "65941874416207509e0b39022e94b84e6ac4b780cf92d6c45d356db44934eda4",
        "1a9c667969f8fc7a83776750d01cab23243c7dc8994435a9e6174285bc225044",
    ),
    "valid-tombstone": (
        "7eb7658492e0e678f476dcc16e5830feb49afc1e13ee480b6d218f07f2d4d6a3",
        "6a664c2050a125fbee1e56590467fd3d48d48c9963ed3f121c60a35ca57ab9ab",
    ),
}
BLOBS = {
    "docs/data-contract.md": "cdd2f52b39e2cb9b92d1139c51b0d9bcf7a2ad83",
    "docs/listings/compute_listing_hashes.py": "40f852838b09d2c21a5b65b7614c113f7fb8d4a4",
    "docs/listings/hash-output.txt": "c11a359c383f5a5ef91614a7adadb16d94a3f294",
    "docs/listings/fixtures/valid-historical-expired.json": "6bcd1d8ab82cab8f2e9f36e713547abae0cc4125",
    "docs/listings/fixtures/valid-internship.json": "a8082a8e5038c15337213e23fbc3dc096acecade",
    "docs/listings/fixtures/valid-job.json": "fc0d479ae006b12fe21a4f831c778ec6abe2e420",
    "docs/listings/fixtures/valid-scholarship.json": "3d3fdb1ffe284fbfed6e73c702a711130aeddf97",
    "docs/listings/fixtures/valid-tombstone.json": "af9a79d06397b8c1a95f2731bc8f11627662fea6",
}
URL_ACCEPT = (
    "https://apply.rivertrust.example/2027",
    "https://rivertrust.example",
    "https://apply.rivertrust.example/Path?a=1&b=2",
)
URL_REJECT = (
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
)

SECTION_TO_TESTS = {
    "6": ["test_schema_version_listing_id_and_revision_bounds"],
    "7": ["test_evaluation_time_and_timestamp_future_boundary"],
    "8": ["test_stage1_shape_stops_before_hashes"],
    "9": ["test_valid_modes_and_negative_samples"],
    "9.5": ["test_eligibility_metadata_is_not_matching"],
    "9.6": ["test_award_employment_and_lifecycle_pairs"],
    "9.8": ["test_award_employment_and_lifecycle_pairs"],
    "9.9": ["test_evaluation_time_and_timestamp_future_boundary"],
    "10": ["test_timezone_oracles_fold_gap_and_deadline_equality"],
    "11": ["test_eligibility_metadata_is_not_matching"],
    "12.1": ["test_url_acceptance_oracles_do_not_rewrite"],
    "12.2": ["test_normalise_url_is_not_part_of_validation"],
    "13": [
        "test_freshness_failed_attempt_human_and_never_verified",
        "test_confirmed_open_requires_the_attempt_bundle",
        "test_http_status_line_is_not_evidence",
    ],
    "14": [
        "test_valid_modes_and_negative_samples",
        "test_historical_mismatch_and_short_circuit",
    ],
    "15": [
        "test_identity_url_is_not_dedupe",
        "test_award_employment_and_lifecycle_pairs",
        "test_unknown_education_tombstone_uses_withdrawn_wording",
    ],
    "16": ["test_measured_digests_nfc_null_order_and_mismatch"],
    "17": ["test_personal_data_placeholder_and_string_hygiene"],
    "18": [
        "test_valid_modes_and_negative_samples",
        "test_stage1_shape_stops_before_hashes",
        "test_repeatable_immutable_and_offline",
    ],
    "20": ["test_pin_manifest_and_offline_reference_script"],
}


def load_name(name):
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def rehash(listing):
    listing["dedupe_key"] = dedupe_key(listing)
    listing["content_hash"] = content_hash(listing)
    return listing


def codes(errors):
    return [(item["code"], item["field"]) for item in errors]


def stage3(code, field, evaluation_time=EVAL):
    return {
        "code": code,
        "field": field,
        "message": f"{code}: {field}",
        "evaluation_time": evaluation_time,
    }


def reference_module():
    path = REFERENCE / "docs" / "listings" / "compute_listing_hashes.py"
    spec = importlib.util.spec_from_file_location("pinned_listing_hashes", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def contract_samples():
    text = (REFERENCE / "docs" / "data-contract.md").read_text(encoding="utf-8")
    found = {}
    for name, body in re.findall(r"<!-- sample:([a-z0-9-]+) -->\n```json\n(.*?)\n```", text, re.S):
        found[name] = json.loads(body)
    return found


class ListingsValidatorTest(unittest.TestCase):
    def test_section_matrix_names_exist(self):
        for names in SECTION_TO_TESTS.values():
            for name in names:
                self.assertTrue(hasattr(self, name), name)

    def test_pin_manifest_and_offline_reference_script(self):
        lock = json.loads(LOCK.read_text(encoding="utf-8"))
        self.assertEqual(
            lock,
            {
                "consumer_repository": "GoodnessOni/pathsync-ai",
                "contract_path": "docs/data-contract.md",
                "git_sha": PIN,
                "schema_version": "1.0.0",
            },
        )
        manifest = json.loads((REFERENCE / "MANIFEST.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["git_sha"], PIN)
        self.assertEqual(manifest["consumer_repository"], "GoodnessOni/pathsync-ai")
        self.assertEqual(manifest["contract_path"], "docs/data-contract.md")
        self.assertEqual(manifest["schema_version"], "1.0.0")
        listed = {item["upstream_path"]: item for item in manifest["files"]}
        self.assertEqual(set(listed), set(BLOBS))
        for rel, blob in BLOBS.items():
            path = REFERENCE / rel
            self.assertEqual(listed[rel]["git_blob_sha"], blob)
            hashed = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()
            self.assertEqual(hashed, blob)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(digest, listed[rel]["sha256"])
        samples = contract_samples()
        for name in VALID:
            self.assertEqual(samples[name], load_name(name))
        for name in ("invalid-missing-title", "invalid-revision-type", "invalid-expired-open"):
            extracted = json.loads((NEGATIVE / f"{name}.json").read_text(encoding="utf-8"))
            self.assertEqual(extracted, samples[name])
        with tempfile.TemporaryDirectory() as tmp:
            shutil.copytree(REFERENCE / "docs", Path(tmp) / "docs")
            proc = subprocess.run(
                ["python3", "docs/listings/compute_listing_hashes.py"],
                cwd=tmp,
                check=False,
                capture_output=True,
                text=True,
            )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        vendored = (REFERENCE / "docs" / "listings" / "hash-output.txt").read_text(encoding="utf-8")
        self.assertEqual(proc.stdout, vendored)
        self.assertIn("python: 3.12.3\n", vendored)
        self.assertIn("tzdata: version 2026e\n", vendored)
        self.assertTrue(vendored.endswith("result: ok\n"))

    def test_measured_digests_nfc_null_order_and_mismatch(self):
        lines = []
        for name in VALID:
            listing = load_name(name)
            dedupe, digest = DIGESTS[name]
            self.assertEqual(dedupe_key(listing), dedupe)
            self.assertEqual(content_hash(listing), digest)
            self.assertEqual(listing["dedupe_key"], dedupe)
            self.assertEqual(listing["content_hash"], digest)
            lines.append(f"{name} dedupe_key={dedupe} content_hash={digest}")
        print("MEASURED_DIGESTS")
        print("\n".join(lines))
        self.assertEqual(
            sha256_hex(jcs_bytes({"a": None})),
            "d091f9c83c091f79652fe8786375b3fe4ce0861a56f5bfbafedbe431877ff0e8",
        )
        self.assertEqual(
            sha256_hex(jcs_bytes({})),
            "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
        )
        self.assertNotEqual(sha256_hex(jcs_bytes({"a": None})), sha256_hex(jcs_bytes({})))
        composed = "\u00e9"
        decomposed = "e\u0301"
        composed_hash = sha256_hex(jcs_bytes({"s": composed}))
        self.assertEqual(
            composed_hash,
            "86028b41ba792eaf82aa26a45b218f6734f7f1096a86f1746c8296e088a0ccb4",
        )
        self.assertNotEqual(sha256_hex(jcs_bytes({"s": decomposed})), composed_hash)
        ordered = sha256_hex(jcs_bytes({"countries": ["GH", "NG"]}))
        reversed_order = sha256_hex(jcs_bytes({"countries": ["NG", "GH"]}))
        self.assertNotEqual(ordered, reversed_order)
        same_round = sha256_hex("scholarship\nriver-trust\nbridge-award\n2026".encode("utf-8"))
        next_round = sha256_hex("scholarship\nriver-trust\nbridge-award\n2027".encode("utf-8"))
        self.assertEqual(
            same_round,
            "65941874416207509e0b39022e94b84e6ac4b780cf92d6c45d356db44934eda4",
        )
        self.assertEqual(
            next_round,
            "9c2f233946856cda8a68c3429c69b3d5d89a532240fc438f6923b89c104e5682",
        )

        absent = load_name("valid-scholarship")
        del absent["previous_round_id"]
        self.assertEqual(
            codes(validate_record(absent)),
            [("missing_required_field", "previous_round_id")],
        )
        unsorted = load_name("valid-scholarship")
        unsorted["eligibility"]["citizenship"]["countries"] = ["NG", "GH"]
        self.assertEqual(
            codes(validate_record(unsorted)),
            [
                ("hash_mismatch", "content_hash"),
                ("invalid_constraint", "eligibility.citizenship.countries"),
            ],
        )
        rehash(unsorted)
        self.assertEqual(
            codes(validate_record(unsorted)),
            [("invalid_constraint", "eligibility.citizenship.countries")],
        )
        duplicate_countries = load_name("valid-scholarship")
        duplicate_countries["eligibility"]["citizenship"]["countries"] = ["NG", "NG"]
        rehash(duplicate_countries)
        self.assertEqual(
            codes(validate_record(duplicate_countries)),
            [("invalid_constraint", "eligibility.citizenship.countries")],
        )
        nfc_title = load_name("valid-scholarship")
        nfc_title["title"] = nfc_title["title"] + " " + decomposed
        rehash(nfc_title)
        self.assertEqual(codes(validate_record(nfc_title)), [("invalid_constraint", "title")])
        changed = load_name("valid-scholarship")
        changed["summary"] = "Synthetic award with one changed sentence."
        self.assertEqual(codes(validate_record(changed)), [("hash_mismatch", "content_hash")])
        dedupe_only = load_name("valid-scholarship")
        dedupe_only["dedupe_key"] = "0" * 64
        dedupe_only["content_hash"] = content_hash(dedupe_only)
        self.assertEqual(codes(validate_record(dedupe_only)), [("dedupe_mismatch", "dedupe_key")])

    def test_valid_modes_and_negative_samples(self):
        for name in ("valid-scholarship", "valid-internship", "valid-job"):
            listing = load_name(name)
            self.assertEqual(validate_record(listing), [])
            self.assertEqual(validate_active_feed(listing, EVAL), [])
            self.assertEqual(validate_historical(listing, EVAL), [])
            self.assertEqual(validate_record(json.dumps(listing)), [])
        for name in ("valid-historical-expired", "valid-tombstone"):
            listing = load_name(name)
            self.assertEqual(validate_record(listing), [])
            self.assertEqual(validate_historical(listing, EVAL), [])
            self.assertEqual(
                validate_active_feed(listing, EVAL),
                [stage3("not_on_active_feed", "lifecycle.status")],
            )
        missing = json.loads((NEGATIVE / "invalid-missing-title.json").read_text(encoding="utf-8"))
        self.assertEqual(
            validate_record(missing),
            [
                {
                    "code": "missing_required_field",
                    "field": "title",
                    "message": "missing_required_field: title",
                }
            ],
        )
        revision = json.loads((NEGATIVE / "invalid-revision-type.json").read_text(encoding="utf-8"))
        self.assertEqual(
            validate_record(revision),
            [
                {
                    "code": "invalid_type",
                    "field": "revision",
                    "message": "invalid_type: revision",
                    "expected": "integer",
                    "actual": "string",
                }
            ],
        )
        expired = json.loads((NEGATIVE / "invalid-expired-open.json").read_text(encoding="utf-8"))
        self.assertEqual(validate_record(expired), [])
        expected = [stage3("expired_deadline", "deadline.fixed_at")]
        self.assertEqual(validate_active_feed(expired, EVAL), expected)
        self.assertEqual(validate_historical(expired, EVAL), expected)
        self.assertNotIn("hash_mismatch", {item["code"] for item in validate_record(missing)})
        self.assertNotIn("hash_mismatch", {item["code"] for item in validate_record(revision)})
        self.assertNotIn("dedupe_mismatch", {item["code"] for item in validate_record(missing)})

    def test_stage1_shape_stops_before_hashes(self):
        listing = load_name("valid-scholarship")
        del listing["title"]
        listing["extra"] = {"nested": True}
        listing["zzz_extra"] = 1
        listing["content_hash"] = "0" * 64
        errors = validate_record(listing)
        self.assertEqual(
            codes(errors),
            [
                ("unknown_field", "extra"),
                ("missing_required_field", "title"),
                ("unknown_field", "zzz_extra"),
            ],
        )
        self.assertEqual(errors, sorted(errors, key=lambda item: (item["field"].encode("utf-8"), item["code"].encode("utf-8"))))
        parent = load_name("valid-scholarship")
        parent["provider"] = "River Trust"
        self.assertEqual(
            validate_record(parent),
            [
                {
                    "code": "invalid_type",
                    "field": "provider",
                    "message": "invalid_type: provider",
                    "expected": "object",
                    "actual": "string",
                }
            ],
        )
        null_title = load_name("valid-scholarship")
        null_title["title"] = None
        self.assertEqual(
            codes(validate_record(null_title)),
            [("invalid_type", "title")],
        )
        self.assertEqual(validate_record(null_title)[0]["actual"], "null")
        boolean_revision = load_name("valid-scholarship")
        boolean_revision["revision"] = True
        revision_error = validate_record(boolean_revision)[0]
        self.assertEqual(revision_error["expected"], "integer")
        self.assertEqual(revision_error["actual"], "boolean")
        fractional = json.dumps(load_name("valid-scholarship")).replace('"revision": 1', '"revision": 1.0', 1)
        fractional_error = validate_record(fractional)[0]
        self.assertEqual(fractional_error["field"], "revision")
        self.assertEqual(fractional_error["actual"], "number")
        documents = load_name("valid-scholarship")
        documents["documents_required"] = ["CGPA transcript"] * 11
        documents["documents_required"][2] = 2
        documents["documents_required"][10] = 10
        indexed = validate_record(documents)
        self.assertEqual(
            [item["field"] for item in indexed],
            ["documents_required[10]", "documents_required[2]"],
        )
        raw = (FIXTURES / "valid-scholarship.json").read_text(encoding="utf-8")
        duplicate = raw.replace('"synthetic": true,', '"synthetic": true, "synthetic": false,', 1)
        self.assertEqual(validate_record(duplicate), [{"code": "invalid_json", "field": "$", "message": "invalid_json: $"}])
        self.assertEqual(
            validate_record("{"),
            [{"code": "invalid_json", "field": "$", "message": "invalid_json: $"}],
        )
        self.assertEqual(validate_record([])[0]["actual"], "array")
        self.assertEqual(validate_record(None)[0]["actual"], "null")
        nested = load_name("valid-scholarship")
        nested["provider"]["extra"] = 1
        self.assertEqual(codes(validate_record(nested)), [("unknown_field", "provider.extra")])

    def test_schema_version_listing_id_and_revision_bounds(self):
        wrong = load_name("valid-scholarship")
        wrong["schema_version"] = "2.0.0"
        rehash(wrong)
        self.assertEqual(codes(validate_record(wrong)), [("invalid_constraint", "schema_version")])
        minor = load_name("valid-scholarship")
        minor["schema_version"] = "1.0.1"
        rehash(minor)
        self.assertEqual(codes(validate_record(minor)), [("invalid_constraint", "schema_version")])
        bad_id = load_name("valid-scholarship")
        bad_id["listing_id"] = "lst_IIIIIIIIIIIIIIIIIIIIIIIIII"
        rehash(bad_id)
        self.assertEqual(codes(validate_record(bad_id)), [("invalid_constraint", "listing_id")])
        for value, ok in ((0, False), (1, True), (1000000, True), (1000001, False)):
            listing = load_name("valid-scholarship")
            listing["revision"] = value
            rehash(listing)
            self.assertEqual(validate_record(listing) == [], ok, value)
        production = load_name("valid-job")
        production["synthetic"] = False
        rehash(production)
        self.assertEqual(validate_record(production), [])
        self.assertEqual(validate_active_feed(production, EVAL), [])

    def test_url_acceptance_oracles_do_not_rewrite(self):
        reference = reference_module()
        for url in URL_ACCEPT:
            self.assertIsNone(accept_url(url))
            self.assertIsNone(reference.accept_url(url))
        for url, reason in URL_REJECT:
            self.assertEqual(accept_url(url), reason)
            self.assertEqual(reference.accept_url(url), reason)
        extras = (
            ("https://apply.rivertrust.example/2027?q=%2F", None),
            ("https://192.0.2.1/2027", "ip_literal"),
            ("https://apply.rivertrust.example/2027?a=1&a=2", "query_duplicate"),
            ("https://apply.rivertrust.example/2027?", None),
        )
        for url, reason in extras:
            self.assertEqual(accept_url(url), reason)
            self.assertEqual(reference.accept_url(url), reason)

        scholarship = load_name("valid-scholarship")
        provider_url = scholarship["provider"]["url"]
        for url in URL_ACCEPT:
            listing = load_name("valid-scholarship")
            listing["application"]["url"] = url
            listing["verification"]["source_checked_url"] = url
            before = copy.deepcopy(listing)
            rehash(listing)
            self.assertEqual(validate_record(listing), [], url)
            self.assertEqual(before["application"]["url"], url)
        for url, _reason in URL_REJECT:
            for field, prepare in (
                ("application.url", lambda item: item["application"].__setitem__("url", url)),
                ("source.url", lambda item: item["source"].__setitem__("url", url)),
                ("provider.url", lambda item: item["provider"].__setitem__("url", url)),
                (
                    "verification.source_checked_url",
                    lambda item: item["verification"].__setitem__("source_checked_url", url),
                ),
            ):
                listing = load_name("valid-scholarship")
                prepare(listing)
                if field == "application.url":
                    listing["verification"]["source_checked_url"] = provider_url
                rehash(listing)
                errors = validate_record(listing)
                self.assertEqual(codes(errors), [("non_canonical_url", field)], url)
                self.assertNotIn(_reason, {item["code"] for item in errors})
                stored = listing
                for part in field.split("."):
                    stored = stored[part]
                self.assertEqual(stored, url)
        cleared = load_name("valid-scholarship")
        cleared["provider"]["url"] = None
        rehash(cleared)
        self.assertEqual(validate_record(cleared), [])

    def test_normalise_url_is_not_part_of_validation(self):
        import listings.validator as validator

        self.assertFalse(hasattr(validator, "normalise_url"))
        reference = reference_module()
        dirty = "https://Apply.River.Example/Path/?utm_source=x&b=2&a=1"
        self.assertEqual(reference.accept_url(dirty), "host")
        cleaned = reference.normalise_url(dirty)
        self.assertEqual(cleaned, "https://apply.river.example/Path?a=1&b=2")
        self.assertIsNone(reference.accept_url(cleaned))
        listing = load_name("valid-scholarship")
        listing["application"]["url"] = dirty
        listing["verification"]["source_checked_url"] = listing["provider"]["url"]
        original = copy.deepcopy(listing)
        rehash(listing)
        self.assertEqual(
            codes(validate_record(listing)),
            [("non_canonical_url", "application.url")],
        )
        self.assertEqual(listing["application"]["url"], original["application"]["url"])
        stored = load_name("valid-scholarship")
        stored["application"]["url"] = cleaned
        stored["verification"]["source_checked_url"] = cleaned
        rehash(stored)
        self.assertEqual(validate_record(stored), [])

    def test_timezone_oracles_fold_gap_and_deadline_equality(self):
        self.assertEqual(measured_fixed_at("2027-03-31", "23:59:59", "Africa/Lagos"), "2027-03-31T22:59:59Z")
        self.assertEqual(measured_fixed_at("2026-10-31", "23:59:59", "Europe/London"), "2026-10-31T23:59:59Z")
        self.assertEqual(measured_fixed_at("2026-01-15", "23:59:59", "Africa/Lagos"), "2026-01-15T22:59:59Z")
        self.assertEqual(measured_fixed_at("2027-06-01", "15:00:00", "Europe/Paris"), "2027-06-01T13:00:00Z")
        self.assertEqual(load_name("valid-scholarship")["deadline"]["fixed_at"], "2027-03-31T22:59:59Z")
        self.assertEqual(load_name("valid-historical-expired")["deadline"]["fixed_at"], "2026-10-31T23:59:59Z")
        self.assertEqual(
            json.loads((NEGATIVE / "invalid-expired-open.json").read_text(encoding="utf-8"))["deadline"]["fixed_at"],
            "2026-01-15T22:59:59Z",
        )

        paris = load_name("valid-scholarship")
        paris["deadline"].update(
            {
                "form": "instant",
                "stated_timezone": "Europe/Paris",
                "resolved_timezone": "Europe/Paris",
                "display_date": "2027-06-01",
                "local_time": "15:00:00",
                "boundary": "instant",
                "fixed_at": "2027-06-01T13:00:00Z",
                "raw_text": "Closes 1 June 2027 at 15:00 Europe/Paris.",
            }
        )
        rehash(paris)
        self.assertEqual(validate_record(paris), [])
        self.assertEqual(paris["deadline"]["local_time"], "15:00:00")

        no_zone_clock = load_name("valid-scholarship")
        no_zone_clock["deadline"].update(
            {
                "form": "instant",
                "stated_timezone": None,
                "resolved_timezone": "Africa/Lagos",
                "display_date": "2027-06-01",
                "local_time": "15:00:00",
                "boundary": "instant",
                "fixed_at": "2027-06-01T14:00:00Z",
                "raw_text": "Closes 1 June 2027 at 15:00 with no zone named.",
            }
        )
        rehash(no_zone_clock)
        self.assertEqual(validate_record(no_zone_clock), [])
        self.assertEqual(no_zone_clock["deadline"]["local_time"], "15:00:00")

        forced = load_name("valid-scholarship")
        forced["deadline"]["local_time"] = "15:00:00"
        forced["deadline"]["fixed_at"] = measured_fixed_at("2027-03-31", "15:00:00", "Africa/Lagos")
        rehash(forced)
        self.assertEqual(codes(validate_record(forced)), [("invalid_constraint", "deadline.local_time")])

        mismatched_zone = load_name("valid-scholarship")
        mismatched_zone["deadline"]["stated_timezone"] = "Europe/London"
        rehash(mismatched_zone)
        self.assertIn(
            ("invalid_constraint", "deadline.resolved_timezone"),
            codes(validate_record(mismatched_zone)),
        )
        unknown_zone = load_name("valid-scholarship")
        unknown_zone["deadline"]["resolved_timezone"] = "WAT"
        rehash(unknown_zone)
        self.assertIn(("invalid_constraint", "deadline.resolved_timezone"), codes(validate_record(unknown_zone)))

        fold_instant = measured_fixed_at("2026-10-25", "02:30:00", "Europe/Paris")
        self.assertEqual(fold_instant, "2026-10-25T00:30:00Z")
        folded = load_name("valid-scholarship")
        folded["deadline"].update(
            {
                "form": "instant",
                "stated_timezone": "Europe/Paris",
                "resolved_timezone": "Europe/Paris",
                "display_date": "2026-10-25",
                "local_time": "02:30:00",
                "boundary": "instant",
                "fixed_at": fold_instant,
                "raw_text": "Closes 25 October 2026 at 02:30 Europe/Paris.",
            }
        )
        rehash(folded)
        self.assertEqual(validate_record(folded), [])
        folded["deadline"]["fixed_at"] = "2026-10-25T01:30:00Z"
        rehash(folded)
        self.assertEqual(codes(validate_record(folded)), [("invalid_constraint", "deadline.fixed_at")])

        gap = load_name("valid-scholarship")
        gap["deadline"].update(
            {
                "form": "instant",
                "stated_timezone": "Europe/Paris",
                "resolved_timezone": "Europe/Paris",
                "display_date": "2027-03-28",
                "local_time": "02:30:00",
                "boundary": "instant",
                "fixed_at": "2027-03-28T01:30:00Z",
                "raw_text": "Closes 28 March 2027 at 02:30 Europe/Paris.",
            }
        )
        rehash(gap)
        self.assertEqual(codes(validate_record(gap)), [("invalid_constraint", "deadline.local_time")])
        with self.assertRaises(ValueError):
            measured_fixed_at("2027-03-28", "02:30:00", "Europe/Paris")

        open_listing = load_name("valid-scholarship")
        success = datetime(2027, 3, 24, 22, 59, 59)
        fresh = success + timedelta(hours=168)
        fixed = datetime(2027, 3, 31, 22, 59, 59)
        self.assertEqual(fresh, fixed)
        stamp = success.strftime("%Y-%m-%dT%H:%M:%SZ")
        fresh_stamp = fresh.strftime("%Y-%m-%dT%H:%M:%SZ")
        open_listing["verification"]["last_success_at"] = stamp
        open_listing["verification"]["last_attempt_at"] = stamp
        open_listing["verification"]["fresh_until"] = fresh_stamp
        open_listing["timestamps"]["updated_at"] = stamp
        open_listing["source"]["retrieved_at"] = stamp
        rehash(open_listing)
        at_deadline = "2027-03-31T22:59:59Z"
        after_deadline = "2027-03-31T23:00:00Z"
        self.assertEqual(validate_active_feed(open_listing, at_deadline), [])
        self.assertEqual(validate_historical(open_listing, at_deadline), [])
        both = [
            stage3("expired_deadline", "deadline.fixed_at", after_deadline),
            stage3("stale_listing", "verification.fresh_until", after_deadline),
        ]
        self.assertEqual(validate_active_feed(open_listing, after_deadline), both)
        self.assertEqual(
            validate_historical(open_listing, after_deadline),
            [stage3("expired_deadline", "deadline.fixed_at", after_deadline)],
        )

        far = "2028-01-01T00:00:00Z"
        for name in ("valid-internship", "valid-job"):
            rolling_or_unknown = load_name(name)
            active_codes = codes(validate_active_feed(rolling_or_unknown, far))
            self.assertNotIn(("expired_deadline", "deadline.fixed_at"), active_codes)
            self.assertEqual(validate_historical(rolling_or_unknown, far), [])
        invented = load_name("valid-internship")
        invented["deadline"]["fixed_at"] = "2027-03-31T22:59:59Z"
        rehash(invented)
        self.assertIn(("invalid_constraint", "deadline.fixed_at"), codes(validate_record(invented)))
        unknown_text = load_name("valid-job")
        unknown_text["deadline"]["raw_text"] = "Not specified"
        rehash(unknown_text)
        self.assertIn(("invalid_constraint", "deadline.raw_text"), codes(validate_record(unknown_text)))

    def test_freshness_failed_attempt_human_and_never_verified(self):
        listing = load_name("valid-scholarship")
        self.assertEqual(validate_active_feed(listing, "2026-11-15T09:00:00Z"), [])
        self.assertEqual(validate_historical(listing, "2026-11-15T09:00:00Z"), [])
        self.assertEqual(
            validate_active_feed(listing, "2026-11-15T09:00:01Z"),
            [stage3("stale_listing", "verification.fresh_until", "2026-11-15T09:00:01Z")],
        )
        self.assertEqual(validate_historical(listing, "2026-11-15T09:00:01Z"), [])

        failed = load_name("valid-scholarship")
        failed["verification"]["last_attempt_at"] = "2026-11-08T11:00:00Z"
        failed["verification"]["last_attempt_outcome"] = "failed"
        failed["timestamps"]["updated_at"] = "2026-11-08T11:00:00Z"
        rehash(failed)
        self.assertEqual(validate_record(failed), [])
        self.assertEqual(validate_active_feed(failed, EVAL), [])
        self.assertEqual(failed["verification"]["fresh_until"], "2026-11-15T09:00:00Z")
        self.assertEqual(
            validate_active_feed(failed, "2026-11-15T09:00:01Z"),
            [stage3("stale_listing", "verification.fresh_until", "2026-11-15T09:00:01Z")],
        )
        renewed = load_name("valid-scholarship")
        renewed["verification"]["last_attempt_at"] = "2026-11-08T11:00:00Z"
        renewed["verification"]["last_attempt_outcome"] = "failed"
        renewed["verification"]["last_success_at"] = "2026-11-08T11:00:00Z"
        renewed["verification"]["fresh_until"] = "2026-11-15T11:00:00Z"
        renewed["timestamps"]["updated_at"] = "2026-11-08T11:00:00Z"
        rehash(renewed)
        self.assertIn(
            ("invalid_constraint", "verification.last_success_at"),
            codes(validate_record(renewed)),
        )

        human = load_name("valid-scholarship")
        human["verification"]["method"] = "human_review"
        human["verification"]["reviewed_by"] = "human"
        human["verification"]["reviewer_id"] = "editor-synthetic-01"
        human["verification"]["fresh_until"] = (
            datetime(2026, 11, 8, 9, 0, 0) + timedelta(days=90)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
        rehash(human)
        self.assertEqual(
            codes(validate_record(human)),
            [("invalid_constraint", "verification.fresh_until")],
        )
        human["verification"]["fresh_until"] = "2026-11-15T09:00:00Z"
        rehash(human)
        self.assertEqual(validate_record(human), [])
        self.assertEqual(validate_active_feed(human, EVAL), [])

        never = load_name("valid-scholarship")
        never["verification"] = {
            "state": "unverified",
            "outcome": None,
            "method": None,
            "reviewed_by": None,
            "reviewer_id": None,
            "source_checked_url": None,
            "evidence": None,
            "last_attempt_at": None,
            "last_attempt_outcome": None,
            "last_success_at": None,
            "fresh_until": None,
        }
        rehash(never)
        self.assertEqual(validate_record(never), [])
        self.assertEqual(
            validate_active_feed(never, EVAL),
            [stage3("not_verified", "verification.state")],
        )
        self.assertEqual(validate_historical(never, EVAL), [])
        self.assertEqual(
            validate_active_feed(never, "2027-03-31T23:00:00Z"),
            [
                stage3("expired_deadline", "deadline.fixed_at", "2027-03-31T23:00:00Z"),
                stage3("not_verified", "verification.state", "2027-03-31T23:00:00Z"),
            ],
        )

    def test_historical_mismatch_and_short_circuit(self):
        historical = load_name("valid-historical-expired")
        at_deadline = historical["deadline"]["fixed_at"]
        self.assertEqual(
            validate_historical(historical, at_deadline),
            [stage3("status_deadline_mismatch", "lifecycle.status", at_deadline)],
        )
        self.assertEqual(
            validate_active_feed(historical, at_deadline),
            [stage3("not_on_active_feed", "lifecycle.status", at_deadline)],
        )
        one_second = "2026-11-01T00:00:00Z"
        self.assertEqual(validate_historical(historical, one_second), [])
        self.assertEqual(
            validate_active_feed(historical, one_second),
            [stage3("not_on_active_feed", "lifecycle.status", one_second)],
        )
        tombstone = load_name("valid-tombstone")
        far = "2028-01-01T00:00:00Z"
        self.assertEqual(
            validate_active_feed(tombstone, far),
            [stage3("not_on_active_feed", "lifecycle.status", far)],
        )
        self.assertEqual(validate_historical(tombstone, far), [])
        future = load_name("valid-tombstone")
        future["timestamps"]["updated_at"] = "2026-11-09T12:00:01Z"
        future["timestamps"]["withdrawn_at"] = "2026-11-09T12:00:01Z"
        rehash(future)
        self.assertEqual(
            validate_active_feed(future, EVAL),
            [
                stage3("not_on_active_feed", "lifecycle.status"),
                stage3("timestamp_in_future", "timestamps.updated_at"),
            ],
        )

    def test_evaluation_time_and_timestamp_future_boundary(self):
        listing = load_name("valid-scholarship")
        self.assertEqual(
            validate_active_feed(listing, "2026-11-08"),
            [{"code": "invalid_constraint", "field": "$evaluation_time", "message": "invalid_constraint: $evaluation_time"}],
        )
        self.assertEqual(
            validate_historical(listing, "2026-02-31T00:00:00Z"),
            [{"code": "invalid_constraint", "field": "$evaluation_time", "message": "invalid_constraint: $evaluation_time"}],
        )
        missing = json.loads((NEGATIVE / "invalid-missing-title.json").read_text(encoding="utf-8"))
        self.assertEqual(codes(validate_active_feed(missing, "not-a-time")), [("missing_required_field", "title")])
        allowed = load_name("valid-scholarship")
        allowed["timestamps"]["updated_at"] = "2026-11-09T12:00:00Z"
        rehash(allowed)
        self.assertEqual(validate_active_feed(allowed, EVAL), [])
        self.assertEqual(validate_historical(allowed, EVAL), [])
        beyond = load_name("valid-scholarship")
        beyond["timestamps"]["updated_at"] = "2026-11-09T12:00:01Z"
        rehash(beyond)
        self.assertEqual(
            validate_active_feed(beyond, EVAL),
            [stage3("timestamp_in_future", "timestamps.updated_at")],
        )
        self.assertEqual(
            validate_historical(beyond, EVAL),
            [stage3("timestamp_in_future", "timestamps.updated_at")],
        )
        early = load_name("valid-scholarship")
        early["source"]["retrieved_at"] = "2026-11-08T09:00:01Z"
        rehash(early)
        self.assertEqual(codes(validate_record(early)), [("invalid_constraint", "source.retrieved_at")])

    def test_identity_url_is_not_dedupe(self):
        original = load_name("valid-scholarship")
        changed = load_name("valid-scholarship")
        changed["application"]["url"] = "https://apply.rivertrust.example/2027/form"
        changed["verification"]["source_checked_url"] = changed["application"]["url"]
        self.assertEqual(dedupe_key(original), dedupe_key(changed))
        self.assertNotEqual(content_hash(original), content_hash(changed))
        rehash(changed)
        self.assertEqual(changed["dedupe_key"], original["dedupe_key"])
        self.assertNotEqual(changed["content_hash"], original["content_hash"])
        self.assertEqual(validate_record(changed), [])
        self.assertEqual(validate_active_feed(changed, EVAL), [])

        nxt = load_name("valid-scholarship")
        nxt["listing_id"] = "lst_01ARZ3NDEKTSV4RRFFQ69G5FB4"
        nxt["identity"]["round_key"] = "2028"
        nxt["identity"]["round_evidence"] = "The source names the 2028 award."
        nxt["previous_round_id"] = original["listing_id"]
        rehash(nxt)
        self.assertNotEqual(nxt["dedupe_key"], original["dedupe_key"])
        self.assertEqual(nxt["application"]["url"], original["application"]["url"])
        self.assertEqual(validate_record(nxt), [])
        self.assertEqual(validate_record(original), [])
        self.assertNotIn("duplicate_listing", {item["code"] for item in validate_record(nxt)})
        self.assertNotIn("revision_conflict", {item["code"] for item in validate_record(changed)})

    def test_award_employment_and_lifecycle_pairs(self):
        closed = load_name("valid-scholarship")
        closed["lifecycle"] = {
            "publication_status": "published",
            "status": "closed",
            "closed_reason": "provider_closed",
        }
        closed["timestamps"]["closed_at"] = closed["timestamps"]["updated_at"]
        closed["verification"]["outcome"] = "confirmed_closed"
        closed["verification"]["last_attempt_outcome"] = "confirmed_closed"
        rehash(closed)
        self.assertEqual(validate_record(closed), [])
        self.assertEqual(validate_historical(closed, EVAL), [])
        self.assertEqual(
            validate_active_feed(closed, EVAL),
            [stage3("not_on_active_feed", "lifecycle.status")],
        )
        superseded = load_name("valid-tombstone")
        superseded["lifecycle"]["closed_reason"] = "superseded"
        rehash(superseded)
        self.assertEqual(validate_record(superseded), [])

        draft = load_name("valid-scholarship")
        draft["lifecycle"] = {"publication_status": "draft", "status": "open", "closed_reason": None}
        draft["timestamps"]["published_at"] = None
        draft["verification"] = {
            "state": "unverified",
            "outcome": None,
            "method": None,
            "reviewed_by": None,
            "reviewer_id": None,
            "source_checked_url": None,
            "evidence": None,
            "last_attempt_at": None,
            "last_attempt_outcome": None,
            "last_success_at": None,
            "fresh_until": None,
        }
        rehash(draft)
        self.assertEqual(validate_record(draft), [])
        self.assertEqual(validate_historical(draft, EVAL), [])
        self.assertEqual(codes(validate_active_feed(draft, EVAL)), [("not_on_active_feed", "lifecycle.status")])

        unpaid = load_name("valid-internship")
        unpaid["employment"]["paid"] = False
        unpaid["award"] = {
            "kind": "unpaid",
            "summary": "The source says this internship is unpaid.",
            "currency": None,
            "amount_minor": None,
            "period": None,
        }
        rehash(unpaid)
        self.assertEqual(validate_record(unpaid), [])
        unpaid["award"]["kind"] = "stipend"
        unpaid["award"]["currency"] = "NGN"
        unpaid["award"]["amount_minor"] = 15000000
        unpaid["award"]["period"] = "per_month"
        rehash(unpaid)
        self.assertIn(("invalid_constraint", "award.kind"), codes(validate_record(unpaid)))

        job = load_name("valid-job")
        job["employment"]["employment_type"] = "internship"
        rehash(job)
        self.assertIn(("invalid_enum", "employment.employment_type"), codes(validate_record(job)))
        scholarship = load_name("valid-scholarship")
        scholarship["employment"] = {
            "employment_type": "internship",
            "duration_text": None,
            "paid": None,
        }
        rehash(scholarship)
        self.assertIn(("invalid_constraint", "employment"), codes(validate_record(scholarship)))

    def test_eligibility_metadata_is_not_matching(self):
        import listings.validator as validator

        self.assertFalse(hasattr(validator, "pathsync_student_match"))
        listing = load_name("valid-scholarship")
        listing["eligibility"]["demographics"]["preferences"] = ["female"]
        listing["eligibility"]["grade"]["scale"] = "4.0"
        listing["eligibility"]["grade"]["minimum_hundredths"] = 350
        rehash(listing)
        self.assertEqual(listing["eligibility"]["grade"]["minimum_hundredths"], 350)
        self.assertEqual(validate_record(listing), [])
        self.assertEqual(validate_active_feed(listing, EVAL), [])
        self.assertEqual(validate_historical(listing, EVAL), [])
        over = load_name("valid-scholarship")
        over["eligibility"]["grade"]["scale"] = "4.0"
        over["eligibility"]["grade"]["minimum_hundredths"] = 401
        rehash(over)
        self.assertEqual(
            codes(validate_record(over)),
            [("invalid_constraint", "eligibility.grade.minimum_hundredths")],
        )
        pairs = load_name("valid-scholarship")
        pairs["eligibility"]["citizenship"]["countries"] = []
        rehash(pairs)
        self.assertIn(
            ("invalid_constraint", "eligibility.citizenship.requirement"),
            codes(validate_record(pairs)),
        )
        job = load_name("valid-job")
        self.assertEqual(job["eligibility"]["citizenship"]["requirement"], "unknown")
        self.assertEqual(validate_active_feed(job, EVAL), [])
        overlap = load_name("valid-scholarship")
        overlap["eligibility"]["demographics"]["requirements"] = ["rural"]
        overlap["eligibility"]["demographics"]["preferences"] = ["rural"]
        rehash(overlap)
        self.assertIn(
            ("invalid_constraint", "eligibility.demographics.requirements"),
            codes(validate_record(overlap)),
        )

    def test_personal_data_placeholder_and_string_hygiene(self):
        phone = load_name("valid-scholarship")
        phone["summary"] = "Call 08031234567 about this synthetic award."
        rehash(phone)
        self.assertEqual(codes(validate_record(phone)), [("forbidden_personal_data", "summary")])
        nin = load_name("valid-scholarship")
        nin["description"] = "A synthetic record that wrongly contains 12345678901."
        rehash(nin)
        self.assertEqual(codes(validate_record(nin)), [("forbidden_personal_data", "description")])
        email = load_name("valid-scholarship")
        email["how_to_apply"] = "Write to info@rivertrust.example from the source page."
        rehash(email)
        self.assertEqual(codes(validate_record(email)), [("forbidden_personal_data", "how_to_apply")])
        role = load_name("valid-scholarship")
        role["application"]["contact_email"] = "awards@rivertrust.example"
        rehash(role)
        self.assertEqual(validate_record(role), [])
        placeholder = load_name("valid-scholarship")
        placeholder["title"] = "Untitled "
        rehash(placeholder)
        self.assertEqual(
            codes(validate_record(placeholder)),
            [("invalid_constraint", "title"), ("placeholder_name", "title")],
        )
        provider = load_name("valid-scholarship")
        provider["provider"]["name"] = "See listing"
        rehash(provider)
        self.assertEqual(codes(validate_record(provider)), [("placeholder_name", "provider.name")])
        html = load_name("valid-scholarship")
        html["description"] = "A fictional foundation offers <b>award</b> text."
        rehash(html)
        self.assertEqual(codes(validate_record(html)), [("invalid_constraint", "description")])
        self.assertIn("<b>", html["description"])

    def test_confirmed_open_requires_the_attempt_bundle(self):
        listing = load_name("valid-scholarship")
        for field in (
            "method",
            "reviewed_by",
            "reviewer_id",
            "source_checked_url",
            "evidence",
            "last_attempt_at",
            "last_attempt_outcome",
        ):
            listing["verification"][field] = None
        rehash(listing)
        self.assertEqual(
            listing["dedupe_key"],
            "f18f8da3972c4d1932d54f31f674ec259d4b939fb38b184876341d978895e96f",
        )
        self.assertEqual(
            listing["content_hash"],
            "511e03282b9437093e3f7e31ddfcb2380102a28d5d2fd0531052476fa1210e4c",
        )
        self.assertEqual(listing["verification"]["state"], "verified")
        self.assertEqual(listing["verification"]["outcome"], "confirmed_open")
        self.assertIsNone(listing["verification"]["reviewer_id"])
        expected = [
            ("invalid_constraint", "verification.evidence"),
            ("invalid_constraint", "verification.last_attempt_at"),
            ("invalid_constraint", "verification.last_attempt_outcome"),
            ("invalid_constraint", "verification.method"),
            ("invalid_constraint", "verification.reviewed_by"),
            ("invalid_constraint", "verification.source_checked_url"),
        ]
        self.assertEqual(codes(validate_record(listing)), expected)
        self.assertEqual(codes(validate_active_feed(listing, EVAL)), expected)
        self.assertEqual(codes(validate_historical(listing, EVAL)), expected)
        self.assertNotIn("verification.reviewer_id", {field for _code, field in expected})

        automation = load_name("valid-scholarship")
        self.assertIsNone(automation["verification"]["reviewer_id"])
        self.assertEqual(automation["verification"]["reviewed_by"], "automation")
        self.assertEqual(validate_record(automation), [])
        self.assertEqual(validate_active_feed(automation, EVAL), [])
        self.assertEqual(validate_historical(automation, EVAL), [])

        never = load_name("valid-scholarship")
        never["verification"] = {
            "state": "unverified",
            "outcome": None,
            "method": None,
            "reviewed_by": None,
            "reviewer_id": None,
            "source_checked_url": None,
            "evidence": None,
            "last_attempt_at": None,
            "last_attempt_outcome": None,
            "last_success_at": None,
            "fresh_until": None,
        }
        rehash(never)
        self.assertEqual(validate_record(never), [])
        self.assertEqual(validate_historical(never, EVAL), [])
        self.assertEqual(
            validate_active_feed(never, EVAL),
            [stage3("not_verified", "verification.state")],
        )

    def test_unknown_education_tombstone_uses_withdrawn_wording(self):
        def clear_unknown(listing, wording):
            education = listing["eligibility"]["education"]
            education["requirement"] = "unknown"
            education["stages"] = []
            education["qualifications"] = []
            education["courses"] = []
            education["years"] = []
            education["institutions"] = {"requirement": "unknown", "names": []}
            education["source_wording"] = wording
            return listing

        tombstone = clear_unknown(load_name("valid-tombstone"), "[withdrawn]")
        self.assertIs(tombstone["eligibility"]["criteria_stated"], False)
        self.assertEqual(tombstone["eligibility"]["criteria_text"], "[withdrawn]")
        self.assertEqual(tombstone["lifecycle"]["publication_status"], "withdrawn")
        rehash(tombstone)
        self.assertEqual(tombstone["dedupe_key"], DIGESTS["valid-tombstone"][0])
        self.assertEqual(validate_record(tombstone), [])
        self.assertEqual(validate_historical(tombstone, EVAL), [])
        self.assertEqual(
            validate_active_feed(tombstone, EVAL),
            [stage3("not_on_active_feed", "lifecycle.status")],
        )

        stated = clear_unknown(load_name("valid-tombstone"), "Not stated by the source.")
        rehash(stated)
        self.assertIn(
            ("invalid_constraint", "eligibility.education.source_wording"),
            codes(validate_record(stated)),
        )

        open_unknown = clear_unknown(load_name("valid-job"), "Not stated by the source.")
        rehash(open_unknown)
        self.assertEqual(validate_record(open_unknown), [])
        self.assertEqual(validate_active_feed(open_unknown, EVAL), [])
        self.assertEqual(validate_historical(open_unknown, EVAL), [])
        withdrawn_sentence = clear_unknown(load_name("valid-job"), "[withdrawn]")
        rehash(withdrawn_sentence)
        self.assertIn(
            ("invalid_constraint", "eligibility.education.source_wording"),
            codes(validate_record(withdrawn_sentence)),
        )

        unrestricted = load_name("valid-tombstone")
        education = unrestricted["eligibility"]["education"]
        education["requirement"] = "unrestricted"
        education["stages"] = []
        education["qualifications"] = []
        education["courses"] = []
        education["years"] = []
        education["institutions"] = {"requirement": "unrestricted", "names": []}
        education["source_wording"] = "[withdrawn]"
        rehash(unrestricted)
        self.assertEqual(validate_record(unrestricted), [])
        self.assertEqual(validate_historical(unrestricted, EVAL), [])

    def test_http_status_line_is_not_evidence(self):
        rejected = (
            "200",
            "404",
            "HTTP 200",
            "HTTP/1.1 200",
            "HTTP/2 200",
            "status 200",
            "200 OK",
            "HTTP/1.1 200 OK",
            "Status 200",
            "200 OK.",
            "HTTP/1.1 200 OK.",
            "404 Not Found",
            "404 Not Found.",
            "HTTP/1.1 404 Not Found",
        )
        for evidence in rejected:
            listing = load_name("valid-scholarship")
            listing["verification"]["evidence"] = evidence
            rehash(listing)
            self.assertEqual(
                codes(validate_record(listing)),
                [("invalid_constraint", "verification.evidence")],
                evidence,
            )
        accepted = (
            "The official programme page was read on 8 November 2026 and the form was open.",
            "The official page returned HTTP 200 and the application form was open.",
            "200 level students only",
            "200 students were admitted",
        )
        for evidence in accepted:
            listing = load_name("valid-scholarship")
            listing["verification"]["evidence"] = evidence
            rehash(listing)
            self.assertEqual(validate_record(listing), [], evidence)

    def test_repeatable_immutable_and_offline(self):
        listing = load_name("valid-scholarship")
        before = copy.deepcopy(listing)
        first = validate_active_feed(listing, EVAL)
        for _ in range(20):
            self.assertEqual(validate_active_feed(listing, EVAL), first)
            self.assertEqual(validate_historical(listing, EVAL), first)
            self.assertEqual(validate_record(listing), first)
        self.assertEqual(listing, before)
        source = (REPO / "listings" / "validator.py").read_text(encoding="utf-8")
        self.assertNotIn("def normalise_url", source)
        for banned in ("datetime.now", "time.time", "import random", "import requests", "import urllib", "import socket"):
            self.assertNotIn(banned, source)
        real_socket = socket.socket

        def blocked(*_args, **_kwargs):
            raise AssertionError("network")

        socket.socket = blocked
        try:
            self.assertEqual(validate_record(load_name("valid-job")), [])
            self.assertEqual(validate_active_feed(load_name("valid-internship"), EVAL), [])
        finally:
            socket.socket = real_socket


if __name__ == "__main__":
    unittest.main(verbosity=2)
