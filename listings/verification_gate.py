"""Decide whether one proposed verification attempt may establish or renew success.

The rules are the pinned ``ogverse.listings`` 1.0.0 contract, sections 5, 13,
14, and 18, at ``b50440dc738d86ff3070386d8709b8faf2bc5982``. The function is
pure, deterministic, and offline. It does not read a clock, a network, a
previous listing, or the evidence text.

``assessment`` is a typed value from the producer caller. It is not a listing
field and not a user attestation. Clear and human-resolved are never inferred
from evidence wording, from ``validate_record`` succeeding, or from
``method`` ``human_review``.

Check order:

1. A missing, unknown, or wrong-type candidate or assessment is an internal
   input error. That result is not a contract error and is not stored.
2. Ambiguous, inaccessible, changed, conflicting, and unresolved assessments
   are review. A failed assessment is rejected. The candidate is not returned.
3. Clear requires the pinned automation metadata. Human-resolved requires
   human method, human attribution, an opaque reviewer id, and the same
   pinned attempt bundle.
4. This attempt must itself be a successful confirmation in the pinned
   vocabulary. An older ``last_success_at`` does not renew success when the
   latest attempt is failed, inconclusive, or otherwise not that confirmation.
5. ``validate_record`` must pass. Active eligibility is not this check.

A permitted decision returns the same candidate object and does not rewrite
freshness. Every other decision returns no candidate.

Explicit limitations, also stored as ``LIMITATIONS``:

- Caller trust is not implemented. A SourceAssessment is a typed value supplied by the producer caller. This function does not authenticate that caller.
- Source inspection is not implemented. This function does not fetch a URL, open a page, or decide whether evidence text is clear.
- Reviewer authorisation is not implemented. reviewer_id is checked as an opaque slug. It is not an allow-list and it does not prove a person acted.
- No queue, storage, previous-record policy, revocation, or publication integration. Permission for this attempt to succeed is not active-feed or publication permission. Active eligibility is validate_active_feed at an explicit evaluation time.
"""

from __future__ import annotations

from dataclasses import dataclass

from listings.validator import OUTCOMES, SLUG_RE, parse_utc, validate_record

CONTRACT_PIN = "b50440dc738d86ff3070386d8709b8faf2bc5982"

CLEAR = "clear"
AMBIGUOUS = "ambiguous"
INACCESSIBLE = "inaccessible"
CHANGED = "changed"
CONFLICTING = "conflicting"
UNRESOLVED = "unresolved"
FAILED = "failed"
HUMAN_RESOLVED = "human_resolved"

PERMIT = "permit"
REVIEW = "review"
REJECT = "reject"
INPUT_ERROR = "input_error"

REVIEW_CATEGORIES = frozenset(
    {AMBIGUOUS, INACCESSIBLE, CHANGED, CONFLICTING, UNRESOLVED}
)
SUCCESS_CATEGORIES = frozenset({CLEAR, HUMAN_RESOLVED})
CATEGORIES = REVIEW_CATEGORIES | SUCCESS_CATEGORIES | frozenset({FAILED})

INPUT_REASONS = frozenset(
    {
        "candidate_type",
        "assessment_missing",
        "assessment_type",
        "category_type",
        "category_unknown",
    }
)
REJECT_REASONS = frozenset(
    {"failed", "metadata", "attempt_not_successful", "record_invalid"}
)
REASONS = INPUT_REASONS | REVIEW_CATEGORIES | REJECT_REASONS | SUCCESS_CATEGORIES

LIMITATIONS = (
    "Caller trust is not implemented. A SourceAssessment is a typed value supplied by the producer caller. This function does not authenticate that caller.",
    "Source inspection is not implemented. This function does not fetch a URL, open a page, or decide whether evidence text is clear.",
    "Reviewer authorisation is not implemented. reviewer_id is checked as an opaque slug. It is not an allow-list and it does not prove a person acted.",
    "No queue, storage, previous-record policy, revocation, or publication integration. Permission for this attempt to succeed is not active-feed or publication permission. Active eligibility is validate_active_feed at an explicit evaluation time.",
)

# Fields that must already be strings on a clear or human-resolved attempt.
# reviewer_id is null for automation and a slug for a human, so it is checked
# with the path rather than as a shared string.
_BUNDLE_FIELDS = (
    "method",
    "reviewed_by",
    "source_checked_url",
    "evidence",
    "last_attempt_at",
    "last_attempt_outcome",
)


