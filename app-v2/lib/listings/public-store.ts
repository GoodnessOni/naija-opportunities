import { listingSchema, type Listing } from "./schema";

export async function readPublicListings(filters: { kind?: Listing["kind"]; id?: string; query?: string; limit?: number; offset?: number; browse?: { provider_type?: string; location_query?: string; work_arrangement?: string; deadline_type?: string; closes_within?: number } } = {}) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = process.env;
  if (!url || !key) {
    if (process.env.VERCEL_ENV === "production") throw new Error("Missing public listings configuration");
    return [];
  }

  const paginated = filters.offset !== undefined;
  const rpc = filters.browse ? "filter_active_listings" : paginated ? "browse_active_listings" : "active_listings";
  const response = await fetch(new URL(`/rest/v1/rpc/${rpc}`, url), {
    method: "POST",
    cache: "no-store",
    headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: JSON.stringify({
      selected_kind: filters.kind ?? null,
      ...(paginated ? { page_offset: filters.offset } : { selected_id: filters.id ?? null }),
      search_text: filters.query ?? null, page_limit: filters.limit ?? 30,
      ...filters.browse,
    }),
  });
  if (!response.ok) throw new Error("The listing service could not be reached");
  const result = listingSchema.array().safeParse(await response.json());
  if (!result.success) throw new Error("The listing service returned invalid records");
  return result.data;
}

export function listingHref({ title, listing_id }: Pick<Listing, "title" | "listing_id">) {
  const slug = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
  return `/opportunities/${slug || "listing"}-${listing_id}`;
}
