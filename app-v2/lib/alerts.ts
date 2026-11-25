import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./site-url";

export function alertSignature(secret: string, operation: string, id: string) {
  return createHmac("sha256", secret).update(`${operation}:${id}`).digest("hex");
}

export function validAlertSignature(secret: string, operation: string, id: string, signature: string) {
  return /^[a-f0-9]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(alertSignature(secret, operation, id), "hex"));
}

export function alertLink(secret: string, operation: "confirm" | "unsubscribe", id: string) {
  const url = new URL("/alerts", siteUrl);
  url.search = new URLSearchParams({ operation, id, signature: alertSignature(secret, operation, id) }).toString();
  return url.href;
}

export async function sendAlertEmail(to: string, subject: string, text: string, idempotencyKey?: string) {
  const { RESEND_API_KEY, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_FROM_EMAIL) return false;
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: CONTACT_FROM_EMAIL, to: [to], subject, text }),
    signal: AbortSignal.timeout(10000),
  }).then(response => response.ok, () => false);
}
