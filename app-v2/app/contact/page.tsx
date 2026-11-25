import Link from "next/link";
import { sendContact } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { CONTACT_EMAIL, CONTACT_FROM_EMAIL, RESEND_API_KEY } = process.env;
  const messages: Record<string, string> = {
    sent: "Your message was sent.",
    invalid: "Enter a valid email address and a message between 10 and 2,000 characters.",
    failed: "Your message could not be sent. Please try again.",
    unavailable: "The contact form is currently unavailable.",
  };
  return (
    <section className="browse">
      <h1>Contact</h1>
      <p>For a correction, include the listing link and explain what needs updating.</p>
      {status && Object.hasOwn(messages, status) && <p role="status">{messages[status]}</p>}
      {CONTACT_EMAIL && CONTACT_FROM_EMAIL && RESEND_API_KEY ? (
        <form action={sendContact} className="review-form">
          <label>Your email <input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
          <label>Message <textarea name="message" required minLength={10} maxLength={2000} /></label>
          <div hidden><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <button type="submit" className="button">Send message</button>
        </form>
      ) : CONTACT_EMAIL
        ? <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        : <p>The contact inbox is currently unavailable.</p>}
      <p>For questions about an application, contact the provider through the official listing.</p>
      <Link href="/submit">Submit an opportunity</Link>
    </section>
  );
}
