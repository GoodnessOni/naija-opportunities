import { authorizedPartner, encodeCursor, parseFeedQuery, readPartnerListings } from "../../../../../lib/listings/partner-feed";

export async function GET(request: Request) {
  if (!authorizedPartner(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  let query;
  try {
    query = parseFeedQuery(new URL(request.url).searchParams);
  } catch {
    return Response.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const rows = await readPartnerListings(query.evaluatedAt, query.limit + 1, query.afterId);
    const page = rows.slice(0, query.limit);
    return Response.json({
      evaluation_time: query.evaluatedAt,
      listings: page.map(row => row.record),
      cursor: rows.length > query.limit ? encodeCursor(page[page.length - 1].listing_id, query.evaluatedAt) : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "feed_unavailable" }, { status: 503 });
  }
}
