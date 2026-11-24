import Link from "next/link";
import { listingHref } from "../lib/listings/public-store";
import type { Listing } from "../lib/listings/schema";

const kinds = { job: "Job", internship: "Internship", scholarship: "Scholarship" };

export function OpportunityCards({ listings, heading: Heading }: {
  listings: Listing[];
  heading: "h2" | "h3";
}) {
  return (
    <ul className="opportunity-grid">
      {listings.map(listing => (
        <li key={listing.listing_id}>
          <Link className="opportunity-card" data-kind={listing.kind} href={listingHref(listing)}>
            <div className="opportunity-meta">
              <span>{kinds[listing.kind]}</span>
              <span>{listing.provider.name}</span>
            </div>
            <Heading>{listing.title}</Heading>
            <p>{listing.summary}</p>
            <span className="opportunity-action">View details <span aria-hidden="true">↗</span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
