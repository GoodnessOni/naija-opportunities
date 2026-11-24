import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { listingSchema } from "./schema";

export const partnerListingId = z.string().regex(/^lst_[0-9A-HJKMNP-TV-Z]{26}$/);
const time = z.iso.datetime();
const cursorSchema = z.strictObject({ id: partnerListingId, time });

export function authorizedPartner(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const digests = (process.env.FEED_API_KEY_HASHES ?? "").split(",").filter(key => /^[a-f0-9]{64}$/.test(key));
  const supplied = createHash("sha256").update(header.slice(7)).digest();
  return digests.some(digest => timingSafeEqual(supplied, Buffer.from(digest, "hex")));
}

export function parseFeedQuery(params: URLSearchParams) {
  const limit = Number(params.get("page_size") ?? "25");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("Invalid page size");
  const cursorText = params.get("cursor");
  const suppliedTime = params.get("evaluation_time");
  if (cursorText && cursorText.length > 256) throw new RangeError("Invalid cursor");
  const cursor = cursorText
    ? cursorSchema.parse(JSON.parse(Buffer.from(cursorText, "base64url").toString("utf8")))
    : null;
  const evaluatedAt = time.parse(suppliedTime ?? cursor?.time ?? new Date().toISOString());
  if ((cursor && evaluatedAt !== cursor.time) || Date.parse(evaluatedAt) > Date.now()) {
    throw new RangeError("Invalid evaluation time");
  }
  return { limit, evaluatedAt, afterId: cursor?.id ?? null };
}

export function encodeCursor(id: string, evaluatedAt: string) {
  return Buffer.from(JSON.stringify({ id, time: evaluatedAt })).toString("base64url");
}

const rows = z.array(z.strictObject({
  listing_id: partnerListingId,
  record: listingSchema.nullable(),
  reason: z.string().nullable(),
}));

export async function readPartnerListings(evaluatedAt: string, limit: number, afterId: string | null, selectedId: string | null = null) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing partner feed configuration");
  const response = await fetch(new URL("/rest/v1/rpc/partner_listings", url), {
    method: "POST", cache: "no-store",
    headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: JSON.stringify({ evaluated_at: evaluatedAt, after_id: afterId, selected_id: selectedId, page_limit: limit }),
  });
  if (!response.ok) throw new Error("Partner feed unavailable");
  return rows.parse(await response.json());
}
