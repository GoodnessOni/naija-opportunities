"""Offline in-memory human-review queue for ambiguous verification attempts.

| Rule | Test |
| --- | --- |
| enqueue only ambiguous | test_enqueue_rejects_non_ambiguous |
| stable id, no duplicate | test_enqueue_deduplicates_same_attempt |
| pending oldest first | test_list_pending_oldest_first |
| resolve accept / reject | test_resolve_accept_and_reject_rules |
| end-to-end with decide_attempt | test_accept_then_decide_attempt, test_reject_stays_denied |
"""

from __future__ import annotations

import copy
import json
import socket
import sys
import unittest
from datetime import timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from listings.review_queue import (  # noqa: E402
    ACCEPT,
    LIMITATIONS,
    REJECT,
    ResolutionResult,
    ReviewItem,
    ReviewQueue,
    ReviewQueueError,
)
from listings.verification_gate import (  # noqa: E402
    AMBIGUOUS,
    CHANGED,
    CLEAR,
    FAILED,
    HUMAN_RESOLVED,
    INACCESSIBLE,
    PERMIT,
    REJECT as GATE_REJECT,
    REVIEW,
    SourceAssessment,
    UNRESOLVED,
    decide_attempt,
)
import listings.review_queue as queue_mod  # noqa: E402

FIXTURES = REPO / "listings" / "reference" / "pathsync-ai" / "docs" / "listings" / "fixtures"
QUEUE_SOURCE = REPO / "listings" / "review_queue.py"


def load_name(name):
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


