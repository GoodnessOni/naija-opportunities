"""Producer verification attempt gate.

The contract is the vendored copy of GoodnessOni/pathsync-ai
docs/data-contract.md at b50440dc738d86ff3070386d8709b8faf2bc5982.
Evaluation time is an argument of validate_active_feed only. The fixed
instant for these tests is 2026-11-08T12:00:00Z. The gate does not take it.

| Concern | Test |
| --- | --- |
| 5 clear automation and human review | test_clear_automation_success, test_human_resolved_metadata, test_unresolved_categories_block |
| 13 this attempt, bundle, 168 hours | test_old_success_cannot_promote, test_human_resolved_metadata, test_freshness_deadline_and_lifecycle_stay_separate |
| 14 active feed is separate | test_freshness_deadline_and_lifecycle_stay_separate |
| 18 validate_record, no clock, no rewrite | test_record_claims_do_not_bypass, test_repeatable_immutable_and_offline, test_every_decision_branch |
"""

from __future__ import annotations

import copy
import inspect
import json
import socket
import sys
import unittest
from dataclasses import FrozenInstanceError
from datetime import datetime, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from listings.validator import (  # noqa: E402
    CONTRACT_EVALUATION_TIME,
    OUTCOMES,
    content_hash,
    dedupe_key,
    validate_active_feed,
    validate_historical,
    validate_record,
)
from listings.verification_gate import (  # noqa: E402
    AMBIGUOUS,
    CATEGORIES,
    CHANGED,
    CLEAR,
    CONFLICTING,
    CONTRACT_PIN,
    FAILED,
    HUMAN_RESOLVED,
    INACCESSIBLE,
    INPUT_ERROR,
    LIMITATIONS,
    PERMIT,
    REASONS,
    REJECT,
    REVIEW,
    UNRESOLVED,
    AttemptDecision,
    SourceAssessment,
    decide_attempt,
)
import listings.validator as validator  # noqa: E402
import listings.verification_gate as gate  # noqa: E402

EVAL = "2026-11-08T12:00:00Z"
PIN = "b50440dc738d86ff3070386d8709b8faf2bc5982"
FIXTURES = REPO / "listings" / "reference" / "pathsync-ai" / "docs" / "listings" / "fixtures"
NEGATIVE = REPO / "listings" / "tests" / "fixtures"
LOCK = REPO / "listings" / "contract.lock.json"
GATE_SOURCE = REPO / "listings" / "verification_gate.py"

