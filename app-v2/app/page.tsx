import Image from "next/image";
import Link from "next/link";
import { readPublicListings } from "../lib/listings/public-store";
import { OpportunityCards } from "./opportunity-cards";

export const dynamic = "force-dynamic";

export default async function Home() {
  const listings = await readPublicListings({ limit: 6 }).catch(() => null);

  return (
    <>
      <section className="intro home-intro">
        <div>
          <h1>Find your next opportunity.</h1>
          <p>Scholarships, internships, jobs, and more, right at your doorstep.</p>
          <form action="/opportunities" className="home-search">
            <label htmlFor="home-keyword">Search opportunities</label>
            <div>
              <input id="home-keyword" name="q" placeholder="Try “engineering” or “fully funded”" maxLength={200} />
              <button className="button">Search</button>
            </div>
          </form>
          <Link className="home-browse-link" href="/opportunities">Browse all opportunities <span aria-hidden="true">{"\u2197"}</span></Link>
        </div>
        <div className="home-photo">
          <Image src="/study-hall.webp" alt="" fill sizes="(max-width: 832px) 100vw, 45vw" />
        </div>
      </section>
      <nav className="home-categories" aria-label="Opportunity categories">
        <Link href="/scholarships">Scholarships <span aria-hidden="true">{"\u2197"}</span></Link>
        <Link href="/internships">Internships <span aria-hidden="true">{"\u2197"}</span></Link>
        <Link href="/jobs">Jobs <span aria-hidden="true">{"\u2197"}</span></Link>
      </nav>
      <section className="browse home-listings" aria-labelledby="open-opportunities">
        <h2 id="open-opportunities">Open opportunities</h2>
        {listings === null && <p>Opportunities are temporarily unavailable. Please try again later.</p>}
        {listings?.length === 0 && <p>There are no open opportunities right now.</p>}
        {!!listings?.length && <OpportunityCards listings={listings} heading="h3" />}
      </section>
    </>
  );
}
