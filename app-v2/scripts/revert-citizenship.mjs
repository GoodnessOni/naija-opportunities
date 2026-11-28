import { parseRevertArgs, revertCitizenship } from "../lib/listings/citizenship.ts";
import { listingSchema } from "../lib/listings/schema.ts";

// One-off, reviewed undo of a wrong automated citizenship decision. Needs migrations 019 and 020.
// Reads any non-synthetic, non-withdrawn listing by id (not only the active feed).
// Default is a dry run: prints the listing and what would change. --apply writes.
// Sets process.exitCode instead of calling process.exit, so open fetch handles close cleanly on Windows.
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;

async function rpc(name, body) {
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
    method: "POST",
    headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${name} failed with ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const args = parseRevertArgs(process.argv.slice(2));
  if (!url || !key || !args) {
    console.error('Usage: node scripts/revert-citizenship.mjs <listing_id> <reviewer_id> "<reason>" [--apply]');
    return 1;
  }
  const found = await rpc("citizenship_listing", { target_id: args.listingId });
  if (!found) {
    console.error("Listing not found, synthetic or withdrawn.");
    return 1;
  }
  const record = listingSchema.parse(found);
  const updated = revertCitizenship(record, new Date());
  const summary = {
    listing_id: args.listingId, title: record.title, from: record.eligibility.citizenship,
    to: updated.eligibility.citizenship, revision: `${record.revision} -> ${updated.revision}`,
  };
  if (!args.apply) {
    console.log(JSON.stringify({ mode: "dry_run", ...summary }, null, 2));
    return 0;
  }
  const saved = await rpc("revert_citizenship_automation", {
    prior_revision: record.revision, updated_record: updated, reviewer: args.reviewer, reason: args.reason,
  });
  console.log(JSON.stringify({ mode: "apply", saved: saved === true, ...summary }, null, 2));
  return saved === true ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