CONTRACT_CODES = frozenset(
    {
        "invalid_json",
        "invalid_type",
        "unknown_field",
        "missing_required_field",
        "invalid_constraint",
        "invalid_enum",
        "placeholder_name",
        "non_canonical_url",
        "forbidden_personal_data",
        "hash_mismatch",
        "dedupe_mismatch",
        "timestamp_in_future",
        "not_on_active_feed",
        "expired_deadline",
        "not_verified",
        "stale_listing",
        "status_deadline_mismatch",
        "duplicate_listing",
        "revision_conflict",
        "unsupported_schema_version",
    }
)
NULL_VERIFICATION = {
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


def load_name(name):
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def load_negative(name):
    return json.loads((NEGATIVE / f"{name}.json").read_text(encoding="utf-8"))


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


def as_human(listing, reviewer="editor-synthetic-01"):
    listing["verification"]["method"] = "human_review"
    listing["verification"]["reviewed_by"] = "human"
    listing["verification"]["reviewer_id"] = reviewer
    return rehash(listing)


def as_closed(listing):
    listing["lifecycle"] = {
        "publication_status": "published",
        "status": "closed",
        "closed_reason": "provider_closed",
    }
    listing["timestamps"]["closed_at"] = listing["timestamps"]["updated_at"]
    listing["verification"]["outcome"] = "confirmed_closed"
    listing["verification"]["last_attempt_outcome"] = "confirmed_closed"
    return rehash(listing)


def later_non_success(listing, outcome):
    listing["verification"]["last_attempt_at"] = "2026-11-08T11:00:00Z"
    listing["verification"]["last_attempt_outcome"] = outcome
    listing["timestamps"]["updated_at"] = "2026-11-08T11:00:00Z"
    return rehash(listing)


class VerificationGateTest(unittest.TestCase):
    def assert_permitted(self, decision, listing, reason):
        self.assertIsInstance(decision, AttemptDecision)
        self.assertTrue(decision.permitted)
        self.assertEqual(decision.disposition, PERMIT)
        self.assertEqual(decision.reason, reason)
        self.assertIs(decision.candidate, listing)
        self.assertEqual(decision.record_errors, ())

    def assert_blocked(self, decision, disposition, reason):
        self.assertIsInstance(decision, AttemptDecision)
        self.assertFalse(decision.permitted)
        self.assertIsNone(decision.candidate)
        self.assertEqual(decision.disposition, disposition)
        self.assertEqual(decision.reason, reason)
        self.assertEqual(decision.record_errors, ())

    def assert_record_invalid(self, decision, listing):
        self.assertFalse(decision.permitted)
        self.assertIsNone(decision.candidate)
        self.assertEqual(decision.disposition, REJECT)
        self.assertEqual(decision.reason, "record_invalid")
        expected = tuple(dict(item) for item in validate_record(listing))
        self.assertEqual(decision.record_errors, expected)
        self.assertTrue(decision.record_errors)
        self.assertTrue(REASONS.isdisjoint(CONTRACT_CODES))
        self.assertNotIn(decision.reason, CONTRACT_CODES)

    def test_clear_automation_success(self):
        self.assertEqual(EVAL, CONTRACT_EVALUATION_TIME)
        self.assertEqual(
            OUTCOMES,
            frozenset(
                {
                    "confirmed_open",
                    "confirmed_closed",
                    "confirmed_expired",
                    "confirmed_withdrawn",
                }
            ),
        )
        for name in ("valid-scholarship", "valid-internship", "valid-job"):
            listing = load_name(name)
            before = copy.deepcopy(listing)
            self.assertEqual(listing["verification"]["method"], "automated_review")
            self.assertEqual(listing["verification"]["reviewed_by"], "automation")
            self.assertIsNone(listing["verification"]["reviewer_id"])
            self.assertEqual(listing["verification"]["outcome"], "confirmed_open")
            self.assertEqual(validate_record(listing), [])
            decision = decide_attempt(listing, SourceAssessment(CLEAR))
            self.assert_permitted(decision, listing, CLEAR)
            self.assertEqual(listing, before)
            self.assertEqual(validate_active_feed(listing, EVAL), [])
            self.assertEqual(validate_historical(listing, EVAL), [])

        expired = load_name("valid-historical-expired")
        before = copy.deepcopy(expired)
        self.assertEqual(expired["verification"]["outcome"], "confirmed_expired")
        self.assertEqual(validate_record(expired), [])
        decision = decide_attempt(expired, SourceAssessment(CLEAR))
        self.assert_permitted(decision, expired, CLEAR)
        self.assertEqual(expired, before)
        self.assertEqual(
            validate_active_feed(expired, EVAL),
            [stage3("not_on_active_feed", "lifecycle.status")],
        )
        self.assertNotIn("stale_listing", [item["code"] for item in validate_active_feed(expired, EVAL)])
        self.assertNotEqual(decision.reason, "not_on_active_feed")

        closed = as_closed(load_name("valid-scholarship"))
        before = copy.deepcopy(closed)
        self.assertEqual(validate_record(closed), [])
        decision = decide_attempt(closed, SourceAssessment(CLEAR))
        self.assert_permitted(decision, closed, CLEAR)
        self.assertEqual(closed, before)
        self.assertEqual(closed["verification"]["outcome"], "confirmed_closed")
        self.assertEqual(
            validate_active_feed(closed, EVAL),
            [stage3("not_on_active_feed", "lifecycle.status")],
        )

    def test_unresolved_categories_block(self):
        human = as_human(load_name("valid-scholarship"))
        self.assertEqual(validate_record(human), [])
        self.assertEqual(human["verification"]["state"], "verified")
        self.assertEqual(human["verification"]["method"], "human_review")
        for category in (AMBIGUOUS, INACCESSIBLE, CHANGED, CONFLICTING, UNRESOLVED):
            before = copy.deepcopy(human)
            decision = decide_attempt(human, SourceAssessment(category))
            self.assert_blocked(decision, REVIEW, category)
            self.assertEqual(human, before)
            self.assertEqual(validate_record(human), [])

    def test_absent_or_invalid_context_fails_closed(self):
        listing = load_name("valid-scholarship")
        raw = json.dumps(listing)
        self.assertEqual(validate_record(raw), [])
        cases = [
            (None, SourceAssessment(CLEAR), "candidate_type"),
            ([], SourceAssessment(CLEAR), "candidate_type"),
            ("clear", SourceAssessment(CLEAR), "candidate_type"),
            (raw, SourceAssessment(CLEAR), "candidate_type"),
            (b"{}", SourceAssessment(CLEAR), "candidate_type"),
            (1, SourceAssessment(CLEAR), "candidate_type"),
            (listing, None, "assessment_missing"),
            (listing, "clear", "assessment_type"),
            (listing, {"category": CLEAR}, "assessment_type"),
            (listing, [CLEAR], "assessment_type"),
            (listing, 1, "assessment_type"),
            (listing, object(), "assessment_type"),
            (listing, SourceAssessment(None), "category_type"),
            (listing, SourceAssessment(1), "category_type"),
            (listing, SourceAssessment(True), "category_type"),
            (listing, SourceAssessment(b"clear"), "category_type"),
            (listing, SourceAssessment("CLEAR"), "category_unknown"),
            (listing, SourceAssessment("human"), "category_unknown"),
            (listing, SourceAssessment("verified"), "category_unknown"),
            (listing, SourceAssessment("permit"), "category_unknown"),
            (listing, SourceAssessment(" clear"), "category_unknown"),
            (listing, SourceAssessment(""), "category_unknown"),
        ]
        for candidate, assessment, reason in cases:
            decision = decide_attempt(candidate, assessment)
            self.assert_blocked(decision, INPUT_ERROR, reason)
            self.assertNotEqual(decision.disposition, PERMIT)
        both = decide_attempt(None, None)
        self.assert_blocked(both, INPUT_ERROR, "candidate_type")
        parameters = inspect.signature(decide_attempt).parameters
        self.assertEqual(list(parameters), ["candidate", "assessment"])
        self.assertIs(parameters["candidate"].default, inspect.Parameter.empty)
        self.assertIs(parameters["assessment"].default, inspect.Parameter.empty)

    def test_record_claims_do_not_bypass(self):
        automation = load_name("valid-scholarship")
        human = as_human(load_name("valid-scholarship"))
        self.assertEqual(validate_record(automation), [])
        self.assertEqual(validate_record(human), [])

        self.assert_blocked(
            decide_attempt(human, SourceAssessment(CLEAR)),
            REJECT,
            "metadata",
        )
        self.assert_blocked(
            decide_attempt(automation, SourceAssessment(HUMAN_RESOLVED)),
            REJECT,
            "metadata",
        )
        self.assert_blocked(
            decide_attempt(human, SourceAssessment(UNRESOLVED)),
            REVIEW,
            UNRESOLVED,
        )
        self.assert_blocked(
            decide_attempt(automation, None),
            INPUT_ERROR,
            "assessment_missing",
        )
        self.assert_blocked(
            decide_attempt(human, SourceAssessment("human")),
            INPUT_ERROR,
            "category_unknown",
        )

        never = load_name("valid-scholarship")
        never["verification"] = dict(NULL_VERIFICATION)
        rehash(never)
        self.assertEqual(validate_record(never), [])
        before = copy.deepcopy(never)
        self.assert_blocked(decide_attempt(never, SourceAssessment(CLEAR)), REJECT, "metadata")
        self.assertEqual(never, before)
        self.assertEqual(
            validate_active_feed(never, EVAL),
            [stage3("not_verified", "verification.state")],
        )

        inconclusive = load_name("valid-scholarship")
        inconclusive["verification"] = {
            "state": "unverified",
            "outcome": None,
            "method": "automated_review",
            "reviewed_by": "automation",
            "reviewer_id": None,
            "source_checked_url": inconclusive["application"]["url"],
            "evidence": "The official page could not be read as a successful check.",
            "last_attempt_at": "2026-11-08T09:00:00Z",
            "last_attempt_outcome": "inconclusive",
            "last_success_at": None,
            "fresh_until": None,
        }
        rehash(inconclusive)
        self.assertEqual(validate_record(inconclusive), [])
        self.assert_blocked(
            decide_attempt(inconclusive, SourceAssessment(CLEAR)),
            REJECT,
            "attempt_not_successful",
        )
        self.assert_blocked(
            decide_attempt(inconclusive, SourceAssessment(AMBIGUOUS)),
            REVIEW,
            AMBIGUOUS,
        )

        original = gate.validate_record

        def boom(_listing):
            raise AssertionError("validator consulted")

        gate.validate_record = boom
        try:
            decision = decide_attempt(human, SourceAssessment(UNRESOLVED))
        finally:
            gate.validate_record = original
        self.assert_blocked(decision, REVIEW, UNRESOLVED)

    def test_human_resolved_metadata(self):
        listing = as_human(load_name("valid-scholarship"))
        before = copy.deepcopy(listing)
        self.assertEqual(validate_record(listing), [])
        decision = decide_attempt(listing, SourceAssessment(HUMAN_RESOLVED))
        self.assert_permitted(decision, listing, HUMAN_RESOLVED)
        self.assertEqual(listing, before)
        self.assertEqual(listing["verification"]["fresh_until"], "2026-11-15T09:00:00Z")

        short = as_human(load_name("valid-scholarship"), reviewer="a")
        self.assertEqual(validate_record(short), [])
        self.assert_permitted(
            decide_attempt(short, SourceAssessment(HUMAN_RESOLVED)),
            short,
            HUMAN_RESOLVED,
        )
        wide = as_human(load_name("valid-scholarship"), reviewer="a" * 64)
        self.assertEqual(validate_record(wide), [])
        self.assert_permitted(
            decide_attempt(wide, SourceAssessment(HUMAN_RESOLVED)),
            wide,
            HUMAN_RESOLVED,
        )

        opaque = as_human(load_name("valid-scholarship"), reviewer="bot-01")
        self.assertEqual(validate_record(opaque), [])
        self.assert_permitted(
            decide_attempt(opaque, SourceAssessment(HUMAN_RESOLVED)),
            opaque,
            HUMAN_RESOLVED,
        )

        wrong = {
            "method": "automated_review",
            "reviewed_by": "automation",
            "reviewer_id": None,
            "evidence": None,
            "source_checked_url": None,
            "last_attempt_at": None,
            "last_attempt_outcome": None,
        }
        for field, value in wrong.items():
            broken = as_human(load_name("valid-scholarship"))
            broken["verification"][field] = value
            rehash(broken)
            before = copy.deepcopy(broken)
            self.assert_blocked(
                decide_attempt(broken, SourceAssessment(HUMAN_RESOLVED)),
                REJECT,
                "metadata",
            )
            self.assertEqual(broken, before)

        for reviewer in ("", "Editor", "a-", "a" * 65, "editor synthetic"):
            broken = as_human(load_name("valid-scholarship"), reviewer=reviewer)
            before = copy.deepcopy(broken)
            self.assert_blocked(
                decide_attempt(broken, SourceAssessment(HUMAN_RESOLVED)),
                REJECT,
                "metadata",
            )
            self.assertEqual(broken, before)

        tombstone = load_name("valid-tombstone")
        before = copy.deepcopy(tombstone)
        self.assertEqual(tombstone["verification"]["method"], "human_review")
        self.assertEqual(tombstone["verification"]["outcome"], "confirmed_withdrawn")
        self.assertEqual(validate_record(tombstone), [])
        decision = decide_attempt(tombstone, SourceAssessment(HUMAN_RESOLVED))
        self.assert_permitted(decision, tombstone, HUMAN_RESOLVED)
        self.assertEqual(tombstone, before)
        self.assert_blocked(
            decide_attempt(tombstone, SourceAssessment(CLEAR)),
            REJECT,
            "metadata",
        )
        self.assertEqual(
            validate_active_feed(tombstone, EVAL),
            [stage3("not_on_active_feed", "lifecycle.status")],
        )

    def test_phrase_examples_follow_the_caller_assessment(self):
        source = GATE_SOURCE.read_text(encoding="utf-8")
        self.assertNotIn("200 Fine", source)
        self.assertNotIn("404 Nope", source)
        self.assertNotIn("Read:", source)
        self.assertNotIn("HTTPStatus", source)

        accepted = (
            "200 Fine",
            "404 Nope",
            "HTTP/1.1 200 Fine. The form was open.",
        )
        for evidence in accepted:
            listing = load_name("valid-scholarship")
            listing["verification"]["evidence"] = evidence
            rehash(listing)
            before = copy.deepcopy(listing)
            self.assertEqual(validate_record(listing), [])
            self.assert_blocked(
                decide_attempt(listing, SourceAssessment(AMBIGUOUS)),
                REVIEW,
                AMBIGUOUS,
            )
            self.assert_permitted(
                decide_attempt(listing, SourceAssessment(CLEAR)),
                listing,
                CLEAR,
            )
            self.assertEqual(listing, before)

        human = as_human(load_name("valid-scholarship"))
        human["verification"]["evidence"] = "200 Fine"
        rehash(human)
        self.assertEqual(validate_record(human), [])
        self.assert_blocked(
            decide_attempt(human, SourceAssessment(UNRESOLVED)),
            REVIEW,
            UNRESOLVED,
        )
        self.assert_permitted(
            decide_attempt(human, SourceAssessment(HUMAN_RESOLVED)),
            human,
            HUMAN_RESOLVED,
        )

        status_only = load_name("valid-scholarship")
        status_only["verification"]["evidence"] = "HTTP/1.1 200 Fine"
        rehash(status_only)
        before = copy.deepcopy(status_only)
        decision = decide_attempt(status_only, SourceAssessment(CLEAR))
        self.assert_record_invalid(decision, status_only)
        self.assertIn(
            ("invalid_constraint", "verification.evidence"),
            codes(decision.record_errors),
        )
        self.assertEqual(status_only, before)

    def test_old_success_cannot_promote(self):
        failed = later_non_success(load_name("valid-scholarship"), "failed")
        self.assertEqual(validate_record(failed), [])
        self.assertEqual(failed["verification"]["last_success_at"], "2026-11-08T09:00:00Z")
        self.assertEqual(failed["verification"]["fresh_until"], "2026-11-15T09:00:00Z")
        self.assertEqual(failed["verification"]["state"], "verified")
        before = copy.deepcopy(failed)
        self.assert_blocked(
            decide_attempt(failed, SourceAssessment(CLEAR)),
            REJECT,
            "attempt_not_successful",
        )
        self.assert_blocked(decide_attempt(failed, SourceAssessment(FAILED)), REJECT, FAILED)
        self.assert_blocked(
            decide_attempt(failed, SourceAssessment(AMBIGUOUS)),
            REVIEW,
            AMBIGUOUS,
        )
        self.assertEqual(failed, before)
        self.assertEqual(
            validate_active_feed(failed, EVAL),
            [],
        )

        ambiguous = later_non_success(load_name("valid-scholarship"), "inconclusive")
        self.assertEqual(validate_record(ambiguous), [])
        before = copy.deepcopy(ambiguous)
        self.assert_blocked(
            decide_attempt(ambiguous, SourceAssessment(CLEAR)),
            REJECT,
            "attempt_not_successful",
        )
        self.assert_blocked(
            decide_attempt(ambiguous, SourceAssessment(AMBIGUOUS)),
            REVIEW,
            AMBIGUOUS,
        )
        self.assertEqual(ambiguous, before)
        self.assertEqual(ambiguous["verification"]["fresh_until"], "2026-11-15T09:00:00Z")

        claimed = load_name("valid-scholarship")
        claimed["verification"]["last_attempt_at"] = "2026-11-08T11:00:00Z"
        claimed["verification"]["last_success_at"] = "2026-11-08T11:00:00Z"
        claimed["verification"]["fresh_until"] = "2026-11-15T11:00:00Z"
        claimed["timestamps"]["updated_at"] = "2026-11-08T11:00:00Z"
        rehash(claimed)
        self.assertEqual(validate_record(claimed), [])
        before = copy.deepcopy(claimed)
        self.assert_blocked(
            decide_attempt(claimed, SourceAssessment(UNRESOLVED)),
            REVIEW,
            UNRESOLVED,
        )
        self.assert_blocked(decide_attempt(claimed, SourceAssessment(FAILED)), REJECT, FAILED)
        self.assertEqual(claimed, before)
        self.assertEqual(claimed["verification"]["fresh_until"], "2026-11-15T11:00:00Z")

        renewed = load_name("valid-scholarship")
        renewed["verification"]["last_attempt_at"] = "2026-11-08T11:00:00Z"
        renewed["verification"]["last_success_at"] = "2026-11-08T11:00:00Z"
        renewed["verification"]["fresh_until"] = "2026-11-15T11:00:00Z"
        renewed["verification"]["last_attempt_outcome"] = "confirmed_open"
        renewed["timestamps"]["updated_at"] = "2026-11-08T11:00:00Z"
        rehash(renewed)
        self.assertEqual(validate_record(renewed), [])
        parameters = inspect.signature(decide_attempt).parameters
        self.assertNotIn("previous", parameters)
        decision = decide_attempt(renewed, SourceAssessment(CLEAR))
        self.assert_permitted(decision, renewed, CLEAR)
        self.assertEqual(renewed["verification"]["fresh_until"], "2026-11-15T11:00:00Z")
        self.assertNotEqual(renewed["verification"]["fresh_until"], "2026-11-15T12:00:00Z")

    def test_freshness_deadline_and_lifecycle_stay_separate(self):
        listing = load_name("valid-scholarship")
        success = datetime(2026, 11, 8, 9, 0, 0)
        fresh = datetime(2026, 11, 15, 9, 0, 0)
        self.assertEqual(fresh - success, timedelta(hours=168))
        self.assertEqual(listing["verification"]["last_success_at"], "2026-11-08T09:00:00Z")
        self.assertEqual(listing["verification"]["fresh_until"], "2026-11-15T09:00:00Z")
        decision = decide_attempt(listing, SourceAssessment(CLEAR))
        self.assert_permitted(decision, listing, CLEAR)
        self.assertEqual(validate_active_feed(listing, "2026-11-15T09:00:00Z"), [])
        self.assertEqual(validate_historical(listing, "2026-11-15T09:00:00Z"), [])
        self.assertEqual(
            validate_active_feed(listing, "2026-11-15T09:00:01Z"),
            [stage3("stale_listing", "verification.fresh_until", "2026-11-15T09:00:01Z")],
        )
        self.assertEqual(validate_historical(listing, "2026-11-15T09:00:01Z"), [])
        self.assertEqual(listing["lifecycle"]["status"], "open")
        self.assertEqual(listing["verification"]["fresh_until"], "2026-11-15T09:00:00Z")
        self.assertEqual(decision.reason, CLEAR)
        self.assertNotEqual(decision.reason, "stale_listing")

        human = as_human(load_name("valid-scholarship"))
        self.assertEqual(human["verification"]["fresh_until"], "2026-11-15T09:00:00Z")
        human_decision = decide_attempt(human, SourceAssessment(HUMAN_RESOLVED))
        self.assert_permitted(human_decision, human, HUMAN_RESOLVED)
        self.assertEqual(validate_active_feed(human, "2026-11-15T09:00:00Z"), [])
        self.assertEqual(
            validate_active_feed(human, "2026-11-15T09:00:01Z"),
            [stage3("stale_listing", "verification.fresh_until", "2026-11-15T09:00:01Z")],
        )
        ninety = as_human(load_name("valid-scholarship"))
        ninety_stamp = (success + timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.assertNotEqual(ninety_stamp, "2026-11-15T09:00:00Z")
        ninety["verification"]["fresh_until"] = ninety_stamp
        rehash(ninety)
        before = copy.deepcopy(ninety)
        ninety_decision = decide_attempt(ninety, SourceAssessment(HUMAN_RESOLVED))
        self.assert_record_invalid(ninety_decision, ninety)
        self.assertIn(
            ("invalid_constraint", "verification.fresh_until"),
            codes(ninety_decision.record_errors),
        )
        self.assertEqual(ninety, before)

        self.assertEqual(
            datetime(2027, 3, 24, 22, 59, 59) + timedelta(hours=168),
            datetime(2027, 3, 31, 22, 59, 59),
        )
        aligned = load_name("valid-scholarship")
        aligned["verification"]["last_attempt_at"] = "2027-03-24T22:59:59Z"
        aligned["verification"]["last_success_at"] = "2027-03-24T22:59:59Z"
        aligned["verification"]["fresh_until"] = "2027-03-31T22:59:59Z"
        aligned["timestamps"]["updated_at"] = "2027-03-24T22:59:59Z"
        aligned["source"]["retrieved_at"] = "2027-03-24T22:59:59Z"
        rehash(aligned)
        self.assertEqual(aligned["deadline"]["fixed_at"], "2027-03-31T22:59:59Z")
        self.assertEqual(validate_record(aligned), [])
        aligned_decision = decide_attempt(aligned, SourceAssessment(CLEAR))
        self.assert_permitted(aligned_decision, aligned, CLEAR)
        at_deadline = "2027-03-31T22:59:59Z"
        after_deadline = "2027-03-31T23:00:00Z"
        self.assertEqual(validate_active_feed(aligned, at_deadline), [])
        self.assertEqual(validate_historical(aligned, at_deadline), [])
        self.assertEqual(
            validate_active_feed(aligned, after_deadline),
            [
                stage3("expired_deadline", "deadline.fixed_at", after_deadline),
                stage3("stale_listing", "verification.fresh_until", after_deadline),
            ],
        )
        self.assertEqual(
            validate_historical(aligned, after_deadline),
            [stage3("expired_deadline", "deadline.fixed_at", after_deadline)],
        )
        self.assertEqual(aligned["verification"]["fresh_until"], at_deadline)
        self.assertEqual(aligned["lifecycle"]["status"], "open")

        expired_open = load_negative("invalid-expired-open")
        self.assertEqual(validate_record(expired_open), [])
        expired_decision = decide_attempt(expired_open, SourceAssessment(CLEAR))
        self.assert_permitted(expired_decision, expired_open, CLEAR)
        self.assertEqual(
            validate_active_feed(expired_open, EVAL),
            [stage3("expired_deadline", "deadline.fixed_at")],
        )
        self.assertEqual(
            validate_historical(expired_open, EVAL),
            [stage3("expired_deadline", "deadline.fixed_at")],
        )

        for name in ("valid-internship", "valid-job"):
            rolling = load_name(name)
            far = "2028-01-01T00:00:00Z"
            self.assert_permitted(decide_attempt(rolling, SourceAssessment(CLEAR)), rolling, CLEAR)
            active_codes = codes(validate_active_feed(rolling, far))
            self.assertIn(("stale_listing", "verification.fresh_until"), active_codes)
            self.assertNotIn(("expired_deadline", "deadline.fixed_at"), active_codes)
            self.assertEqual(validate_historical(rolling, far), [])
            self.assertEqual(rolling["lifecycle"]["status"], "open")

        draft = load_name("valid-scholarship")
        draft["lifecycle"] = {
            "publication_status": "draft",
            "status": "open",
            "closed_reason": None,
        }
        draft["timestamps"]["published_at"] = None
        draft["verification"] = dict(NULL_VERIFICATION)
        rehash(draft)
        self.assertEqual(validate_record(draft), [])
        self.assert_blocked(decide_attempt(draft, SourceAssessment(CLEAR)), REJECT, "metadata")
        self.assertEqual(
            codes(validate_active_feed(draft, EVAL)),
            [("not_on_active_feed", "lifecycle.status")],
        )

        self.assertEqual(
            codes(validate_active_feed(listing, "not-a-timestamp")),
            [("invalid_constraint", "$evaluation_time")],
        )
        self.assert_permitted(decide_attempt(listing, SourceAssessment(CLEAR)), listing, CLEAR)

        def boom(*_args, **_kwargs):
            raise AssertionError("active or historical consulted")

        active = validator.validate_active_feed
        historical = validator.validate_historical
        validator.validate_active_feed = boom
        validator.validate_historical = boom
        try:
            self.assertFalse(hasattr(gate, "validate_active_feed"))
            self.assertFalse(hasattr(gate, "validate_historical"))
            fresh = load_name("valid-scholarship")
            self.assert_permitted(decide_attempt(fresh, SourceAssessment(CLEAR)), fresh, CLEAR)
        finally:
            validator.validate_active_feed = active
            validator.validate_historical = historical

    def test_record_invalid_uses_full_validate_record(self):
        hashed = load_name("valid-scholarship")
        hashed["content_hash"] = "0" * 64
        before = copy.deepcopy(hashed)
        decision = decide_attempt(hashed, SourceAssessment(CLEAR))
        self.assert_record_invalid(decision, hashed)
        self.assertEqual(codes(decision.record_errors), [("hash_mismatch", "content_hash")])
        decision.record_errors[0]["code"] = "changed"
        again = decide_attempt(hashed, SourceAssessment(CLEAR))
        self.assertEqual(again.record_errors[0]["code"], "hash_mismatch")
        self.assertIsNot(decision.record_errors[0], again.record_errors[0])
        self.assertEqual(hashed, before)

        gap = load_name("valid-scholarship")
        gap["verification"]["fresh_until"] = "2026-11-15T09:00:01Z"
        rehash(gap)
        gap_decision = decide_attempt(gap, SourceAssessment(CLEAR))
        self.assert_record_invalid(gap_decision, gap)
        self.assertIn(
            ("invalid_constraint", "verification.fresh_until"),
            codes(gap_decision.record_errors),
        )
        self.assertEqual(gap["verification"]["fresh_until"], "2026-11-15T09:00:01Z")

        unparsed = load_name("valid-scholarship")
        unparsed["verification"]["fresh_until"] = "tomorrow"
        rehash(unparsed)
        self.assert_blocked(
            decide_attempt(unparsed, SourceAssessment(CLEAR)),
            REJECT,
            "attempt_not_successful",
        )

        missing = load_name("valid-scholarship")
        del missing["title"]
        missing_decision = decide_attempt(missing, SourceAssessment(CLEAR))
        self.assert_record_invalid(missing_decision, missing)
        self.assertEqual(
            codes(missing_decision.record_errors),
            [("missing_required_field", "title")],
        )

        aggregator = load_name("valid-scholarship")
        aggregator["verification"]["source_checked_url"] = aggregator["source"]["url"]
        rehash(aggregator)
        aggregator_decision = decide_attempt(aggregator, SourceAssessment(CLEAR))
        self.assert_record_invalid(aggregator_decision, aggregator)
        self.assertIn(
            ("invalid_constraint", "verification.source_checked_url"),
            codes(aggregator_decision.record_errors),
        )

        blank = load_name("valid-scholarship")
        blank["verification"]["evidence"] = ""
        rehash(blank)
        self.assert_record_invalid(decide_attempt(blank, SourceAssessment(CLEAR)), blank)

        absent_reviewer = load_name("valid-scholarship")
        del absent_reviewer["verification"]["reviewer_id"]
        absent_decision = decide_attempt(absent_reviewer, SourceAssessment(CLEAR))
        self.assert_record_invalid(absent_decision, absent_reviewer)
        self.assertEqual(
            codes(absent_decision.record_errors),
            [("missing_required_field", "verification.reviewer_id")],
        )

    def test_repeatable_immutable_and_offline(self):
        listing = load_name("valid-scholarship")
        before = copy.deepcopy(listing)
        assessment = SourceAssessment(CLEAR)
        first = decide_attempt(listing, assessment)
        for _ in range(20):
            again = decide_attempt(listing, assessment)
            self.assertEqual(again, first)
            self.assertIs(again.candidate, listing)
        self.assertEqual(listing, before)
        with self.assertRaises(FrozenInstanceError):
            assessment.category = AMBIGUOUS
        with self.assertRaises(FrozenInstanceError):
            first.permitted = False

        blocked = later_non_success(load_name("valid-scholarship"), "failed")
        blocked_before = copy.deepcopy(blocked)
        blocked_first = decide_attempt(blocked, SourceAssessment(CLEAR))
        for _ in range(20):
            self.assertEqual(decide_attempt(blocked, SourceAssessment(CLEAR)), blocked_first)
        self.assertEqual(blocked, blocked_before)
        self.assertIsNone(blocked_first.candidate)

        source = GATE_SOURCE.read_text(encoding="utf-8")
        for banned in (
            "datetime.now",
            "time.time",
            "import random",
            "import requests",
            "import urllib",
            "import socket",
            "normalise_url",
        ):
            self.assertNotIn(banned, source)
        for sentence in LIMITATIONS:
            self.assertIn(sentence, gate.__doc__)
        self.assertEqual(len(LIMITATIONS), 4)

        real_socket = socket.socket

        def blocked_socket(*_args, **_kwargs):
            raise AssertionError("network")

        socket.socket = blocked_socket
        try:
            job = load_name("valid-job")
            self.assert_permitted(decide_attempt(job, SourceAssessment(CLEAR)), job, CLEAR)
            stale_hash = load_name("valid-internship")
            stale_hash["content_hash"] = "0" * 64
            self.assert_record_invalid(
                decide_attempt(stale_hash, SourceAssessment(CLEAR)),
                stale_hash,
            )
        finally:
            socket.socket = real_socket

        lock = json.loads(LOCK.read_text(encoding="utf-8"))
        self.assertEqual(lock["git_sha"], PIN)
        self.assertEqual(CONTRACT_PIN, PIN)

    def test_every_decision_branch(self):
        scholarship = load_name("valid-scholarship")
        human = as_human(load_name("valid-scholarship"))
        failed = later_non_success(load_name("valid-scholarship"), "failed")
        hashed = load_name("valid-scholarship")
        hashed["content_hash"] = "0" * 64
        produced = {
            decide_attempt(None, SourceAssessment(CLEAR)).reason: INPUT_ERROR,
            decide_attempt(scholarship, None).reason: INPUT_ERROR,
            decide_attempt(scholarship, {"category": CLEAR}).reason: INPUT_ERROR,
            decide_attempt(scholarship, SourceAssessment(None)).reason: INPUT_ERROR,
            decide_attempt(scholarship, SourceAssessment("permit")).reason: INPUT_ERROR,
            decide_attempt(scholarship, SourceAssessment(AMBIGUOUS)).reason: REVIEW,
            decide_attempt(scholarship, SourceAssessment(INACCESSIBLE)).reason: REVIEW,
            decide_attempt(scholarship, SourceAssessment(CHANGED)).reason: REVIEW,
            decide_attempt(scholarship, SourceAssessment(CONFLICTING)).reason: REVIEW,
            decide_attempt(human, SourceAssessment(UNRESOLVED)).reason: REVIEW,
            decide_attempt(scholarship, SourceAssessment(FAILED)).reason: REJECT,
            decide_attempt(scholarship, SourceAssessment(HUMAN_RESOLVED)).reason: REJECT,
            decide_attempt(failed, SourceAssessment(CLEAR)).reason: REJECT,
            decide_attempt(hashed, SourceAssessment(CLEAR)).reason: REJECT,
            decide_attempt(scholarship, SourceAssessment(CLEAR)).reason: PERMIT,
            decide_attempt(human, SourceAssessment(HUMAN_RESOLVED)).reason: PERMIT,
        }
        expected = {
            "candidate_type": INPUT_ERROR,
            "assessment_missing": INPUT_ERROR,
            "assessment_type": INPUT_ERROR,
            "category_type": INPUT_ERROR,
            "category_unknown": INPUT_ERROR,
            AMBIGUOUS: REVIEW,
            INACCESSIBLE: REVIEW,
            CHANGED: REVIEW,
            CONFLICTING: REVIEW,
            UNRESOLVED: REVIEW,
            FAILED: REJECT,
            "metadata": REJECT,
            "attempt_not_successful": REJECT,
            "record_invalid": REJECT,
            CLEAR: PERMIT,
            HUMAN_RESOLVED: PERMIT,
        }
        self.assertEqual(produced, expected)
        self.assertEqual(set(produced), set(REASONS))
        self.assertEqual(
            CATEGORIES,
            frozenset(
                {
                    CLEAR,
                    AMBIGUOUS,
                    INACCESSIBLE,
                    CHANGED,
                    CONFLICTING,
                    UNRESOLVED,
                    FAILED,
                    HUMAN_RESOLVED,
                }
            ),
        )
        for reason, disposition in produced.items():
            self.assertIn(reason, REASONS)
            if disposition == PERMIT:
                self.assertIn(reason, {CLEAR, HUMAN_RESOLVED})
            else:
                self.assertNotIn(reason, {CLEAR, HUMAN_RESOLVED})
        print("GATE_DECISIONS " + " ".join(sorted(produced)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
