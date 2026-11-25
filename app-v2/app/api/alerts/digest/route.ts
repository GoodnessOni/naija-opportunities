import { isCronRequest } from "../../../../lib/cron-auth";
import { z } from "zod";
import { alertLink, sendAlertEmail } from "../../../../lib/alerts";
import { listingHref } from "../../../../lib/listings/public-store";
import { listingSchema } from "../../../../lib/listings/schema";
import { staffRpc } from "../../../../lib/listings/staff-store";
import { siteUrl } from "../../../../lib/site-url";

const digest = z.array(z.object({ id: z.uuid(), email: z.email(), matches: z.array(listingSchema) }));

export async function GET(request: Request) {
  const { ALERT_SIGNING_SECRET, RESEND_API_KEY, CONTACT_FROM_EMAIL } = process.env;
  if (!isCronRequest(request)) return new Response(null, { status: 401 });
  if (!ALERT_SIGNING_SECRET || !RESEND_API_KEY || !CONTACT_FROM_EMAIL) return new Response(null, { status: 503 });

  const instant = new URL(request.url).searchParams.get("delivery") === "instant";
  if (instant && process.env.INSTANT_ALERTS_ENABLED !== "true") return new Response(null, { status: 503 });
  const end = new Date();
  if (!instant) end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (instant ? 15 * 60000 : 86400000));
  const data = await staffRpc("email_alert_matches", {
    window_start: start.toISOString(), window_end: end.toISOString(), delivery: instant ? "instant" : "daily",
  }).catch(() => null);
  const parsed = digest.safeParse(data);
  if (!parsed.success) return new Response(null, { status: 503 });
  let sent = 0;
  let failed = 0;
  for (const row of parsed.data) {
    const batches = instant ? row.matches.map(listing => [listing]) : [row.matches];
    const unsubscribe = alertLink(ALERT_SIGNING_SECRET, "unsubscribe", row.id);
    for (const batch of batches) {
      const links = batch.map(listing => `${listing.title}\n${new URL(listingHref(listing), siteUrl).href}`).join("\n\n");
      const key = instant ? `instant/${row.id}/${batch[0].listing_id}` : `digest/${end.toISOString().slice(0, 10)}/${row.id}`;
      const delivered = await sendAlertEmail(row.email, "New opportunities from NaijaOpportunities",
        `${links}\n\nUnsubscribe: ${unsubscribe}`, key);
      if (delivered) sent++;
      else failed++;
    }
  }
  return Response.json({ sent, failed }, { status: failed ? 502 : 200 });
}
