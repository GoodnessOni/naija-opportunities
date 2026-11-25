import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { alertLink, sendAlertEmail } from "../../../../lib/alerts";
import { listingHref } from "../../../../lib/listings/public-store";
import { listingSchema } from "../../../../lib/listings/schema";
import { staffRpc } from "../../../../lib/listings/staff-store";
import { siteUrl } from "../../../../lib/site-url";

const digest = z.array(z.object({ id: z.uuid(), email: z.email(), matches: z.array(listingSchema) }));

export async function GET(request: Request) {
  const { CRON_SECRET, ALERT_SIGNING_SECRET, RESEND_API_KEY, CONTACT_FROM_EMAIL } = process.env;
  const header = request.headers.get("authorization") ?? "";
  const expected = CRON_SECRET ? Buffer.from(`Bearer ${CRON_SECRET}`) : null;
  const actual = Buffer.from(header);
  if (!expected || expected.length !== actual.length || !timingSafeEqual(expected, actual)) return new Response(null, { status: 401 });
  if (!ALERT_SIGNING_SECRET || !RESEND_API_KEY || !CONTACT_FROM_EMAIL) return new Response(null, { status: 503 });

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 86400000);
  const data = await staffRpc("email_alert_digest", { window_start: start.toISOString(), window_end: end.toISOString() }).catch(() => null);
  const parsed = digest.safeParse(data);
  if (!parsed.success) return new Response(null, { status: 503 });
  let sent = 0;
  for (const row of parsed.data) {
    const links = row.matches.map(listing => `${listing.title}\n${new URL(listingHref(listing), siteUrl).href}`).join("\n\n");
    const unsubscribe = alertLink(ALERT_SIGNING_SECRET, "unsubscribe", row.id);
    const delivered = await sendAlertEmail(row.email, "New opportunities from NaijaOpportunities",
      `${links}\n\nUnsubscribe: ${unsubscribe}`, `digest/${end.toISOString().slice(0, 10)}/${row.id}`);
    if (delivered) sent++;
  }
  return Response.json({ sent, failed: parsed.data.length - sent }, { status: sent === parsed.data.length ? 200 : 502 });
}
