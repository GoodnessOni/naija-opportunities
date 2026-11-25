import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default function Contact() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <section className="browse">
      <h1>Contact</h1>
      {email
        ? <p>For corrections or questions about NaijaOpportunities, email <a href={`mailto:${email}`}>{email}</a>. Include the listing link if your message is about a specific opportunity.</p>
        : <p>The contact inbox is currently unavailable.</p>}
      <p>For questions about an application, contact the provider through the official listing.</p>
      <Link href="/submit">Submit an opportunity</Link>
    </section>
  );
}
