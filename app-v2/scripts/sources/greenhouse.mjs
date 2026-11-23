const boardToken = /^[a-zA-Z0-9_-]{1,80}$/;
const MAX_SIZE = 4 * 1024 * 1024;

async function readBoard(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The board response has no body");
  const decoder = new TextDecoder();
  let size = 0;
  let contents = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SIZE) throw new Error("The board exceeds the response size limit");
      contents += decoder.decode(value, { stream: true });
    }
    return JSON.parse(contents + decoder.decode());
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export async function fetchGreenhouseCandidates(board, fetchPage = fetch) {
  if (typeof board !== "string" || !boardToken.test(board)) throw new Error("Invalid Greenhouse board token");
  const response = await fetchPage(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Greenhouse board returned HTTP ${response.status}`);
  const payload = await readBoard(response);
  if (!Array.isArray(payload?.jobs)) throw new Error("Greenhouse board no longer provides a jobs array");
  const seen = new Set();
  const candidates = [];
  let skipped = 0;

  for (const job of payload.jobs) {
    try {
      if (!Number.isSafeInteger(job?.id) || job.id <= 0 || typeof job.title !== "string" ||
          typeof job.absolute_url !== "string" || !job.title.trim() || seen.has(job.id)) {
        throw new Error("Invalid or duplicate job");
      }
      const source = new URL(job.absolute_url);
      if (source.protocol !== "https:" || source.username || source.password) throw new Error("Invalid provider link");

      seen.add(job.id);
      candidates.push({
        source_key: `greenhouse:${board}:${job.id}`,
        identifier: job.id,
        title: job.title.trim(),
        location: typeof job.location?.name === "string" ? job.location.name.trim() : null,
        source_url: source.href,
        source_updated_at: typeof job.updated_at === "string" ? job.updated_at : null,
        disposition: "needs_review",
      });
    } catch {
      skipped++;
    }
  }
  return {
    board, fetched: payload.jobs.length, skipped, candidates,
    needs_source_check: candidates.length === 0,
  };
}
