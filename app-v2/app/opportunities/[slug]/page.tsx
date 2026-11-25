import { formatFixedDeadline } from "../../../lib/listings/deadline";
import { descriptionBlocks } from "../../../lib/listings/description-blocks";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { readPublicListings } from "../../../lib/listings/public-store";

export const dynamic = "force-dynamic";

const findListing = cache(async (slug: string) => {
  const id = slug.match(/(?:^|-)(lst_[0-9A-HJKMNP-TV-Z]{26})$/);
  if (!id) return null;
  const [listing] = await readPublicListings({ id: id[1], limit: 1 });
  return listing ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const listing = await findListing((await params).slug);
  if (!listing) return { title: "Opportunity unavailable" };
  const description = `${listing.provider.name} | ${listing.summary}`;
  return { title: listing.title, description, openGraph: { title: listing.title, description }, twitter: { card: "summary" as const } };
}

export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const listing = await findListing((await params).slug);
  if (!listing) notFound();
  const { deadline, application, provider, kind } = listing;
  const categories = { job: "Jobs", internship: "Internships", scholarship: "Scholarships" };
  const category = categories[kind];
  const canApply = ["direct_application", "official_programme_page"].includes(application.url_kind);
  const deadlineLabel = deadline.kind === "fixed"
    ? formatFixedDeadline(deadline)
    : deadline.kind === "rolling" ? "Rolling admission" : "Deadline not stated";
  const closesToday = deadline.kind === "fixed" &&
    formatFixedDeadline({ ...deadline, boundary: "inclusive_end_of_local_day" }) ===
    formatFixedDeadline({ ...deadline, boundary: "inclusive_end_of_local_day", fixed_at: new Date().toISOString() });
  const description = listing.description === "See the employer's listing for the job description and application instructions."
    ? null : listing.description;
  const instructions = listing.how_to_apply === "Not stated by the source." ? null : listing.how_to_apply;
  const location = listing.location.locality ?? listing.summary.match(/^Location listed by the employer: (.+)$/)?.[1];

  return (
    <article className="listing-detail">
      <Link className="listing-back" href={`/${category.toLowerCase()}`}>← Browse {category.toLowerCase()}</Link>
      <header className="listing-hero">
        <p className="listing-category">{category}</p>
        <h1>{listing.title}</h1>
        <p className="listing-provider">{provider.name}{location && <span>{location}</span>}</p>
      </header>

      <div className="listing-layout">
        <aside className="listing-apply">
          <h2>Application</h2>
          {listing.verification.last_success_at && <p>Checked against the official source on{" "}
            <time dateTime={listing.verification.last_success_at}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(new Date(listing.verification.last_success_at))}</time>
          </p>}
          <dl><dt>Deadline</dt><dd>
            {deadline.kind === "fixed" ? (
              <><time dateTime={deadline.fixed_at}>{deadlineLabel}</time>
                {deadline.boundary === "inclusive_end_of_local_day" && ` (${deadline.resolved_timezone})`}
                {closesToday && " · Closes today"}</>
            ) : deadlineLabel}
          </dd></dl>
          <a className="button listing-apply-link" href={application.url}>
            {canApply ? (kind === "job" ? "Apply on the employer site" : "Apply on the official site") : "View source listing"}
            <span aria-hidden="true">↗</span>
          </a>
          {listing.source.url !== application.url && <a href={listing.source.url}>View original listing</a>}
        </aside>
        <div className="listing-content">
          <section>
            <h2>{kind === "job" ? "About the role" : "About this opportunity"}</h2>
            <div className="listing-description">
              {description ? descriptionBlocks(description).map((block, index) => {
                switch (block.kind) {
                  case "heading": return <h3 key={index}>{block.text}</h3>;
                  case "list": return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>;
                  case "paragraph": return <p key={index}>{block.text}</p>;
                }
              }) : <p>Read the full description on the source listing.</p>}
            </div>
          </section>
          {listing.eligibility.criteria_text && <section><h2>Eligibility</h2><p>{listing.eligibility.criteria_text}</p></section>}
          {listing.documents_required.length > 0 && (
            <section><h2>Documents</h2><ul>{listing.documents_required.map(document => <li key={document}>{document}</li>)}</ul></section>
          )}
          {instructions && <section><h2>How to apply</h2><p>{instructions}</p></section>}
        </div>
      </div>
    </article>
  );
}
