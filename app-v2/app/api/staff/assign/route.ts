import { z } from "zod";
import { authenticateStaff, staffRpc, StaffRequestError } from "../../../../lib/listings/staff-store";

const input = z.strictObject({
  listing_id: z.string().regex(/^lst_[0-9A-HJKMNP-TV-Z]{26}$/),
  reviewer_id: z.string().regex(/^[a-z0-9]+([-_][a-z0-9]+)*$/).nullable(),
});

export async function POST(request: Request) {
  try {
    const staff = await authenticateStaff(request);
    const body = input.safeParse(await request.json().catch(() => null));
    if (!body.success) return Response.json({ error: "invalid_assignment" }, { status: 400 });
    const ok = await staffRpc("staff_assign", { staff_user: staff.id, target_id: body.data.listing_id, assignee: body.data.reviewer_id });
    if (ok !== true) return Response.json({ error: "unknown_reviewer" }, { status: 422 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof StaffRequestError) return Response.json({ error: error.code }, { status: error.status });
    return Response.json({ error: "staff_service_unavailable" }, { status: 503 });
  }
}
