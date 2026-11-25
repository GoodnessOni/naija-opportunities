import { staffRpc } from "../../../../lib/listings/staff-store";
import { isCronRequest } from "../../../../lib/cron-auth";

export async function GET(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: 401 });
  try {
    const queued = await staffRpc("enqueue_listing_rechecks", {});
    if (typeof queued !== "number") throw new Error("Invalid recheck count");
    return Response.json({ queued });
  } catch {
    return Response.json({ error: "recheck_queue_unavailable" }, { status: 503 });
  }
}
