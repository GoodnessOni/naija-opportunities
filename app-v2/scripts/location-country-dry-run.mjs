import { countryFromLocation, employerLocation } from "../lib/listings/location-country.ts";

// Read-only. Reports how location.country would change on live listings whose summary holds the
// Greenhouse employer location. Writes nothing. To re-sync after approval, rerun
// scripts/import-greenhouse.mjs <board> "<employer>" --refresh-only, which builds each record with the
// new country and saves it through refresh_verified_greenhouse_job (revision + 1, new content_hash).
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) {
  console.error("Usage: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then node scripts/location-country-dry-run.mjs");
  process.exit(1);
}

async function page(after) {
  const response = await fetch(new URL("/rest/v1/rpc/partner_listings", url), {
    method: "POST",
    headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: JSON.stringify({ evaluated_at: new Date().toISOString(), after_id: after, selected_id: null, page_limit: 100 }),
  });
  if (!response.ok) throw new Error(`partner_listings failed with ${response.status}`);
  return response.json();
}

const records = [];
for (let after = null; ;) {
  const rows = await page(after);
  records.push(...rows.map(row => row.record));
  if (rows.length < 100) break;
  after = rows.at(-1).listing_id;
}

const counts = { total: records.length, no_employer_location: 0, unchanged: 0, would_change: 0, to: {} };
const changes = [];
for (const record of records) {
  const location = employerLocation(record.summary);
  if (!location) { counts.no_employer_location++; continue; }
  const next = countryFromLocation(location);
  if (next === record.location.country) { counts.unchanged++; continue; }
  counts.would_change++;
  counts.to[next] = (counts.to[next] ?? 0) + 1;
  changes.push({ listing_id: record.listing_id, provider: record.provider.name, location, from: record.location.country, to: next });
}
console.log(JSON.stringify({ mode: "dry_run", counts, changes }, null, 2));
