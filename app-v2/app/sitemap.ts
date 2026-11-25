import type { MetadataRoute } from "next";
import { listingHref, readPublicListings } from "../lib/listings/public-store";
import { siteUrl } from "../lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/", "/opportunities", "/jobs", "/internships", "/scholarships", "/about", "/contact", "/privacy", "/terms", "/submit"];
  for (let offset = 0; ; offset += 30) {
    const listings = await readPublicListings({ offset, limit: 30 });
    paths.push(...listings.map(listingHref));
    if (listings.length < 30) break;
  }
  return [...new Set(paths)].map(path => ({ url: new URL(path, siteUrl).href }));
}
