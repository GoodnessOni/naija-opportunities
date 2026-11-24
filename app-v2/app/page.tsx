import Link from "next/link";
import { readPublicListings } from "../lib/listings/public-store";
import { OpportunityCards } from "./opportunity-cards";

export const dynamic = "force-dynamic";

export default async function Home() {
  const listings = await readPublicListings({ limit: 6 }).catch(() => null);

  return (
    <>
      <section className="intro">
        <h1>Find your next opportunity.</h1>
        <p>Scholarships, internships, jobs, and more, right at your doorstep.</p>
        <Link className="button" href="/opportunities">Browse opportunities</Link>
      </section>
      <section className="browse" aria-labelledby="open-opportunities">
        <h2 id="open-opportunities">Open opportunities</h2>
        {listings === null && <p>Opportunities are temporarily unavailable. Please try again later.</p>}
        {listings?.length === 0 && <p>There are no open opportunities right now.</p>}
        {!!listings?.length && <OpportunityCards listings={listings} heading="h3" />}
      </section>
    </>
  );
}
