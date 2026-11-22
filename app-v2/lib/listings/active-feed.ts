export type FeedRecord = Readonly<{
  listing_id: string;
  synthetic: boolean;
  lifecycle: {
    publication_status: "draft" | "published" | "withdrawn";
    status: "open" | "closed" | "expired";
  };
  deadline: { kind: "fixed"; fixed_at: string } | { kind: "rolling" | "unknown"; fixed_at: null };
  verification: { state: string; outcome: string | null; fresh_until: string | null };
}>;

export type VerificationDecision = "confirmed_open" | "ambiguous" | "failed";
export type FeedExclusion = "ambiguous" | "failed" | "missing" | "stale" | "expired_deadline" | "not_on_active_feed";

export const FRESHNESS_MS = 168 * 60 * 60 * 1000;

function exclusion(record: FeedRecord, decision: VerificationDecision | undefined, at: number): FeedExclusion | null {
  const { deadline, lifecycle, synthetic, verification } = record;
  if (synthetic || lifecycle.publication_status !== "published" || lifecycle.status !== "open") {
    return "not_on_active_feed";
  }
  if (decision === undefined) return "missing";
  if (decision !== "confirmed_open") return decision;
  if (verification.state !== "verified" || verification.outcome !== "confirmed_open") {
    return "not_on_active_feed";
  }
  if (deadline.kind === "fixed") {
    const end = Date.parse(deadline.fixed_at);
    if (!Number.isFinite(end) || at > end) return "expired_deadline";
  }
  const freshUntil = verification.fresh_until === null ? NaN : Date.parse(verification.fresh_until);
  if (!Number.isFinite(freshUntil) || at > freshUntil) return "stale";
  return null;
}

export function buildActiveFeed<T extends FeedRecord>(
  records: readonly T[],
  decisions: ReadonlyMap<string, VerificationDecision>,
  evaluationTime: Date,
) {
  const at = evaluationTime.getTime();
  if (!Number.isFinite(at)) throw new RangeError("Invalid feed evaluation time");
  const active: T[] = [];
  const excluded: { listing_id: string; reason: FeedExclusion }[] = [];

  for (const record of records) {
    const reason = exclusion(record, decisions.get(record.listing_id), at);
    if (reason) excluded.push({ listing_id: record.listing_id, reason });
    else active.push(record);
  }

  return { active, excluded };
}
