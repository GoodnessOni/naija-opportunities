import Link from "next/link";
import { readPublicListings } from "../../lib/listings/public-store";

import { OpportunityCards } from "../opportunity-cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse opportunities" };

export default async function Browse({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; page?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const kind = params.kind === "job" || params.kind === "internship" || params.kind === "scholarship" ? params.kind : undefined;
  const pageSize = 30;
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 1000 ? requestedPage : 1;
  const offset = (page - 1) * pageSize;
  const records = await readPublicListings({ kind, query, limit: pageSize + 1, offset });
  const results = records.slice(0, pageSize);
  const hasNext = records.length > pageSize && page < 1000;

  function pageHref(nextPage: number) {
    const url = new URLSearchParams();
    if (query) url.set("q", query);
    if (kind) url.set("kind", kind);
    if (nextPage > 1) url.set("page", String(nextPage));
    return url.size ? `/opportunities?${url}` : "/opportunities";
  }

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
      <p>{results.length ? `Showing ${offset + 1}–${offset + results.length}` : "0 results"}</p>
      {results.length === 0 && <p>No open opportunities match these filters. <Link href="/opportunities">Clear filters</Link>.</p>}
      <OpportunityCards listings={results} heading="h2" />
      {(page > 1 || hasNext) && (
        <nav aria-label="Results pages" className="results-pagination">
          {page > 1 && <Link href={pageHref(page - 1)} rel="prev">Previous page</Link>}
          <span>Page {page}</span>
          {hasNext && <Link href={pageHref(page + 1)} rel="next">Next page</Link>}
        </nav>
      )}
    </section>
  );
}
