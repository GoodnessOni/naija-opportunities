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
  const description = `${listing.provider.name} · ${listing.summary}`;
  return { title: listing.title, description, openGraph: { title: listing.title, description }, twitter: { card: "summary" as const } };
}

export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const listing = await findListing((await params).slug);
  if (!listing) notFound();
  const { deadline, application } = listing;
  const label = ["direct_application", "official_programme_page"].includes(application.url_kind) ? "Apply" : "Source page";
  const deadlineLabel = deadline.kind === "fixed"
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: deadline.resolved_timezone }).format(new Date(deadline.fixed_at))
    : deadline.kind === "rolling" ? "Rolling admission" : "Deadline not stated";

  return (
    <article className="browse detail">
      <p>{listing.provider.name}</p>
      <h1>{listing.title}</h1>
      <p>{deadlineLabel}{deadline.kind === "fixed" && ` (${deadline.resolved_timezone})`}</p>
      <p>{listing.description}</p>
      <h2>Eligibility</h2>
      <p>{listing.eligibility.criteria_text ?? "Eligibility was not stated by the source."}</p>
      <h2>Documents</h2>
      {listing.documents_required.length
        ? <ul>{listing.documents_required.map(document => <li key={document}>{document}</li>)}</ul>
        : <p>No documents were stated by the source.</p>}
      <h2>How to apply</h2>
      <p>{listing.how_to_apply}</p>
      <a className={label === "Apply" ? "button" : "button-outline"} href={application.url}>{label}</a>
    </article>
  );
}
