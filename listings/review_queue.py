"""Offline in-memory queue for ambiguous verification attempts.

Only ``SourceAssessment`` category ``ambiguous`` may be enqueued. Resolution
is a staff decision recorded here: ``accept`` yields ``human_resolved`` for
``decide_attempt``; ``reject`` yields ``failed``. The queue does not fetch
sources, authenticate callers, authorise reviewers, persist state, or publish.

Trusted callers are NaijaOpportunities' own server-side pipeline and signed-in
staff reviewers. Students, the public API, and listing data never supply an
assessment.

Explicit limitations, also stored as ``LIMITATIONS``:

- Reviewer authorisation is not implemented. reviewer_id is an opaque slug recorded on resolve; it is not an allow-list and does not prove a person is authorised staff.
- Storage is not implemented. The queue holds state only in process memory and is lost when the process ends.
- Publication is not implemented. Resolving an item does not write a listing feed or call decide_attempt.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from datetime import datetime, timezone

from listings.validator import (
    SLUG_RE,
    _evidence_is_http_status_alone,
    content_hash,
    dedupe_key,
    jcs_bytes,
    sha256_hex,
)
from listings.verification_gate import (
    AMBIGUOUS,
    FAILED,
    HUMAN_RESOLVED,
    SourceAssessment,
)

ACCEPT = "accept"
REJECT = "reject"
DECISIONS = frozenset({ACCEPT, REJECT})

PENDING = "pending"
RESOLVED = "resolved"

LIMITATIONS = (
    "Reviewer authorisation is not implemented. reviewer_id is an opaque slug recorded on resolve; it is not an allow-list and does not prove a person is authorised staff.",
    "Storage is not implemented. The queue holds state only in process memory and is lost when the process ends.",
    "Publication is not implemented. Resolving an item does not write a listing feed or call decide_attempt.",
)


class ReviewQueueError(ValueError):
    """Invalid enqueue or resolve input, or an unknown / already-resolved item."""


@dataclass(frozen=True)
class ReviewItem:
    """One queued attempt. ``candidate`` is a deep copy of the enqueued object."""

    item_id: str
    candidate: dict
    assessment: SourceAssessment
    status: str
    enqueued_at: datetime
    reviewer_id: str | None = None
    decision: str | None = None
    note: str | None = None
    resolved_at: datetime | None = None


@dataclass(frozen=True)
class ResolutionResult:
    """Outcome of ``resolve``. ``candidate`` is set on accept for ``decide_attempt``."""

    item_id: str
    decision: str
    reviewer_id: str
    note: str
    resolved_at: datetime
    assessment: SourceAssessment
    candidate: dict | None = None


def _utc_now():
    return datetime.now(timezone.utc)


def _require_ambiguous(assessment):
    if assessment is None:
        raise ReviewQueueError("assessment_missing")
    if not isinstance(assessment, SourceAssessment):
        raise ReviewQueueError("assessment_type")
    if not isinstance(assessment.category, str):
        raise ReviewQueueError("category_type")
    if assessment.category != AMBIGUOUS:
        raise ReviewQueueError("assessment_not_ambiguous")


def _attempt_id(candidate, assessment):
    digest = sha256_hex(jcs_bytes(candidate) + b"\0" + assessment.category.encode("utf-8"))
    return f"review-{digest}"


def _validate_note(note):
    if not isinstance(note, str) or not note.strip():
        raise ReviewQueueError("note_required")
    if _evidence_is_http_status_alone(note.strip()):
        raise ReviewQueueError("note_http_status_alone")


def _validate_reviewer(reviewer_id):
    if not isinstance(reviewer_id, str):
        raise ReviewQueueError("reviewer_id_type")
    if not (1 <= len(reviewer_id) <= 64) or SLUG_RE.fullmatch(reviewer_id) is None:
        raise ReviewQueueError("reviewer_id_invalid")


def _human_candidate(candidate, reviewer_id, note):
    listing = copy.deepcopy(candidate)
    verification = listing.get("verification")
    if not isinstance(verification, dict):
        verification = {}
        listing["verification"] = verification
    verification["method"] = "human_review"
    verification["reviewed_by"] = "human"
    verification["reviewer_id"] = reviewer_id
    verification["evidence"] = note
    listing["dedupe_key"] = dedupe_key(listing)
    listing["content_hash"] = content_hash(listing)
    return listing


class ReviewQueue:
    """In-memory FIFO of ambiguous attempts awaiting staff accept or reject."""

    def __init__(self):
        self._items: dict[str, ReviewItem] = {}
        self._order: list[str] = []

    def enqueue(self, candidate, assessment):
        """Queue an ambiguous attempt. Same attempt returns the same item id."""
        if not isinstance(candidate, dict):
            raise ReviewQueueError("candidate_type")
        _require_ambiguous(assessment)
        item_id = _attempt_id(candidate, assessment)
        existing = self._items.get(item_id)
        if existing is not None:
            return existing.item_id
        item = ReviewItem(
            item_id=item_id,
            candidate=copy.deepcopy(candidate),
            assessment=SourceAssessment(AMBIGUOUS),
            status=PENDING,
            enqueued_at=_utc_now(),
        )
        self._items[item_id] = item
        self._order.append(item_id)
        return item_id

    def list_pending(self):
        """Pending items, oldest first."""
        pending = []
        for item_id in self._order:
            item = self._items[item_id]
            if item.status == PENDING:
                pending.append(item)
        return pending

    def resolve(self, item_id, reviewer_id, decision, note):
        """Accept or reject a pending item. Records reviewer_id and UTC time."""
        if not isinstance(item_id, str) or item_id not in self._items:
            raise ReviewQueueError("unknown_item")
        item = self._items[item_id]
        if item.status != PENDING:
            raise ReviewQueueError("already_resolved")
        _validate_reviewer(reviewer_id)
        if decision not in DECISIONS:
            raise ReviewQueueError("decision_invalid")
        _validate_note(note)

        resolved_at = _utc_now()
        self._items[item_id] = ReviewItem(
            item_id=item.item_id,
            candidate=item.candidate,
            assessment=item.assessment,
            status=RESOLVED,
            enqueued_at=item.enqueued_at,
            reviewer_id=reviewer_id,
            decision=decision,
            note=note,
            resolved_at=resolved_at,
        )

        if decision == ACCEPT:
            candidate = _human_candidate(item.candidate, reviewer_id, note)
            return ResolutionResult(
                item_id=item_id,
                decision=ACCEPT,
                reviewer_id=reviewer_id,
                note=note,
                resolved_at=resolved_at,
                assessment=SourceAssessment(HUMAN_RESOLVED),
                candidate=candidate,
            )
        return ResolutionResult(
            item_id=item_id,
            decision=REJECT,
            reviewer_id=reviewer_id,
            note=note,
            resolved_at=resolved_at,
            assessment=SourceAssessment(FAILED),
            candidate=None,
        )


__all__ = [
    "ACCEPT",
    "DECISIONS",
    "LIMITATIONS",
    "PENDING",
    "REJECT",
    "RESOLVED",
    "ResolutionResult",
    "ReviewItem",
    "ReviewQueue",
    "ReviewQueueError",
]
