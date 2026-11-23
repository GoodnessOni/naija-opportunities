import { z } from "zod";
import { FRESHNESS_MS } from "./active-feed";

const text = (max: number, min = 1) => z.string().min(min).max(max)
  .refine(value => value.trim() === value && !/[\x00-\x1f\x7f<>]/.test(value), "unsafe_text")
  .refine(value => !/(?:\b\d{11}\b|(?:\+234|234)[\s-]*\d(?:[\s-]*\d){9}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i.test(value), "personal_data");
const listingId = z.string().regex(/^lst_[0-9A-HJKMNP-TV-Z]{26}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const utc = z.iso.datetime();
const country = z.string().regex(/^[A-Z]{2}$/);
const url = z.url({ protocol: /^https$/ }).refine(value => {
  const parsed = new URL(value);
  return !parsed.username && !parsed.password && !parsed.hash && value === value.trim();
}, "unaccepted_url");
const obj = z.strictObject;
const options = z.enum;
const demographic = options(["female", "disability", "first_generation", "low_income", "northern_nigeria", "niger_delta", "rural"]);
const ordered = (max: number, item: z.ZodType<string>) => z.array(item).max(max)
  .refine(values => values.every((value, index) => index === 0 || values[index - 1] < value), "unsorted_or_duplicate");
const deadline = z.discriminatedUnion("kind", [
  obj({
    kind: z.literal("fixed"), fixed_at: utc, stated_timezone: text(100).nullable(),
    resolved_timezone: text(100), boundary: options(["inclusive_end_of_local_day", "inclusive_instant"]),
  }),
  obj({
    kind: options(["rolling", "unknown"]), fixed_at: z.null(), stated_timezone: z.null(),
    resolved_timezone: z.null(), boundary: z.null(),
  }),
]);

export const listingSchema = obj({
  schema_version: z.literal("1.0.0"), listing_id: listingId,
  kind: options(["scholarship", "internship", "job"]),
  synthetic: z.boolean(), revision: z.int().min(1).max(1000000),
  title: text(180).refine(value => !/^(untitled|n\/a|tbd|placeholder)$/i.test(value), "placeholder_title"),
  summary: text(400), description: text(8000),
  provider: obj({
    name: text(160), type: options(["government", "tertiary_institution", "company", "foundation", "ngo", "multilateral", "unknown"]),
    country, url: url.nullable(),
  }),
  source: obj({
    name: slug, kind: options(["official", "aggregator", "news", "manual", "unknown"]),
    url, retrieved_at: utc,
  }),
  application: obj({
    url, url_kind: options(["direct_application", "official_programme_page", "aggregator_page", "unknown"]),
    contact_email: z.email().nullable(),
  }),
  eligibility: obj({
    citizenship: z.discriminatedUnion("requirement", [
      obj({ requirement: z.literal("explicit"), countries: ordered(20, country.refine(code => code !== "ZZ")).refine(values => values.length > 0) }),
      obj({ requirement: z.literal("unconstrained"), countries: z.tuple([z.literal("*")]) }),
      obj({ requirement: z.literal("unknown"), countries: z.tuple([]) }),
    ]),
    education: obj({
      requirement: options(["unrestricted", "restricted", "unknown"]), source_wording: text(4000).nullable(),
      stages: z.array(options(["secondary", "undergraduate", "postgraduate"])),
      qualifications: z.array(options(["secondary_school", "bachelor", "master", "doctorate"])),
      years: z.array(options(["100", "200", "300", "400", "500", "postgraduate"])),
      courses: z.array(options(["agriculture", "architecture", "arts", "business", "computer_science", "education", "engineering", "health", "humanities", "law", "mathematics", "medicine", "natural_sciences", "social_sciences", "other"])),
      institution_names: z.array(text(160)),
    }),
    grade: obj({
      requirement: options(["explicit", "none", "unknown"]),
      scale: options(["4.0", "5.0"]).nullable(), minimum_hundredths: z.int().min(0).max(500).nullable(),
    }),
    demographics: obj({ requirements: z.array(demographic), preferences: z.array(demographic) }),
    audience_tags: ordered(6, text(80)), criteria_stated: z.boolean(), criteria_text: text(4000).nullable(),
  }),
  deadline,
  award: obj({
    kind: options(["cash", "full_tuition", "stipend", "unpaid", "mixed", "not_stated"]),
    summary: text(400).nullable(), currency: options(["NGN", "USD", "GBP", "EUR", "OTHER"]).nullable(),
    amount_minor: z.int().positive().nullable(),
    period: options(["one_off", "per_year", "per_month", "full_programme"]).nullable(),
  }),
  location: obj({ country, locality: text(160).nullable(), arrangement: options(["on_site", "remote", "hybrid", "unknown"]) }),
  employment: obj({
    employment_type: options(["internship", "full_time", "part_time", "contract", "temporary", "unspecified"]),
    duration_text: text(160).nullable(), paid: z.boolean().nullable(),
  }).nullable(),
  documents_required: ordered(20, text(160)), how_to_apply: text(4000),
  lifecycle: obj({
    publication_status: options(["draft", "published", "withdrawn"]), status: options(["open", "closed", "expired"]),
    closed_reason: options(["deadline_passed", "provider_closed", "duplicate", "untrusted", "removed_by_producer", "superseded"]).nullable(),
  }),
  verification: obj({
    state: options(["unverified", "verified"]), outcome: options(["confirmed_open", "confirmed_closed", "confirmed_expired", "confirmed_withdrawn"]).nullable(),
    method: options(["automated_review", "human_review"]).nullable(), reviewed_by: options(["automation", "human"]).nullable(),
    reviewer_id: slug.nullable(), source_checked_url: url.nullable(),
    last_success_at: utc.nullable(), fresh_until: utc.nullable(), last_attempt_at: utc.nullable(),
    last_attempt_outcome: options(["confirmed_open", "confirmed_closed", "confirmed_expired", "confirmed_withdrawn", "ambiguous", "failed"]).nullable(),
  }),
  timestamps: obj({
    created_at: utc, updated_at: utc, published_at: utc.nullable(), expired_at: utc.nullable(),
    closed_at: utc.nullable(), withdrawn_at: utc.nullable(),
  }),
  identity: obj({ provider_key: slug, opportunity_key: slug, round_key: slug, round_evidence: text(4000).nullable() }),
  dedupe_key: hash, content_hash: hash, previous_round_id: listingId.nullable(),
}).superRefine((record, ctx) => {
  const issue = (path: string[], message: string) => ctx.addIssue({ code: "custom", path, message });
  const { employment, award, kind, verification, eligibility, timestamps, lifecycle } = record;
  if ((kind === "scholarship") !== (employment === null) ||
      (employment && (kind === "internship") !== (employment.employment_type === "internship"))) {
    issue(["employment"], "employment_kind_mismatch");
  }
  if ((award.kind === "not_stated" && (award.currency || award.amount_minor || award.period)) ||
      (award.kind === "unpaid" && (!award.summary || award.currency || award.amount_minor)) ||
      (employment?.paid === true && ["unpaid", "not_stated"].includes(award.kind)) ||
      (employment?.paid === false && award.kind !== "unpaid")) {
    issue(["award"], "award_kind_mismatch");
  }
  const { education, grade, demographics } = eligibility;
  if (education.requirement === "restricted" && ![education.stages, education.qualifications, education.years,
    education.courses, education.institution_names].some(values => values.length)) {
    issue(["eligibility", "education"], "missing_education_restriction");
  }
  if (grade.requirement === "explicit"
    ? grade.scale === null || grade.minimum_hundredths === null || grade.minimum_hundredths > Number(grade.scale) * 100
    : grade.scale !== null || grade.minimum_hundredths !== null) {
    issue(["eligibility", "grade"], "grade_requirement_mismatch");
  }
  if (demographics.requirements.some(value => demographics.preferences.includes(value))) {
    issue(["eligibility", "demographics"], "overlapping_demographics");
  }
  const { last_success_at: success, fresh_until: freshUntil } = verification;
  if ((success === null) !== (freshUntil === null) ||
    (success && freshUntil && Date.parse(freshUntil) - Date.parse(success) !== FRESHNESS_MS)) {
    issue(["verification", "fresh_until"], "invalid_freshness_window");
  }
  if (verification.method === "human_review" && (verification.reviewed_by !== "human" || !verification.reviewer_id) ||
    verification.method === "automated_review" && (verification.reviewed_by !== "automation" || verification.reviewer_id !== null)) {
    issue(["verification", "method"], "reviewer_mismatch");
  }
  if (Date.parse(timestamps.updated_at) < Date.parse(timestamps.created_at) ||
      (lifecycle.publication_status === "draft") !== (timestamps.published_at === null)) {
    issue(["timestamps"], "lifecycle_timestamp_mismatch");
  }
  if (lifecycle.publication_status === "withdrawn" && (
    !timestamps.withdrawn_at || [record.summary, record.description, record.how_to_apply, eligibility.criteria_text, education.source_wording]
      .some(value => value !== "[withdrawn]") ||
    record.documents_required.length || award.kind !== "not_stated" || record.application.contact_email || eligibility.criteria_stated
  )) issue(["lifecycle"], "invalid_tombstone");
});

export type Listing = z.infer<typeof listingSchema>;
