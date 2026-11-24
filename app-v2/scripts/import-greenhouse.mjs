import { verifyGreenhouseListing } from "../lib/listings/greenhouse-verification.ts";
import { makeGreenhouseDraft } from "../lib/listings/submission.ts";
import { fetchGreenhouseCandidates } from "./sources/greenhouse.mjs";

const [board, provider, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");
const refreshOnly = flags.includes("--refresh-only");
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (flags.some(flag => !["--publish-verified", "--nigeria-and-remote", "--dry-run", "--refresh-only"].includes(flag)) || !board || !provider?.trim() || (!dryRun && (!url || !key))) {
  console.error('Usage: node --env-file=.env.local scripts/import-greenhouse.mjs <board> "<employer name>" [--publish-verified] [--nigeria-and-remote] [--dry-run] [--refresh-only]');
  process.exit(1);
}

const clock = new Date();
const { candidates, skipped } = await fetchGreenhouseCandidates(board);
const publishVerified = refreshOnly || flags.includes("--publish-verified");
const nigeriaAndRemote = flags.includes("--nigeria-and-remote");
const counts = { inserted: 0, duplicate: 0, publishedOrRefreshed: 0, rejected: skipped, outsideRegion: 0, wouldPublish: 0, wouldQueue: 0, eligibleForRefresh: 0, hidden: 0, failed: 0 };
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
    if (dryRun) {
      if (refreshOnly) {
        if (publish) counts.eligibleForRefresh++;
      } else counts[publish ? "wouldPublish" : "wouldQueue"]++;
      continue;
    }
    if (refreshOnly && !publish) continue;
    const rpc = refreshOnly ? "refresh_verified_greenhouse_job"
      : publish ? "sync_verified_greenhouse_job" : "insert_greenhouse_draft";
    const inserted = await callRpc(rpc, { candidate: listing });
    if (typeof inserted !== "boolean") throw new Error("Unexpected response");
    counts[inserted ? (publish ? "publishedOrRefreshed" : "inserted") : "duplicate"]++;
  } catch {
    counts.failed++;
  }
}
if (refreshOnly && !dryRun && !counts.failed && !counts.rejected && candidates.length) {
  try {
    const hidden = await callRpc("reconcile_greenhouse_snapshot", {
      board, present_keys: candidates.map(candidate => candidate.source_key),
      observed_at: clock.toISOString(),
    });
    if (!Number.isSafeInteger(hidden) || hidden < 0) throw new Error("Unexpected snapshot response");
    counts.hidden = hidden;
  } catch (error) {
    console.error(error.message);
    counts.failed++;
  }
}

console.log(JSON.stringify(counts));
if (counts.failed || candidates.length === 0 || (refreshOnly && counts.rejected)) process.exitCode = 1;

async function callRpc(rpc, payload) {
  const response = await fetch(new URL(`/rest/v1/rpc/${rpc}`, url), {
    method: "POST",
    headers: {
      apikey: key,
      ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${rpc} returned HTTP ${response.status}`);
  return response.json();
}
