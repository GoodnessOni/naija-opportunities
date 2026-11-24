import { FRESHNESS_MS } from "./active-feed.ts";
import { listingSchema, type Listing } from "./schema.ts";

export function verifyGreenhouseListing(
  draft: Listing,
  board: string,
  jobId: number,
  clock: Date,
): Listing {
  const source = new URL(draft.source.url);
  if (
    !["https://job-boards.greenhouse.io", "https://boards.greenhouse.io", "https://job-boards.eu.greenhouse.io"].includes(source.origin) ||
    source.pathname !== `/${board}/jobs/${jobId}` ||
    draft.identity.round_evidence !== `greenhouse:${board}:${jobId}`
  ) return draft;

  const at = clock.toISOString();
  return listingSchema.parse({
    ...draft,
    application: { ...draft.application, url_kind: "official_programme_page" },
    lifecycle: { publication_status: "published", status: "open", closed_reason: null },
    verification: {
      state: "verified",
      outcome: "confirmed_open",
      method: "automated_review",
      reviewed_by: "automation",
      reviewer_id: null,
      source_checked_url: `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
      last_success_at: at,
      fresh_until: new Date(clock.getTime() + FRESHNESS_MS).toISOString(),
      last_attempt_at: at,
      last_attempt_outcome: "confirmed_open",
    },
    timestamps: { ...draft.timestamps, published_at: at },
  });
}
