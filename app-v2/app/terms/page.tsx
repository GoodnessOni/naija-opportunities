import Link from "next/link";

export const metadata = { title: "Terms" };

export default function Terms() {
  return <article className="browse">
    <h1>Terms of use</h1>
    <p>NaijaOpportunities is an OGverse directory of scholarships, internships and jobs. Providers set their own eligibility rules, deadlines and application procedures. Check the official application page before applying.</p>
    <h2>Submitting a listing</h2>
    <p>Submit accurate information you have permission to share and include the official source. Listings are reviewed before publication. We may update or remove listings when their details change or their source can no longer be verified.</p>
    <h2>Corrections</h2>
    <p>Report inaccurate details through the <Link href="/contact">contact page</Link> and include the listing link.</p>
  </article>;
}
