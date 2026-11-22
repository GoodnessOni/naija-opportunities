const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set the staging SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.");
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(new URL("/rest/v1/rpc/enqueue_listing_rechecks", url), {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Recheck queue request failed (HTTP ${response.status})`);
    const count = await response.json();
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Unexpected recheck queue response");
    console.log(`Enqueued or updated ${count} listing rechecks.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Recheck queue request failed");
    process.exitCode = 1;
  }
}
