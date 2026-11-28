import Link from "next/link";
import { listingHref, readPublicListings } from "../lib/listings/public-store";
import { OpportunityCards } from "./opportunity-cards";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [listings, closing] = await Promise.all([
    readPublicListings({ limit: 6 }).catch(() => null),
    readPublicListings({ limit: 24, offset: 0, browse: { deadline_type: "fixed", closes_within: 30 } }).catch(() => null),
  ]);
  const closingSoon = (closing ?? [])
    .flatMap(listing => listing.deadline.kind === "fixed" ? [{ listing, at: listing.deadline.fixed_at }] : [])
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 4);
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });

  return (
    <>
      <section className="intro home-intro">
        <div>
          <h1>Verified opportunities for Nigerian students.</h1>
          <p>Scholarships, internships and jobs, each checked against the official source before it is listed.</p>
          <form action="/opportunities" className="home-search">
            <label htmlFor="home-keyword">Search opportunities</label>
            <div>
              <input id="home-keyword" name="q" placeholder="Try “engineering” or “fully funded”" maxLength={200} />
              <button className="button">Search</button>
            </div>
          </form>
          <Link className="home-browse-link" href="/opportunities">Browse all opportunities <span aria-hidden="true">{"\u2197"}</span></Link>
        </div>
        <section className="home-closing" aria-labelledby="closing-soon">
          <h2 id="closing-soon">Closing soon</h2>
          {closingSoon.length ? <ol>
            {closingSoon.map(({ listing, at }) => <li key={listing.listing_id}>
              <Link href={listingHref(listing)}>
                <time dateTime={at}>{day.format(new Date(at))}</time>
                <span>{listing.title}</span>
              </Link>
            </li>)}
          </ol> : <p>{closing === null ? "Deadlines are unavailable right now." : "No listed deadlines in the next 30 days."}</p>}
          <Link className="home-closing-more" href="/opportunities?closes_within=30">All deadlines in the next 30 days</Link>
        </section>
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
