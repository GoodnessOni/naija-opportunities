import { z } from "zod";
import { FRESHNESS_MS } from "./active-feed";
import { listingSchema, type Listing } from "./schema";

const note = z.string().trim().min(1).max(1000);
export const reviewInput = z.discriminatedUnion("outcome", [
  z.strictObject({
    outcome: z.literal("confirmed_open"),
    evidence: z.strictObject({ open: note, deadline: note, eligibility: note, application: note }),
  }),
  z.strictObject({
    outcome: z.enum(["confirmed_closed", "ambiguous", "failed"]),
    evidence: z.strictObject({ note }),
  }),
]);

export function applyStaffReview(record: Listing, review: z.infer<typeof reviewInput>, reviewerId: string, clock: Date) {
  const at = clock.toISOString();
  const updated = structuredClone(record);
  if (record.synthetic || record.lifecycle.publication_status === "withdrawn") {
    throw new RangeError("Listing cannot be reviewed");
  }
  updated.revision++;
  updated.timestamps.updated_at = at;
  updated.verification.last_attempt_at = at;
  updated.verification.last_attempt_outcome = review.outcome;

  if (review.outcome === "ambiguous" || review.outcome === "failed") return listingSchema.parse(updated);
  if (record.source.kind !== "official") throw new RangeError("An official source is required");
  if (review.outcome === "confirmed_open" && record.deadline.kind === "fixed"
      && clock.getTime() > Date.parse(record.deadline.fixed_at)) {
    throw new RangeError("The fixed deadline has already passed");
  }

  Object.assign(updated.verification, {
    state: "verified", outcome: review.outcome, method: "human_review", reviewed_by: "human",
    reviewer_id: reviewerId, source_checked_url: record.source.url,
    last_success_at: at, fresh_until: new Date(clock.getTime() + FRESHNESS_MS).toISOString(),
  });

  if (review.outcome === "confirmed_open") {
    updated.lifecycle = { publication_status: "published", status: "open", closed_reason: null };
    updated.timestamps.published_at ??= at;
    updated.timestamps.closed_at = null;
    updated.timestamps.expired_at = null;
  } else {
    updated.lifecycle.status = "closed";
    updated.lifecycle.closed_reason = "provider_closed";
    updated.timestamps.closed_at = at;
  }

  return listingSchema.parse(updated);
}
