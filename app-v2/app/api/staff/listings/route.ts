import { createHash } from "node:crypto";
import { z } from "zod";
import { listingSchema } from "../../../../lib/listings/schema";
import { makeSubmission, submissionInput } from "../../../../lib/listings/submission";
import { authenticateStaff, staffRpc, StaffRequestError } from "../../../../lib/listings/staff-store";

const id = z.string().regex(/^lst_[0-9A-HJKMNP-TV-Z]{26}$/);
const target = { id, revision: z.int().positive() };
const note = z.string().trim().min(1).max(1000);
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), note, listing: submissionInput }),
  z.object({ action: z.literal("edit"), ...target, note, title: submissionInput.shape.title,
    summary: submissionInput.shape.summary, description: submissionInput.shape.description,
    source: submissionInput.shape.source, apply: submissionInput.shape.apply }),
  z.object({ action: z.literal("withdraw"), ...target, note }),
]);

function failure(error: unknown) {
  if (error instanceof StaffRequestError) return Response.json({ error: error.code }, { status: error.status });
  if (error instanceof RangeError || error instanceof z.ZodError) return Response.json({ error: "invalid_listing" }, { status: 422 });
  return Response.json({ error: "staff_service_unavailable" }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    const staff = await authenticateStaff(request);
    const target = id.safeParse(new URL(request.url).searchParams.get("id"));
    if (!target.success) return Response.json({ error: "invalid_id" }, { status: 400 });
    const row = await staffRpc("staff_listing", { staff_user: staff.id, target_id: target.data });
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(listingSchema.parse(row), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const staff = await authenticateStaff(request);
    const input = inputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "invalid_listing" }, { status: 400 });
    const data = input.data;
    const now = new Date();
    let listing;
    let revision = 0;
    if (data.action === "create") {
      listing = makeSubmission(data.listing, now);
    } else {
      const row = await staffRpc("staff_listing", { staff_user: staff.id, target_id: data.id });
      const parsed = listingSchema.safeParse(row);
      if (!parsed.success || parsed.data.revision !== data.revision || parsed.data.lifecycle.publication_status === "withdrawn")
        return Response.json({ error: "listing_changed" }, { status: 409 });
      listing = parsed.data;
      revision = listing.revision++;
      listing.timestamps.updated_at = now.toISOString();
      listing.verification = {
        state: "unverified", outcome: null, method: null, reviewed_by: null, reviewer_id: null,
        source_checked_url: null, last_success_at: null, fresh_until: null, last_attempt_at: null, last_attempt_outcome: null,
      };
      if (data.action === "withdraw") {
        if (listing.lifecycle.publication_status !== "published") throw new RangeError("Only published listings can be withdrawn");
        listing.lifecycle = { publication_status: "withdrawn", status: "closed", closed_reason: "removed_by_producer" };
        listing.timestamps.withdrawn_at = now.toISOString();
        listing.timestamps.closed_at = now.toISOString();
        listing.summary = listing.description = listing.how_to_apply = "[withdrawn]";
        listing.eligibility.criteria_text = listing.eligibility.education.source_wording = "[withdrawn]";
        listing.eligibility.criteria_stated = false;
        listing.documents_required = [];
        listing.application.contact_email = null;
        listing.award = { kind: "not_stated", summary: null, currency: null, amount_minor: null, period: null };
        if (listing.employment) listing.employment.paid = null;
      } else {
        listing.title = data.title;
        listing.summary = data.summary;
        listing.description = data.description;
        listing.source.url = data.source;
        listing.source.retrieved_at = now.toISOString();
        if (listing.application.url !== data.apply) listing.application.url_kind = "unknown";
        listing.application.url = data.apply;
      }
      const { content_hash, ...fields } = listing;
      void content_hash;
      listing.content_hash = createHash("sha256").update(JSON.stringify(fields)).digest("hex");
    }
    const saved = await staffRpc("staff_save_listing", {
      staff_user: staff.id, prior_revision: revision, candidate: listingSchema.parse(listing), action_note: data.note,
    });
    if (saved !== true) return Response.json({ error: "listing_changed_or_duplicate" }, { status: 409 });
    return Response.json({ listing_id: listing.listing_id });
  } catch (error) { return failure(error); }
}
