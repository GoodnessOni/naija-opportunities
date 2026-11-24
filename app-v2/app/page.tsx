import Link from "next/link";
import { listingHref, readPublicListings } from "../lib/listings/public-store";

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
        {!!listings?.length && (
          <ul className="listing-list">
            {listings.map(listing => (
              <li key={listing.listing_id}>
                <h3><Link href={listingHref(listing)}>{listing.title}</Link></h3>
                <p>{listing.provider.name}</p>
                <p>{listing.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
