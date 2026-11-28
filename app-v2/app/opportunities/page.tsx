import { browseFilterLabel, browseFilterLabels, browseFilterOptions, parseBrowseFilters } from "../../lib/listings/browse-filters";
import Link from "next/link";
import { readPublicListings } from "../../lib/listings/public-store";

import { OpportunityCards } from "../opportunity-cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse opportunities" };

export default async function Browse({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const kind = params.kind === "job" || params.kind === "internship" || params.kind === "scholarship" ? params.kind : undefined;
  const pageSize = 30;
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 1000 ? requestedPage : 1;
  const offset = (page - 1) * pageSize;
  const selected = parseBrowseFilters(params);
  const location = selected.location_query ?? "";
  const records = await readPublicListings({
    kind, query, limit: pageSize + 1, offset,
    browse: {
      provider_type: selected.provider_type || undefined,
      work_arrangement: selected.work_arrangement || undefined,
      deadline_type: selected.deadline_type || undefined,
      closes_within: selected.closes_within ? Number(selected.closes_within) : undefined,
      location_query: location || undefined,
    },
  });
  const results = records.slice(0, pageSize);
  const hasNext = records.length > pageSize && page < 1000;

  function pageHref(nextPage: number) {
    const url = new URLSearchParams();
    if (query) url.set("q", query);
    if (kind) url.set("kind", kind);
    for (const [key, value] of Object.entries(selected)) if (value) url.set(key, value);
    if (location) url.set("location_query", location);
    if (nextPage > 1) url.set("page", String(nextPage));
    return url.size ? `/opportunities?${url}` : "/opportunities";
  }

  return (
    <section className="browse browse-directory">
      <h1>Browse opportunities</h1>
      <form action="/opportunities" className="search-form directory-filters">
        <div><label htmlFor="q">Keyword</label><input id="q" name="q" defaultValue={query} maxLength={200} /></div>
        <div><label htmlFor="kind">Opportunity type</label><select id="kind" name="kind" defaultValue={kind ?? ""}>
          <option value="">All opportunities</option><option value="scholarship">Scholarships</option>
          <option value="internship">Internships</option><option value="job">Jobs</option>
        </select></div>
        <div><label htmlFor="location_query">Country or locality</label><input id="location_query" name="location_query" defaultValue={location} maxLength={100} /></div>
        {Object.entries(browseFilterOptions).map(([key, options]) => {
          const name = key as keyof typeof browseFilterOptions;
          return <div key={key}><label htmlFor={key}>{browseFilterLabels[name]}</label>
            <select id={key} name={key} defaultValue={selected[name] ?? ""}>
              <option value="">Any</option>
              {options.map(option => <option key={option} value={option}>{browseFilterLabel(key, option)}</option>)}
            </select>
          </div>;
        })}
        <button className="button">Search</button>
      </form>
      <p>{results.length ? `Showing ${offset + 1} to ${offset + results.length}` : "0 results"}</p>
      {results.length === 0 && <p>No open opportunities match these filters. <Link href="/opportunities">Clear filters</Link>.</p>}
      <Link href={`/alerts?${new URLSearchParams({ q: query, kind: kind ?? "", ...selected })}`}>Get email alerts for this search</Link>
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