class ReviewQueueTest(unittest.TestCase):
    def setUp(self):
        self.queue = ReviewQueue()
        self.listing = load_name("valid-scholarship")

    def test_enqueue_rejects_non_ambiguous(self):
        before = copy.deepcopy(self.listing)
        for bad in (
            None,
            "ambiguous",
            {"category": AMBIGUOUS},
            SourceAssessment(None),
            SourceAssessment(1),
            SourceAssessment(CLEAR),
            SourceAssessment(HUMAN_RESOLVED),
            SourceAssessment(FAILED),
            SourceAssessment(CHANGED),
            SourceAssessment(INACCESSIBLE),
            SourceAssessment(UNRESOLVED),
            SourceAssessment("AMBIGUOUS"),
        ):
            with self.assertRaises(ReviewQueueError):
                self.queue.enqueue(self.listing, bad)
        with self.assertRaises(ReviewQueueError):
            self.queue.enqueue(None, SourceAssessment(AMBIGUOUS))
        with self.assertRaises(ReviewQueueError):
            self.queue.enqueue("{}", SourceAssessment(AMBIGUOUS))
        with self.assertRaises(ReviewQueueError):
            self.queue.enqueue([], SourceAssessment(AMBIGUOUS))
        self.assertEqual(self.queue.list_pending(), [])
        self.assertEqual(self.listing, before)

    def test_enqueue_deduplicates_same_attempt(self):
        assessment = SourceAssessment(AMBIGUOUS)
        first = self.queue.enqueue(self.listing, assessment)
        self.assertIsInstance(first, str)
        self.assertTrue(first)
        second = self.queue.enqueue(copy.deepcopy(self.listing), SourceAssessment(AMBIGUOUS))
        self.assertEqual(first, second)
        pending = self.queue.list_pending()
        self.assertEqual(len(pending), 1)
        self.assertEqual(pending[0].item_id, first)
        self.assertIsInstance(pending[0], ReviewItem)
        self.assertEqual(pending[0].assessment, SourceAssessment(AMBIGUOUS))
        self.assertEqual(pending[0].candidate, self.listing)
        self.assertIsNot(pending[0].candidate, self.listing)

        other = load_name("valid-internship")
        other_id = self.queue.enqueue(other, SourceAssessment(AMBIGUOUS))
        self.assertNotEqual(other_id, first)
        self.assertEqual(len(self.queue.list_pending()), 2)

    def test_list_pending_oldest_first(self):
        a = self.queue.enqueue(load_name("valid-scholarship"), SourceAssessment(AMBIGUOUS))
        b = self.queue.enqueue(load_name("valid-internship"), SourceAssessment(AMBIGUOUS))
        c = self.queue.enqueue(load_name("valid-job"), SourceAssessment(AMBIGUOUS))
        ids = [item.item_id for item in self.queue.list_pending()]
        self.assertEqual(ids, [a, b, c])
        self.queue.resolve(
            b,
            "editor-synthetic-01",
            ACCEPT,
            "Read the official programme page; the form was open.",
        )
        ids = [item.item_id for item in self.queue.list_pending()]
        self.assertEqual(ids, [a, c])

    def test_resolve_accept_and_reject_rules(self):
        item_id = self.queue.enqueue(self.listing, SourceAssessment(AMBIGUOUS))
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve("missing-id", "editor-synthetic-01", ACCEPT, "Read the page.")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "", ACCEPT, "Read the page.")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "Editor", ACCEPT, "Read the page.")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, None, ACCEPT, "Read the page.")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "editor-synthetic-01", "permit", "Read the page.")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "editor-synthetic-01", ACCEPT, "")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "editor-synthetic-01", ACCEPT, "   ")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "editor-synthetic-01", ACCEPT, "HTTP/1.1 200 OK")
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "editor-synthetic-01", ACCEPT, "200 OK")

        note = "Read the official scholarship page; applications were still open."
        result = self.queue.resolve(item_id, "editor-synthetic-01", ACCEPT, note)
        self.assertIsInstance(result, ResolutionResult)
        self.assertEqual(result.decision, ACCEPT)
        self.assertEqual(result.reviewer_id, "editor-synthetic-01")
        self.assertEqual(result.note, note)
        self.assertEqual(result.assessment, SourceAssessment(HUMAN_RESOLVED))
        self.assertIsNotNone(result.candidate)
        self.assertEqual(result.candidate["verification"]["method"], "human_review")
        self.assertEqual(result.candidate["verification"]["reviewed_by"], "human")
        self.assertEqual(result.candidate["verification"]["reviewer_id"], "editor-synthetic-01")
        self.assertEqual(result.candidate["verification"]["evidence"], note)
        self.assertIsNotNone(result.resolved_at.tzinfo)
        self.assertEqual(result.resolved_at.utcoffset(), timezone.utc.utcoffset(result.resolved_at))
        self.assertEqual(self.queue.list_pending(), [])
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(item_id, "editor-synthetic-01", REJECT, note)

        reject_id = self.queue.enqueue(load_name("valid-internship"), SourceAssessment(AMBIGUOUS))
        rejected = self.queue.resolve(
            reject_id,
            "editor-synthetic-02",
            REJECT,
            "Read the internship page; the role was already closed.",
        )
        self.assertEqual(rejected.decision, REJECT)
        self.assertEqual(rejected.assessment, SourceAssessment(FAILED))
        self.assertIsNone(rejected.candidate)
        self.assertEqual(rejected.reviewer_id, "editor-synthetic-02")
        self.assertIsNotNone(rejected.resolved_at.tzinfo)
        with self.assertRaises(ReviewQueueError):
            self.queue.resolve(
                reject_id,
                "editor-synthetic-02",
                ACCEPT,
                "Read the internship page; the role was already closed.",
            )

    def test_accept_then_decide_attempt(self):
        listing = load_name("valid-scholarship")
        before = copy.deepcopy(listing)
        denied = decide_attempt(listing, SourceAssessment(AMBIGUOUS))
        self.assertFalse(denied.permitted)
        self.assertEqual(denied.disposition, REVIEW)
        self.assertEqual(denied.reason, AMBIGUOUS)

        item_id = self.queue.enqueue(listing, SourceAssessment(AMBIGUOUS))
        note = "Read the official programme page named in application.url; the form was open."
        resolution = self.queue.resolve(item_id, "editor-synthetic-01", ACCEPT, note)
        self.assertEqual(resolution.assessment.category, HUMAN_RESOLVED)
        permitted = decide_attempt(resolution.candidate, resolution.assessment)
        self.assertTrue(permitted.permitted)
        self.assertEqual(permitted.disposition, PERMIT)
        self.assertEqual(permitted.reason, HUMAN_RESOLVED)
        self.assertIs(permitted.candidate, resolution.candidate)
        self.assertEqual(listing, before)

    def test_reject_stays_denied(self):
        listing = load_name("valid-job")
        denied = decide_attempt(listing, SourceAssessment(AMBIGUOUS))
        self.assertEqual(denied.disposition, REVIEW)
        item_id = self.queue.enqueue(listing, SourceAssessment(AMBIGUOUS))
        resolution = self.queue.resolve(
            item_id,
            "editor-synthetic-01",
            REJECT,
            "Read the employer careers page; the posting was removed.",
        )
        self.assertEqual(resolution.assessment, SourceAssessment(FAILED))
        after = decide_attempt(listing, resolution.assessment)
        self.assertFalse(after.permitted)
        self.assertEqual(after.disposition, GATE_REJECT)
        self.assertEqual(after.reason, FAILED)
        still = decide_attempt(listing, SourceAssessment(AMBIGUOUS))
        self.assertEqual(still.disposition, REVIEW)

    def test_offline_and_limitations(self):
        source = QUEUE_SOURCE.read_text(encoding="utf-8")
        for banned in (
            "import requests",
            "import urllib",
            "import socket",
            "sqlite",
            "sqlalchemy",
            "redis",
        ):
            self.assertNotIn(banned, source)
        for sentence in LIMITATIONS:
            self.assertIn(sentence, queue_mod.__doc__)
        self.assertEqual(len(LIMITATIONS), 3)
        self.assertIn("authorisation", LIMITATIONS[0])
        self.assertIn("Storage", LIMITATIONS[1])
        self.assertIn("Publication", LIMITATIONS[2])

        real_socket = socket.socket

        def blocked_socket(*_args, **_kwargs):
            raise AssertionError("network")

        socket.socket = blocked_socket
        try:
            item_id = self.queue.enqueue(self.listing, SourceAssessment(AMBIGUOUS))
            result = self.queue.resolve(
                item_id,
                "editor-synthetic-01",
                ACCEPT,
                "Read the official page; the form remained open.",
            )
            self.assertEqual(result.assessment.category, HUMAN_RESOLVED)
        finally:
            socket.socket = real_socket


if __name__ == "__main__":
    unittest.main(verbosity=2)
