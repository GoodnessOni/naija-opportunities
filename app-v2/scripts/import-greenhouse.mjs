import { verifyGreenhouseListing } from "../lib/listings/greenhouse-verification.ts";
import { makeGreenhouseDraft } from "../lib/listings/submission.ts";
import { fetchGreenhouseCandidates } from "./sources/greenhouse.mjs";

const [board, provider, ...flags] = process.argv.slice(2);
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (flags.some(flag => !["--publish-verified", "--nigeria-and-remote"].includes(flag)) || !board || !provider?.trim() || !url || !key) {
  console.error('Usage: node --env-file=.env.local scripts/import-greenhouse.mjs <board> "<employer name>" [--publish-verified] [--nigeria-and-remote]');
  process.exit(1);
}

const { candidates, skipped } = await fetchGreenhouseCandidates(board);
const publishVerified = flags.includes("--publish-verified");
const nigeriaAndRemote = flags.includes("--nigeria-and-remote");
const clock = new Date();
const counts = { inserted: 0, duplicate: 0, publishedOrRefreshed: 0, rejected: skipped, outsideRegion: 0, failed: 0 };
for (const candidate of candidates) {
  if (nigeriaAndRemote && !/(?:\bNigeria\b|^Home based - (?:EMEA|Worldwide)$)/i.test(candidate.location ?? "")) {
    counts.outsideRegion++;
    continue;
  }
  let draft;
  try {
    draft = makeGreenhouseDraft(provider, candidate, clock);
  } catch {
    counts.rejected++;
    continue;
  }
  try {
    const listing = publishVerified
      ? verifyGreenhouseListing(draft, board, candidate.identifier, clock) : draft;
    const publish = listing.lifecycle.publication_status === "published";
    const rpc = publish ? "sync_verified_greenhouse_job" : "insert_greenhouse_draft";
    const response = await fetch(new URL(`/rest/v1/rpc/${rpc}`, url), {
      method: "POST",
      headers: {
        apikey: key,
        ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ candidate: listing }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const inserted = await response.json();
    if (typeof inserted !== "boolean") throw new Error("Unexpected response");
    counts[inserted ? (publish ? "publishedOrRefreshed" : "inserted") : "duplicate"]++;
  } catch {
    counts.failed++;
  }
}
console.log(JSON.stringify(counts));
if (counts.failed || candidates.length === 0) process.exitCode = 1;
