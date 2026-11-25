import Link from "next/link";

export const metadata = { title: "About" };

export default function About() {
  return (
    <section className="browse">
      <h1>About NaijaOpportunities</h1>
      <p>Find scholarships, internships, and jobs in Nigeria and abroad.</p>
      <p>We check listings against official sources and link to the provider so you can apply directly.</p>
      <p>Open listings appear while their verification is current and their stated deadline has not passed.</p>
      <Link href="/opportunities">Browse opportunities</Link>
    </section>
  );
}
