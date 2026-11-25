import { z } from "zod";
import { authenticateUser, staffRpc, StaffRequestError } from "../../../lib/listings/staff-store";
import { makeSubmission, submissionInput } from "../../../lib/listings/submission";

export async function POST(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user.email_confirmed_at) return Response.json({ error: "confirm_email" }, { status: 403 });
    const input = submissionInput.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "invalid_submission" }, { status: 400 });
    const record = makeSubmission(input.data, new Date());
    const saved = await staffRpc("submit_opportunity", { owner_user: user.id, submitted_record: record });
    if (saved !== true) return Response.json({ error: "possible_duplicate" }, { status: 409 });
    return Response.json({ listing_id: record.listing_id, state: "received" }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffRequestError) return Response.json({ error: error.code }, { status: error.status });
    if (error instanceof RangeError || error instanceof z.ZodError) {
      return Response.json({ error: "invalid_listing_fields" }, { status: 422 });
    }
    return Response.json({ error: "submission_unavailable" }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user.email_confirmed_at) return Response.json({ error: "confirm_email" }, { status: 403 });
    const submissions = await staffRpc("organisation_submission_status", { owner_user: user.id });
    return Response.json({ submissions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffRequestError) return Response.json({ error: error.code }, { status: error.status });
    return Response.json({ error: "submission_unavailable" }, { status: 503 });
  }
}
