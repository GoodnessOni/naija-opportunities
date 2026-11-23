import { authorizedPartner, partnerListingId, readPartnerListings } from "../../../../../lib/listings/partner-feed";

export async function GET(request: Request, { params }: { params: Promise<{ listing_id: string }> }) {
  if (!authorizedPartner(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = partnerListingId.safeParse((await params).listing_id);
  if (!id.success) return Response.json({ error: "not_found" }, { status: 404 });

  try {
    const evaluationTime = new Date().toISOString();
    const [row] = await readPartnerListings(evaluationTime, 1, null, id.data);
    if (!row?.record) return Response.json({ error: row?.reason ?? "not_found" }, { status: 404 });
    return Response.json({ evaluation_time: evaluationTime, listing: row.record }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "feed_unavailable" }, { status: 503 });
  }
}
