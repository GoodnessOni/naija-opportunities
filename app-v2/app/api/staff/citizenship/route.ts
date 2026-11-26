import { z } from "zod";
import { applyCitizenship, extractCitizenship } from "../../../../lib/listings/citizenship";
import { listingSchema } from "../../../../lib/listings/schema";
import { authenticateStaff, staffRpc, StaffRequestError } from "../../../../lib/listings/staff-store";

const listingId = z.string().regex(/^lst_[0-9A-HJKMNP-TV-Z]{26}$/);
const requestSchema = z.strictObject({
  approve: z.array(z.strictObject({ listing_id: listingId, revision: z.int().positive() })).min(1).max(100),
});

function errorResponse(error: unknown) {
  if (error instanceof StaffRequestError) return Response.json({ error: error.code }, { status: error.status });
  return Response.json({ error: "staff_service_unavailable" }, { status: 503 });
}

/** Unclear listings with a suggestion and evidence. Empty when migration 018 is not applied yet. */
async function suggestions() {
  let records;
  try {
    records = listingSchema.array().parse(await staffRpc("citizenship_candidates", {}));
  } catch {
    return [];
  }
  return records.flatMap(record => {
    const result = extractCitizenship(record);
    return result.status === "unclear" && result.suggestion
      ? [{ record, suggestion: result.suggestion, reason: result.reason, evidence: result.evidence }] : [];
  });
}

export async function GET(request: Request) {
  try {
    await authenticateStaff(request);
    const items = (await suggestions()).map(({ record, ...rest }) => ({
      listing_id: record.listing_id, revision: record.revision, title: record.title, provider: record.provider.name, ...rest,
    }));
    return Response.json({ suggestions: items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await authenticateStaff(request);
    const input = requestSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return Response.json({ error: "invalid_request" }, { status: 400 });
    const current = new Map((await suggestions()).map(item => [item.record.listing_id, item]));
    const applied: string[] = [];
    const skipped: string[] = [];
    for (const { listing_id, revision } of input.data.approve) {
      const item = current.get(listing_id);
      if (!item || item.record.revision !== revision) { skipped.push(listing_id); continue; }
      const updated = applyCitizenship(item.record, item.suggestion, new Date());
      const saved = await staffRpc("staff_apply_citizenship", {
        staff_user: staff.id, prior_revision: revision, updated_record: updated, decision_evidence: item.evidence,
      });
      (saved === true ? applied : skipped).push(listing_id);
    }
    return Response.json({ applied, skipped });
  } catch (error) {
    return errorResponse(error);
  }
}
