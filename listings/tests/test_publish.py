"""Offline builder for the active feed PathSync will read.

| Rule | Test |
| --- | --- |
| fresh clear permit | test_included_fresh_clear |
| fresh human_resolved permit | test_included_fresh_human_resolved |
| ambiguous / failed / missing | test_excluded_ambiguous_failed_missing |
| seven-day boundary | test_seven_day_boundary_equality_stays_active |
| expired fixed deadline | test_excluded_expired_deadline |
| validate_active_feed on output | test_output_passes_validate_active_feed |
| review queue accept then include | test_ambiguous_through_review_to_included |
"""

from __future__ import annotations

import copy
import json
import socket
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from listings.publish import (  # noqa: E402
    CONTRACT_PIN,
    EXPIRED_DEADLINE,
    LIMITATIONS,
    MISSING,
    STALE,
    ActiveFeedError,
    ActiveFeedResult,
    FeedExclusion,
    build_active_feed,
)
from listings.review_queue import ACCEPT, ReviewQueue  # noqa: E402
from listings.validator import (  # noqa: E402
    CONTRACT_EVALUATION_TIME,
    content_hash,
    dedupe_key,
    validate_active_feed,
)
from listings.verification_gate import (  # noqa: E402
    AMBIGUOUS,
    CLEAR,
    FAILED,
    HUMAN_RESOLVED,
    PERMIT,
    SourceAssessment,
    decide_attempt,
)
import listings.publish as publish_mod  # noqa: E402

EVAL = "2026-11-08T12:00:00Z"
PIN = "b50440dc738d86ff3070386d8709b8faf2bc5982"
FIXTURES = REPO / "listings" / "reference" / "pathsync-ai" / "docs" / "listings" / "fixtures"
NEGATIVE = REPO / "listings" / "tests" / "fixtures"
PUBLISH_SOURCE = REPO / "listings" / "publish.py"

# Contract / validator rule: evaluation_time == fresh_until stays active;
# evaluation_time == fresh_until + 1 second is stale_listing.
BOUNDARY_RULE = (
    "fresh_until equality stays active; the next second is stale "
    "(contract sections 5 and 13; validator stage-3 active feed)"
)


def load_name(name):
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def load_negative(name):
    return json.loads((NEGATIVE / f"{name}.json").read_text(encoding="utf-8"))


def rehash(listing):
    listing["dedupe_key"] = dedupe_key(listing)
    listing["content_hash"] = content_hash(listing)
    return listing


def as_human(listing, reviewer="editor-synthetic-01"):
    listing["verification"]["method"] = "human_review"
    listing["verification"]["reviewed_by"] = "human"
    listing["verification"]["reviewer_id"] = reviewer
    return rehash(listing)


def aware(stamp):
    return datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def decisions_for(*pairs):
    mapping = {}
    for listing, assessment in pairs:
        mapping[listing["listing_id"]] = decide_attempt(listing, assessment)
    return mapping


