"use server";

import { parseBrowseFilters } from "../../lib/listings/browse-filters";
import { redirect } from "next/navigation";
import { z } from "zod";
import { alertLink, sendAlertEmail, validAlertSignature } from "../../lib/alerts";
import { staffRpc } from "../../lib/listings/staff-store";

const queryInput = z.object({
  email: z.email().max(254), kind: z.enum(["", "job", "internship", "scholarship"]),
  keyword: z.string().trim().max(200), frequency: z.enum(["daily", "instant"]),
});

export async function subscribe(form: FormData) {
  const secret = process.env.ALERT_SIGNING_SECRET;
  if (!secret || !process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL) redirect("/alerts?status=unavailable");
  if (form.get("website")) redirect("/alerts?status=check-email");
  const result = queryInput.safeParse(Object.fromEntries(form));
  if (!result.success) redirect("/alerts?status=invalid");
  const { email, kind, keyword, frequency } = result.data;
  if (frequency === "instant" && process.env.INSTANT_ALERTS_ENABLED !== "true") redirect("/alerts?status=unavailable");
  const saved = await staffRpc("create_delivery_alert", {
    address: email.toLowerCase(), category: kind, keyword_query: keyword, saved_filters: parseBrowseFilters(Object.fromEntries(form)), delivery: frequency,
  }).then(value => ({ value }), () => null);
  if (!saved) redirect("/alerts?status=unavailable");
  if (typeof saved.value === "string") {
    const confirm = alertLink(secret, "confirm", saved.value);
    const unsubscribe = alertLink(secret, "unsubscribe", saved.value);
    if (!await sendAlertEmail(email, "Confirm your NaijaOpportunities alert", `Confirm your alert:\n${confirm}\n\nCancel this request:\n${unsubscribe}`)) {
      redirect("/alerts?status=unavailable");
    }
  }
  redirect("/alerts?status=check-email");
}

export async function changeSubscription(form: FormData) {
  const secret = process.env.ALERT_SIGNING_SECRET;
  const input = z.object({
    id: z.uuid(), operation: z.enum(["confirm", "unsubscribe"]), signature: z.string(),
  }).safeParse(Object.fromEntries(form));
  if (!secret || !input.success) redirect("/alerts?status=invalid");
  const { id, operation, signature } = input.data;
  if (!validAlertSignature(secret, operation, id, signature)) redirect("/alerts?status=invalid");
  const changed = await staffRpc("change_email_alert", { alert_id: id, operation }).catch(() => null);
  if (changed === null) redirect("/alerts?status=unavailable");
  redirect(operation === "unsubscribe" ? "/alerts?status=unsubscribed" : changed ? "/alerts?status=confirmed" : "/alerts?status=invalid");
}
