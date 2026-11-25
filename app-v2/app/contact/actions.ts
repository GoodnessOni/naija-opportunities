"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

const contactInput = z.object({
  email: z.email().max(254),
  message: z.string().trim().min(10).max(2000),
});

export async function sendContact(formData: FormData) {
  const { CONTACT_EMAIL, CONTACT_FROM_EMAIL, RESEND_API_KEY } = process.env;
  if (!CONTACT_EMAIL || !CONTACT_FROM_EMAIL || !RESEND_API_KEY) redirect("/contact?status=unavailable");
  if (formData.get("website")) redirect("/contact?status=sent");

  const submission = contactInput.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!submission.success) redirect("/contact?status=invalid");

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: CONTACT_FROM_EMAIL,
      to: [CONTACT_EMAIL],
      reply_to: submission.data.email,
      subject: "NaijaOpportunities contact",
      text: submission.data.message,
    }),
    signal: AbortSignal.timeout(10000),
  }).then(response => response.ok, () => false);

  redirect(sent ? "/contact?status=sent" : "/contact?status=failed");
}