class PublishActiveFeedTest(unittest.TestCase):
    def setUp(self):
        self.now = aware(EVAL)
        self.scholarship = load_name("valid-scholarship")
        self.internship = load_name("valid-internship")
        self.job = load_name("valid-job")

    def test_included_fresh_clear(self):
        self.assertEqual(EVAL, CONTRACT_EVALUATION_TIME)
        self.assertEqual(CONTRACT_PIN, PIN)
        listing = self.scholarship
        decision = decide_attempt(listing, SourceAssessment(CLEAR))
        self.assertTrue(decision.permitted)
        self.assertEqual(decision.reason, CLEAR)
        self.assertIs(decision.candidate, listing)

        result = build_active_feed(
            [listing],
            {listing["listing_id"]: decision},
            self.now,
        )
        self.assertIsInstance(result, ActiveFeedResult)
        self.assertEqual(result.feed, (listing,))
        self.assertEqual(result.exclusions, ())
        self.assertEqual(validate_active_feed(listing, EVAL), [])

    def test_included_fresh_human_resolved(self):
        listing = as_human(copy.deepcopy(self.internship))
        decision = decide_attempt(listing, SourceAssessment(HUMAN_RESOLVED))
        self.assertTrue(decision.permitted)
        self.assertEqual(decision.disposition, PERMIT)
        self.assertEqual(decision.reason, HUMAN_RESOLVED)

        result = build_active_feed(
            [listing],
            {listing["listing_id"]: decision},
            self.now,
        )
        self.assertEqual(result.feed, (listing,))
        self.assertEqual(result.exclusions, ())

    def test_excluded_ambiguous_failed_missing(self):
        ambiguous = self.scholarship
        failed_listing = self.internship
        missing_listing = self.job

        ambiguous_decision = decide_attempt(ambiguous, SourceAssessment(AMBIGUOUS))
        self.assertFalse(ambiguous_decision.permitted)
        self.assertEqual(ambiguous_decision.reason, AMBIGUOUS)

        failed_decision = decide_attempt(failed_listing, SourceAssessment(FAILED))
        self.assertFalse(failed_decision.permitted)
        self.assertEqual(failed_decision.reason, FAILED)

        result = build_active_feed(
            [ambiguous, failed_listing, missing_listing],
            {
                ambiguous["listing_id"]: ambiguous_decision,
                failed_listing["listing_id"]: failed_decision,
                # missing_listing deliberately omitted
            },
            self.now,
        )
        self.assertEqual(result.feed, ())
        self.assertEqual(
            result.exclusions,
            (
                FeedExclusion(ambiguous["listing_id"], AMBIGUOUS),
                FeedExclusion(failed_listing["listing_id"], FAILED),
                FeedExclusion(missing_listing["listing_id"], MISSING),
            ),
        )

    def test_seven_day_boundary_equality_stays_active(self):
        """State the boundary rule used for the seven-day window."""
        self.assertEqual(
            BOUNDARY_RULE,
            "fresh_until equality stays active; the next second is stale "
            "(contract sections 5 and 13; validator stage-3 active feed)",
        )
        listing = self.scholarship
        fresh_until = listing["verification"]["fresh_until"]
        self.assertEqual(fresh_until, "2026-11-15T09:00:00Z")
        decision = decide_attempt(listing, SourceAssessment(CLEAR))
        self.assertTrue(decision.permitted)
        keyed = {listing["listing_id"]: decision}

        at_boundary = aware(fresh_until)
        included = build_active_feed([listing], keyed, at_boundary)
        self.assertEqual(included.feed, (listing,))
        self.assertEqual(included.exclusions, ())
        self.assertEqual(validate_active_feed(listing, fresh_until), [])

        one_second_later = at_boundary + timedelta(seconds=1)
        excluded = build_active_feed([listing], keyed, one_second_later)
        self.assertEqual(excluded.feed, ())
        self.assertEqual(
            excluded.exclusions,
            (FeedExclusion(listing["listing_id"], STALE),),
        )
        stale_errors = validate_active_feed(
            listing, one_second_later.strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        self.assertEqual(
            [(item["code"], item["field"]) for item in stale_errors],
            [("stale_listing", "verification.fresh_until")],
        )

    def test_excluded_expired_deadline(self):
        listing = load_negative("invalid-expired-open")
        decision = decide_attempt(listing, SourceAssessment(CLEAR))
        self.assertTrue(decision.permitted)
        self.assertEqual(listing["deadline"]["fixed_at"], "2026-01-15T22:59:59Z")

        result = build_active_feed(
            [listing],
            {listing["listing_id"]: decision},
            self.now,
        )
        self.assertEqual(result.feed, ())
        self.assertEqual(
            result.exclusions,
            (FeedExclusion(listing["listing_id"], EXPIRED_DEADLINE),),
        )
        # Safety: if it had been included, validate_active_feed would fail.
        active_errors = validate_active_feed(listing, EVAL)
        self.assertEqual(
            [(item["code"], item["field"]) for item in active_errors],
            [("expired_deadline", "deadline.fixed_at")],
        )

    def test_output_passes_validate_active_feed(self):
        scholarship = self.scholarship
        internship = as_human(copy.deepcopy(self.internship))
        decisions = {
            scholarship["listing_id"]: decide_attempt(
                scholarship, SourceAssessment(CLEAR)
            ),
            internship["listing_id"]: decide_attempt(
                internship, SourceAssessment(HUMAN_RESOLVED)
            ),
        }
        result = build_active_feed([scholarship, internship], decisions, self.now)
        self.assertEqual(len(result.feed), 2)
        for listing in result.feed:
            self.assertEqual(validate_active_feed(listing, EVAL), [])

        # A permitted closed row is not filtered by the decision/freshness/
        # deadline checks, so validate_active_feed must raise ActiveFeedError.
        closed = copy.deepcopy(self.scholarship)
        closed["lifecycle"] = {
            "publication_status": "published",
            "status": "closed",
            "closed_reason": "provider_closed",
        }
        closed["timestamps"]["closed_at"] = closed["timestamps"]["updated_at"]
        closed["verification"]["outcome"] = "confirmed_closed"
        closed["verification"]["last_attempt_outcome"] = "confirmed_closed"
        rehash(closed)
        closed_decision = decide_attempt(closed, SourceAssessment(CLEAR))
        self.assertTrue(closed_decision.permitted)
        with self.assertRaises(ActiveFeedError):
            build_active_feed(
                [closed],
                {closed["listing_id"]: closed_decision},
                self.now,
            )

    def test_ambiguous_through_review_to_included(self):
        listing = load_name("valid-scholarship")
        before = copy.deepcopy(listing)
        denied = decide_attempt(listing, SourceAssessment(AMBIGUOUS))
        self.assertFalse(denied.permitted)
        self.assertEqual(denied.reason, AMBIGUOUS)

        blocked = build_active_feed(
            [listing],
            {listing["listing_id"]: denied},
            self.now,
        )
        self.assertEqual(blocked.feed, ())
        self.assertEqual(
            blocked.exclusions,
            (FeedExclusion(listing["listing_id"], AMBIGUOUS),),
        )

        queue = ReviewQueue()
        item_id = queue.enqueue(listing, SourceAssessment(AMBIGUOUS))
        note = "Read the official programme page named in application.url; the form was open."
        resolution = queue.resolve(item_id, "editor-synthetic-01", ACCEPT, note)
        self.assertEqual(resolution.assessment.category, HUMAN_RESOLVED)
        permitted = decide_attempt(resolution.candidate, resolution.assessment)
        self.assertTrue(permitted.permitted)
        self.assertEqual(permitted.reason, HUMAN_RESOLVED)
        self.assertIs(permitted.candidate, resolution.candidate)

        result = build_active_feed(
            [resolution.candidate],
            {resolution.candidate["listing_id"]: permitted},
            self.now,
        )
        self.assertEqual(result.feed, (resolution.candidate,))
        self.assertEqual(result.exclusions, ())
        self.assertEqual(validate_active_feed(resolution.candidate, EVAL), [])
        self.assertEqual(listing, before)

    def test_naive_now_rejected_and_offline(self):
        listing = self.scholarship
        decision = decide_attempt(listing, SourceAssessment(CLEAR))
        keyed = {listing["listing_id"]: decision}
        with self.assertRaises(ValueError):
            build_active_feed([listing], keyed, datetime(2026, 11, 8, 12, 0, 0))

        source = PUBLISH_SOURCE.read_text(encoding="utf-8")
        for banned in (
            "import requests",
            "import urllib",
            "import socket",
            "sqlite",
            "sqlalchemy",
            "redis",
            "Path(",
            "open(",
        ):
            self.assertNotIn(banned, source)
        for sentence in LIMITATIONS:
            self.assertIn(sentence, publish_mod.__doc__)

        real_socket = socket.socket

        def blocked_socket(*_args, **_kwargs):
            raise AssertionError("network")

        socket.socket = blocked_socket
        try:
            result = build_active_feed([listing], keyed, self.now)
            self.assertEqual(result.feed, (listing,))
        finally:
            socket.socket = real_socket


if __name__ == "__main__":
    unittest.main(verbosity=2)
