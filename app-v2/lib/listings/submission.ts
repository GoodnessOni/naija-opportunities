import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { resolveDateOnlyDeadline } from "./deadline";
import { listingSchema } from "./schema";

export const submissionInput = z.strictObject({
  kind: z.enum(["job", "internship", "scholarship"]),
  title: z.string().trim().min(1).max(180),
  provider: z.string().trim().min(1).max(160),
  source: z.url({ protocol: /^https$/ }), apply: z.url({ protocol: /^https$/ }),
  summary: z.string().trim().min(1).max(400), description: z.string().trim().min(1).max(8000),
  criteria: z.string().trim().max(4000),
  deadlineKind: z.enum(["fixed", "rolling", "unknown"]),
  deadlineDate: z.string(), timezone: z.string().trim().max(100),
  round: z.string().trim().max(100),
});

function slug(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function makeSubmission(input: z.infer<typeof submissionInput>, clock: Date) {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const id = Array.from(randomBytes(26), byte => alphabet[byte & 31]).join("");
  const at = clock.toISOString();
  const providerKey = slug(input.provider);
  const opportunityKey = slug(input.title);
  const roundKey = slug(input.round) || "unspecified";
  const dedupeKey = createHash("sha256").update([input.kind, providerKey, opportunityKey, roundKey].join("\n")).digest("hex");
  const fields = {
    schema_version: "1.0.0", listing_id: `lst_${id}`, kind: input.kind, synthetic: false, revision: 1,
    title: input.title, summary: input.summary, description: input.description,
    provider: { name: input.provider, type: "unknown", country: "ZZ", url: null },
    source: { name: providerKey, kind: "official", url: input.source, retrieved_at: at },
    application: { url: input.apply, url_kind: "unknown", contact_email: null },
    eligibility: {
      citizenship: { requirement: "unknown", countries: [] },
      education: { requirement: "unknown", source_wording: null, stages: [], qualifications: [], years: [], courses: [], institution_names: [] },
      grade: { requirement: "unknown", scale: null, minimum_hundredths: null },
      demographics: { requirements: [], preferences: [] },
      audience_tags: [], criteria_stated: !!input.criteria, criteria_text: input.criteria || null,
    },
    deadline: input.deadlineKind === "fixed" ? resolveDateOnlyDeadline(input.deadlineDate, input.timezone || null) :
      { kind: input.deadlineKind, fixed_at: null, stated_timezone: null, resolved_timezone: null, boundary: null },
    award: { kind: "not_stated", summary: null, currency: null, amount_minor: null, period: null },
    location: { country: "ZZ", locality: null, arrangement: "unknown" },
    employment: input.kind === "scholarship" ? null :
      { employment_type: input.kind === "internship" ? "internship" : "unspecified", duration_text: null, paid: null },
    documents_required: [], how_to_apply: "Not stated by the source.",
    lifecycle: { publication_status: "draft", status: "open", closed_reason: null },
    verification: {
      state: "unverified", outcome: null, method: null, reviewed_by: null, reviewer_id: null,
      source_checked_url: null, last_success_at: null, fresh_until: null, last_attempt_at: null, last_attempt_outcome: null,
    },
    timestamps: { created_at: at, updated_at: at, published_at: null, expired_at: null, withdrawn_at: null, closed_at: null },
    identity: { provider_key: providerKey, opportunity_key: opportunityKey, round_key: roundKey, round_evidence: input.round || null },
    dedupe_key: dedupeKey, previous_round_id: null,
  };
  const hash = createHash("sha256").update(JSON.stringify(fields)).digest("hex");
  return listingSchema.parse({ ...fields, content_hash: hash });
}
