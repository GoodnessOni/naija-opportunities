/**
 * The visitor's own Interested and Applied records in shared.opportunity_activity (shared with PathSync).
 * Applied is reported by the visitor; nothing is ever submitted for them. Opening a provider link is never recorded.
 */
export type ActivityStatus = "interested" | "applied";
export type ActivityAction = "interested" | "applied" | "not_applied" | "remove";

export type ActivityWrite =
  | { kind: "upsert"; row: { user_id: string; listing_id: string; status: ActivityStatus; applied_at: string | null }; keepExisting: boolean }
  | { kind: "delete"; user_id: string; listing_id: string }
  | { kind: "error"; message: string };

const LISTING_ID = /^lst_[0-9A-HJKMNP-TV-Z]{26}$/;
export const APPLIED_CONFIRMATION = "I sent my application on the provider’s page myself.";

export function planActivityWrite(input: {
  action: string; listingId: string; userId: string; confirmed: boolean; now: Date;
}): ActivityWrite {
  const { action, listingId, userId, confirmed, now } = input;
  if (!userId) return { kind: "error", message: "Sign in to save opportunities." };
  if (!LISTING_ID.test(listingId)) return { kind: "error", message: "This listing could not be found." };
  switch (action) {
    case "interested":
      // Insert only. A retry, or an existing Applied record, is left as it is.
      return { kind: "upsert", row: { user_id: userId, listing_id: listingId, status: "interested", applied_at: null }, keepExisting: true };
    case "applied":
      if (!confirmed) return { kind: "error", message: "Tick the box to confirm you applied on the provider’s page." };
      return { kind: "upsert", row: { user_id: userId, listing_id: listingId, status: "applied", applied_at: now.toISOString() }, keepExisting: false };
    case "not_applied":
      return { kind: "upsert", row: { user_id: userId, listing_id: listingId, status: "interested", applied_at: null }, keepExisting: false };
    case "remove":
      return { kind: "delete", user_id: userId, listing_id: listingId };
    default:
      return { kind: "error", message: "Unknown action." };
  }
}
