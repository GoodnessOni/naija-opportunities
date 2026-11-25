import { z } from "zod";
import { listingSchema } from "../../../../lib/listings/schema";
import { applyStaffReview, reviewInput } from "../../../../lib/listings/review";
import { authenticateStaff, staffRpc, StaffRequestError } from "../../../../lib/listings/staff-store";

const requestSchema = z.strictObject({
  listing_id: z.string().regex(/^lst_[0-9A-HJKMNP-TV-Z]{26}$/),
  revision: z.int().positive(),
  review: reviewInput,
});

function errorResponse(error: unknown) {
  if (error instanceof StaffRequestError) return Response.json({ error: error.code }, { status: error.status });
  return Response.json({ error: "staff_service_unavailable" }, { status: 503 });
}

async function queue(id: string) {
  return listingSchema.array().parse(await staffRpc("staff_review_queue", { staff_user: id }));
}

/** listing_id to reviewer_id. Empty when migration 017 is not applied yet, so the queue still loads. */
async function readAssignments(id: string): Promise<Record<string, string>> {
  try {
    const rows = z.object({ listing_id: z.string(), reviewer_id: z.string() }).array()
      .parse(await staffRpc("staff_queue_assignments", { staff_user: id }));
    return Object.fromEntries(rows.map(row => [row.listing_id, row.reviewer_id]));
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  try {
    const staff = await authenticateStaff(request);
    const [listings, overview, assignments] = await Promise.all([
      queue(staff.id), staffRpc("staff_overview", { staff_user: staff.id }), readAssignments(staff.id),
    ]);
    return Response.json({ listings, overview, assignments, reviewer: staff.reviewer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await authenticateStaff(request);
    const input = requestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "invalid_review" }, { status: 400 });
    const data = input.data;
    const current = (await queue(staff.id)).find(record => record.listing_id === data.listing_id);
    if (!current || current.revision !== data.revision) {
      return Response.json({ error: "listing_changed" }, { status: 409 });
    }
    const updated = applyStaffReview(current, data.review, staff.reviewer, new Date());
    const saved = await staffRpc("record_staff_review", {
      staff_user: staff.id, prior_revision: current.revision, updated_record: updated,
      review_evidence: data.review.evidence,
    });
    if (saved !== true) return Response.json({ error: "listing_changed" }, { status: 409 });
    return Response.json({ listing_id: updated.listing_id, revision: updated.revision });
  } catch (error) {
    if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 422 });
    return errorResponse(error);
  }
}
