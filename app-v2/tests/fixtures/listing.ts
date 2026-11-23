const now = "2027-03-24T22:59:59Z";
export const fixture = {
  schema_version: "1.0.0", listing_id: "lst_00000000000000000000000001",
  kind: "scholarship", synthetic: true, revision: 1,
  title: "Merit Scholarship", summary: "Tuition support for new undergraduates.",
  description: "The foundation supports applicants entering their first year.",
  provider: { name: "Example Foundation", type: "foundation", country: "NG", url: null },
  source: { name: "example", kind: "official", url: "https://example.org/scholarship", retrieved_at: now },
  application: { url: "https://example.org/apply", url_kind: "direct_application", contact_email: null },
  eligibility: {
    citizenship: { requirement: "explicit", countries: ["NG"] },
    education: { requirement: "unknown", source_wording: null, stages: [], qualifications: [], years: [], courses: [], institution_names: [] },
    grade: { requirement: "unknown", scale: null, minimum_hundredths: null },
    demographics: { requirements: [], preferences: [] }, audience_tags: [],
    criteria_stated: true, criteria_text: "Nigerian citizens may apply.",
  },
  deadline: { kind: "unknown", fixed_at: null, stated_timezone: null, resolved_timezone: null, boundary: null },
  award: { kind: "not_stated", summary: null, currency: null, amount_minor: null, period: null },
  location: { country: "NG", locality: null, arrangement: "unknown" },
  employment: null, documents_required: [], how_to_apply: "Not stated by the source.",
  lifecycle: { publication_status: "draft", status: "open", closed_reason: null },
  verification: {
    state: "unverified", outcome: null, method: null, reviewed_by: null, reviewer_id: null,
    source_checked_url: null, last_success_at: null, fresh_until: null, last_attempt_at: null, last_attempt_outcome: null,
  },
  timestamps: { created_at: now, updated_at: now, published_at: null, expired_at: null, withdrawn_at: null, closed_at: null },
  identity: { provider_key: "example", opportunity_key: "merit", round_key: "unspecified", round_evidence: null },
  dedupe_key: "a".repeat(64), content_hash: "b".repeat(64), previous_round_id: null,
};
