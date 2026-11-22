import { listingSchema, type Listing } from "./schema";

export async function readPublicListings(filters: { kind?: Listing["kind"]; id?: string; query?: string; limit?: number } = {}) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = process.env;
  if (!url || !key) {
    if (process.env.VERCEL_ENV === "production") throw new Error("Missing public listings configuration");
    return [];
  }

  const response = await fetch(new URL("/rest/v1/rpc/active_listings", url), {
    method: "POST",
    cache: "no-store",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      selected_kind: filters.kind ?? null, selected_id: filters.id ?? null,
      search_text: filters.query ?? null, page_limit: filters.limit ?? 30,
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
