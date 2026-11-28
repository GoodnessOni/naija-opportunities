import { revertCitizenship } from "../lib/listings/citizenship.ts";
import { listingSchema } from "../lib/listings/schema.ts";

// One-off, reviewed undo of a wrong automated citizenship decision. Needs migration 019.
// Default is a dry run: prints the listing and what would change. --apply writes.
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const [listingId, reviewer, reason] = args.filter(arg => arg !== "--apply");
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key || !/^lst_[0-9A-HJKMNP-TV-Z]{26}$/.test(listingId ?? "") || !reviewer || !reason?.trim()) {
  console.error('Usage: node scripts/revert-citizenship.mjs <listing_id> <reviewer_id> "<reason>" [--apply]');
  process.exit(1);
}

async function rpc(name, body) {
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
    method: "POST",
    headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${name} failed with ${response.status}`);
  return response.json();
}

const [row] = await rpc("partner_listings", { evaluated_at: new Date().toISOString(), after_id: null, selected_id: listingId, page_limit: 1 });
if (!row?.record) {
  console.error(`Listing not on the active feed (${row?.reason ?? "not found"}).`);
  process.exit(1);
}
const record = listingSchema.parse(row.record);
const updated = revertCitizenship(record, new Date());
const summary = { listing_id: listingId, title: record.title, from: record.eligibility.citizenship, to: updated.eligibility.citizenship, revision: `${record.revision} -> ${updated.revision}` };
if (!apply) {
  console.log(JSON.stringify({ mode: "dry_run", ...summary }, null, 2));
} else {
  const saved = await rpc("revert_citizenship_automation", { prior_revision: record.revision, updated_record: updated, reviewer, reason: reason.trim() });
  console.log(JSON.stringify({ mode: "apply", saved: saved === true, ...summary }, null, 2));
  if (saved !== true) process.exitCode = 1;
}
