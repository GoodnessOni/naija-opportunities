import type { Listing } from "./schema";

export type QueueState = "all" | "draft" | "due" | "inconclusive" | "needs_official_url";
export type QueueOwner = "all" | "mine" | "unassigned";
export type QueueFilters = { kind: "all" | Listing["kind"]; state: QueueState; owner: QueueOwner };

const OFFICIAL_LINKS = ["direct_application", "official_programme_page"];

/** A listing cannot be published as verified until staff have an official application or programme page. */
export function needsOfficialUrl(listing: Listing) {
  return !OFFICIAL_LINKS.includes(listing.application.url_kind) || listing.source.kind !== "official";
}

export function queueState(listing: Listing): Exclude<QueueState, "all" | "needs_official_url"> {
  if (listing.lifecycle.publication_status === "draft") return "draft";
  const last = listing.verification.last_attempt_outcome;
  if (last === "ambiguous" || last === "failed") return "inconclusive";
  return "due";
}

export function filterQueue(listings: Listing[], filters: QueueFilters, assignments: Record<string, string>, me: string) {
  return listings.filter(listing => {
    if (filters.kind !== "all" && listing.kind !== filters.kind) return false;
    if (filters.state === "needs_official_url" ? !needsOfficialUrl(listing)
      : filters.state !== "all" && queueState(listing) !== filters.state) return false;
    const owner = assignments[listing.listing_id];
    if (filters.owner === "mine" && owner !== me) return false;
    if (filters.owner === "unassigned" && owner) return false;
    return true;
  });
}
