"""Build the active feed PathSync will read from gated verification decisions.

Offline and pure: no network, no database, no file writes, no wall clock.
Callers pass ``now`` explicitly. Inclusion reuses ``AttemptDecision`` from
``listings.verification_gate`` and the seven-day window already encoded on
the listing as ``verification.fresh_until`` (exactly 168 hours after
``last_success_at``). Automated and human successes use that same window.

A record is included only when:

1. its latest decision ``permitted`` is true,
2. ``now`` is still inside the seven-day window (equality with
   ``fresh_until`` remains active; the next second is stale), and
3. a fixed deadline has not passed (``now`` greater than
   ``deadline.fixed_at``).

Ambiguous, failed, missing, or stale decisions, and expired deadlines,
exclude the record with a reason. Every included row is checked with
``validate_active_feed``; any failure raises. Decisions are keyed by
``listing_id``, matching how a permitted gate result already points at
the candidate via ``AttemptDecision.candidate``.

Explicit limitations, also stored as ``LIMITATIONS``:

- Caller trust is not implemented. Decisions and records are supplied by the producer caller.
- Storage and sync are not implemented. This function does not write a feed file or call a network API.
- Decision history is not implemented. The caller supplies the latest AttemptDecision per listing_id.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from listings.validator import parse_utc, validate_active_feed
from listings.verification_gate import AttemptDecision

CONTRACT_PIN = "b50440dc738d86ff3070386d8709b8faf2bc5982"

MISSING = "missing"
STALE = "stale"
EXPIRED_DEADLINE = "expired_deadline"

LIMITATIONS = (
    "Caller trust is not implemented. Decisions and records are supplied by the producer caller.",
    "Storage and sync are not implemented. This function does not write a feed file or call a network API.",
    "Decision history is not implemented. The caller supplies the latest AttemptDecision per listing_id.",
)


class ActiveFeedError(ValueError):
    """The built feed failed ``validate_active_feed``."""


@dataclass(frozen=True)
class FeedExclusion:
    """One record left out of the active feed, with the exclusion reason."""

    listing_id: str
    reason: str


@dataclass(frozen=True)
class ActiveFeedResult:
    """Included listings plus the per-record exclusion list."""

    feed: tuple
    exclusions: tuple


def _require_aware(now):
    if not isinstance(now, datetime):
        raise ValueError("now_type")
    if now.tzinfo is None:
        raise ValueError("now_naive")
    # Contract timestamps have no fractional seconds. Floor to the UTC second.
    return now.astimezone(timezone.utc).replace(microsecond=0)


def _format_evaluation_time(now_utc):
    return now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def _aware_utc(value):
    parsed = parse_utc(value)
    if parsed is None:
        return None
    return parsed.replace(tzinfo=timezone.utc)


def _listing_id(record):
    if not isinstance(record, dict):
        return None
    listing_id = record.get("listing_id")
    if isinstance(listing_id, str) and listing_id:
        return listing_id
    return None


def _decision_for(listing_id, decisions):
    if listing_id is None or not isinstance(decisions, dict):
        return None
    decision = decisions.get(listing_id)
    if decision is None:
        return None
    if not isinstance(decision, AttemptDecision):
        return None
    return decision


def _is_stale(record, now_utc):
    """True when now is past fresh_until. Equality stays active."""
    verification = record.get("verification")
    if not isinstance(verification, dict):
        return True
    fresh = _aware_utc(verification.get("fresh_until"))
    if fresh is None:
        return True
    return now_utc > fresh


def _is_expired(record, now_utc):
    """True when a fixed deadline has passed. Equality stays open."""
    deadline = record.get("deadline")
    if not isinstance(deadline, dict):
        return False
    if deadline.get("kind") != "fixed":
        return False
    fixed = _aware_utc(deadline.get("fixed_at"))
    if fixed is None:
        return False
    return now_utc > fixed


def _included_record(record, decision):
    """Prefer the gate-linked candidate when the decision permitted it."""
    if decision.candidate is not None:
        return decision.candidate
    return record


def build_active_feed(records, decisions, now):
    """Return the active feed and exclusions for ``now``.

    ``records`` is an iterable of listing objects. ``decisions`` maps each
    ``listing_id`` to its latest ``AttemptDecision``. ``now`` must be
    timezone-aware.
    """
    now_utc = _require_aware(now)
    evaluation_time = _format_evaluation_time(now_utc)
    if not isinstance(decisions, dict):
        raise ValueError("decisions_type")

    feed = []
    exclusions = []

    if not isinstance(records, (list, tuple)):
        raise ValueError("records_type")

    for record in records:
        listing_id = _listing_id(record)
        if listing_id is None:
            raise ValueError("listing_id_missing")
        decision = _decision_for(listing_id, decisions)
        if decision is None:
            exclusions.append(FeedExclusion(listing_id=listing_id, reason=MISSING))
            continue
        if not decision.permitted:
            exclusions.append(FeedExclusion(listing_id=listing_id, reason=decision.reason))
            continue
        candidate = _included_record(record, decision)
        if _is_stale(candidate, now_utc):
            exclusions.append(FeedExclusion(listing_id=listing_id, reason=STALE))
            continue
        if _is_expired(candidate, now_utc):
            exclusions.append(
                FeedExclusion(listing_id=listing_id, reason=EXPIRED_DEADLINE)
            )
            continue
        feed.append(candidate)

    for listing in feed:
        errors = validate_active_feed(listing, evaluation_time)
        if errors:
            raise ActiveFeedError(
                f"validate_active_feed failed for {listing.get('listing_id')}: {errors}"
            )

    return ActiveFeedResult(feed=tuple(feed), exclusions=tuple(exclusions))


__all__ = [
    "CONTRACT_PIN",
    "EXPIRED_DEADLINE",
    "LIMITATIONS",
    "MISSING",
    "STALE",
    "ActiveFeedError",
    "ActiveFeedResult",
    "FeedExclusion",
    "build_active_feed",
]
