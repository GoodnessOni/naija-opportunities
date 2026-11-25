/** Link to the PathSync listing page for "See if you qualify". Server-side env var, no secret. */
export const PATHSYNC_PRODUCTION_URL = "https://pathsync-ai.naijaopportunities.live";
export const PATHSYNC_DEV_URL = "http://localhost:3000";

const LISTING_ID = /^lst_[0-9A-HJKMNP-TV-Z]{26}$/;

export function pathSyncListingUrl(
  listingId: string,
  base: string | undefined = process.env.PATHSYNC_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string | null {
  if (!LISTING_ID.test(listingId)) return null;
  const root = (base?.trim() || (nodeEnv === "production" ? PATHSYNC_PRODUCTION_URL : PATHSYNC_DEV_URL)).replace(/\/+$/, "");
  return `${root}/listings/${encodeURIComponent(listingId)}`;
}
