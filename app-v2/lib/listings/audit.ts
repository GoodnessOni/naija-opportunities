import { z } from "zod";

export const auditEvent = z.object({
  at: z.string(), actor: z.string(), action: z.string(),
  listing_id: z.string(), title: z.string().nullable(), note: z.string(),
});
export type AuditEvent = z.infer<typeof auditEvent>;

const labels: Record<string, string> = {
  created: "Created", edited: "Edited", withdrawn: "Withdrawn",
  verified_confirmed_open: "Verified open", verified_confirmed_closed: "Verified closed",
  verified_inconclusive: "Check inconclusive", verified_failed: "Check failed",
};
export const auditLabel = (action: string) => labels[action] ?? action;

/** Query for GET /api/staff/audit: page size 1 to 200 and an optional "before" cursor time. */
export function parseAuditQuery(params: URLSearchParams) {
  const limit = Number(params.get("limit") ?? "100");
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return null;
  const before = params.get("before");
  if (before !== null && !z.iso.datetime({ offset: true }).safeParse(before).success) return null;
  return { page_limit: limit, before_at: before };
}
