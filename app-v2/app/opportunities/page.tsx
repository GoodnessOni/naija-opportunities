import Link from "next/link";
import { listingHref, readPublicListings } from "../../lib/listings/public-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse opportunities" };

export default async function Browse({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const kind = params.kind === "job" || params.kind === "internship" || params.kind === "scholarship" ? params.kind : undefined;
  const results = await readPublicListings({ kind, query });

  return (
    <section className="browse">
      <h1>Browse opportunities</h1>
      <form action="/opportunities" className="search-form">
        <div><label htmlFor="q">Keyword</label><input id="q" name="q" defaultValue={query} maxLength={200} /></div>
        <div><label htmlFor="kind">Opportunity type</label><select id="kind" name="kind" defaultValue={kind ?? ""}>
          <option value="">All opportunities</option><option value="scholarship">Scholarships</option>
          <option value="internship">Internships</option><option value="job">Jobs</option>
        </select></div>
        <button className="button">Search</button>
      </form>
      <p>{results.length === 30 ? "Showing the first 30 results" : `${results.length} results`}</p>
      {results.length === 0 && <p>No open opportunities match these filters. <Link href="/opportunities">Clear filters</Link>.</p>}
      <ul className="listing-list">
        {results.map(listing => <li key={listing.listing_id}>
          <h2><Link href={listingHref(listing)}>{listing.title}</Link></h2>
          <p>{listing.provider.name}{listing.location.locality && ` · ${listing.location.locality}`}</p>
          <p>{listing.summary}</p>
        </li>)}
      </ul>
    </section>
  );
}
