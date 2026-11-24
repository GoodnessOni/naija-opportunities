import { makeGreenhouseDraft } from "../lib/listings/submission.ts";
import { fetchGreenhouseCandidates } from "./sources/greenhouse.mjs";

const [board, provider] = process.argv.slice(2);
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!board || !provider?.trim() || !url || !key) {
  console.error('Usage: node --env-file=.env.local scripts/import-greenhouse.mjs <board> "<employer name>"');
  process.exit(1);
}

const { candidates, skipped } = await fetchGreenhouseCandidates(board);
const clock = new Date();
const counts = { inserted: 0, duplicate: 0, rejected: skipped, failed: 0 };
for (const candidate of candidates) {
  let draft;
  try {
    draft = makeGreenhouseDraft(provider, candidate, clock);
  } catch {
    counts.rejected++;
    continue;
  }
  try {
    const response = await fetch(new URL("/rest/v1/rpc/insert_greenhouse_draft", url), {
      method: "POST",
      headers: {
        apikey: key,
        ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ candidate: draft }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const inserted = await response.json();
    if (typeof inserted !== "boolean") throw new Error("Unexpected response");
    counts[inserted ? "inserted" : "duplicate"]++;
  } catch {
    counts.failed++;
  }
}
console.log(JSON.stringify(counts));
if (counts.failed || candidates.length === 0) process.exitCode = 1;