@dataclass(frozen=True)
class SourceAssessment:
    """Internal caller assessment. Not persisted on the listing."""

    category: object


@dataclass(frozen=True)
class AttemptDecision:
    """Internal result. Not a listing state and not a contract error.

    ``candidate`` is the input object when this attempt may establish or
    renew success, and None for every blocked outcome. ``record_errors``
    carries ``validate_record`` output only when the record was checked
    and failed. Those dicts are copies.
    """

    permitted: bool
    disposition: str
    reason: str
    candidate: dict | None = None
    record_errors: tuple = ()


def _closed(disposition, reason, record_errors=()):
    return AttemptDecision(
        permitted=False,
        disposition=disposition,
        reason=reason,
        candidate=None,
        record_errors=tuple(record_errors),
    )


def _copy_errors(errors):
    return tuple({key: value for key, value in error.items()} for error in errors)


def _verification(candidate):
    verification = candidate.get("verification")
    if isinstance(verification, dict):
        return verification
    return None


def _metadata_ok(category, verification):
    """Path attribution plus the pinned attempt bundle, without reading evidence."""
    if verification is None:
        return False
    for field in _BUNDLE_FIELDS:
        if not isinstance(verification.get(field), str):
            return False
    method = verification.get("method")
    reviewed = verification.get("reviewed_by")
    reviewer = verification.get("reviewer_id")
    if category == CLEAR:
        return method == "automated_review" and reviewed == "automation" and reviewer is None
    if category == HUMAN_RESOLVED:
        return (
            method == "human_review"
            and reviewed == "human"
            and isinstance(reviewer, str)
            and 1 <= len(reviewer) <= 64
            and SLUG_RE.fullmatch(reviewer) is not None
        )
    return False


def _attempt_succeeds(verification):
    """True only when this latest attempt is a pinned successful confirmation.

    A later failed or inconclusive attempt can keep an older success on the
    record. That older success is not this attempt, so it does not qualify.
    The exact 168-hour gap is left to ``validate_record``.
    """
    if verification is None:
        return False
    outcome = verification.get("outcome")
    if verification.get("state") != "verified" or outcome not in OUTCOMES:
        return False
    if verification.get("last_attempt_outcome") != outcome:
        return False
    attempt_at = verification.get("last_attempt_at")
    success_at = verification.get("last_success_at")
    fresh = verification.get("fresh_until")
    if parse_utc(attempt_at) is None or parse_utc(success_at) is None or parse_utc(fresh) is None:
        return False
    return attempt_at == success_at


def decide_attempt(candidate, assessment):
    """Decide this attempt. Do not mutate ``candidate`` or ``assessment``."""
    if not isinstance(candidate, dict):
        return _closed(INPUT_ERROR, "candidate_type")
    if assessment is None:
        return _closed(INPUT_ERROR, "assessment_missing")
    if not isinstance(assessment, SourceAssessment):
        return _closed(INPUT_ERROR, "assessment_type")
    category = assessment.category
    if not isinstance(category, str):
        return _closed(INPUT_ERROR, "category_type")
    if category not in CATEGORIES:
        return _closed(INPUT_ERROR, "category_unknown")
    if category in REVIEW_CATEGORIES:
        return _closed(REVIEW, category)
    if category == FAILED:
        return _closed(REJECT, FAILED)
    if category not in SUCCESS_CATEGORIES:
        return _closed(INPUT_ERROR, "category_unknown")

    verification = _verification(candidate)
    if not _metadata_ok(category, verification):
        return _closed(REJECT, "metadata")
    if not _attempt_succeeds(verification):
        return _closed(REJECT, "attempt_not_successful")
    errors = validate_record(candidate)
    if errors:
        return _closed(REJECT, "record_invalid", _copy_errors(errors))
    return AttemptDecision(
        permitted=True,
        disposition=PERMIT,
        reason=category,
        candidate=candidate,
        record_errors=(),
    )


__all__ = [
    "AMBIGUOUS",
    "CATEGORIES",
    "CHANGED",
    "CLEAR",
    "CONFLICTING",
    "CONTRACT_PIN",
    "FAILED",
    "HUMAN_RESOLVED",
    "INACCESSIBLE",
    "INPUT_ERROR",
    "LIMITATIONS",
    "PERMIT",
    "REASONS",
    "REJECT",
    "REVIEW",
    "UNRESOLVED",
    "AttemptDecision",
    "SourceAssessment",
    "decide_attempt",
]
