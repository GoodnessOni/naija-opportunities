import { applyCitizenship, extractCitizenship } from "../lib/listings/citizenship.ts";
import { listingSchema } from "../lib/listings/schema.ts";

// Rule-based citizenship fill-in. No language model.
// Dry run (default): reads the live active feed and prints counts. Writes nothing.
// --apply: needs migration 018. Writes clear matches as automated decisions; unclear ones are left for staff.
const apply = process.argv.includes("--apply");
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) {
  console.error("Usage: node --env-file=.env.local scripts/fill-citizenship.mjs [--apply]");
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

async function activeFeed() {
  const records = [];
  let after = null;
  for (;;) {
    const rows = await rpc("partner_listings", { evaluated_at: new Date().toISOString(), after_id: after, selected_id: null, page_limit: 100 });
    records.push(...rows.map(row => row.record));
    if (rows.length < 100) return records;
    after = rows.at(-1).listing_id;
  }
}

const records = (apply ? await rpc("citizenship_candidates", {}) : await activeFeed()).map(value => listingSchema.parse(value));
const counts = { total: records.length, already_set: 0, NG: 0, unconstrained: 0, other_explicit: 0, unclear: 0, no_rule: 0 };
const unclear = [];
let written = 0;
for (const record of records) {
  if (record.eligibility.citizenship.requirement !== "unknown") { counts.already_set++; continue; }
  const result = extractCitizenship(record);
  if (result.status === "none") { counts.no_rule++; continue; }
  if (result.status === "unclear") {
    counts.unclear++;
    unclear.push({ listing_id: record.listing_id, title: record.title, reason: result.reason, evidence: result.evidence });
    continue;
  }
  const { countries } = result.citizenship;
  if (countries[0] === "*") counts.unconstrained++;
  else if (countries.length === 1 && countries[0] === "NG") counts.NG++;
  else counts.other_explicit++;
  if (apply) {
    const updated = applyCitizenship(record, result.citizenship, new Date());
    if (await rpc("apply_citizenship_automation", { prior_revision: record.revision, updated_record: updated, decision_evidence: result.evidence }) === true) written++;
  }
}
console.log(JSON.stringify({ mode: apply ? "apply" : "dry_run", counts, written, unclear }, null, 2));
