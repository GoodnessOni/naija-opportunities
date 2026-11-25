/**
 * Contract-accurate schema 1.0.0 fixtures for PathSync (brief section 7.7): a fixed-deadline scholarship,
 * a rolling paid internship, a job, an expired historical listing and a withdrawal tombstone.
 * All are synthetic: true, so they never appear on the public site or the live feed.
 * Wrap active ones as { evaluation_time, listings: [...], cursor } to mock GET /api/v1/feed/active.
 */
import { fixture } from "./listing";

const checked = "2027-03-20T09:00:00Z";
const freshUntil = "2027-03-27T09:00:00Z"; // exactly 168 hours after checked
const verified = {
  state: "verified", outcome: "confirmed_open", method: "human_review", reviewed_by: "human", reviewer_id: "staff-fixture",
  source_checked_url: "https://example.org/apply", last_success_at: checked, fresh_until: freshUntil,
  last_attempt_at: checked, last_attempt_outcome: "confirmed_open",
} as const;
const published = { created_at: "2027-03-19T09:00:00Z", updated_at: checked, published_at: checked, expired_at: null, withdrawn_at: null, closed_at: null };
const keys = (n: string) => ({ dedupe_key: n.repeat(64), content_hash: n.repeat(64) });

export const scholarshipFixed = {
  ...fixture, listing_id: "lst_00000000000000000000000S01", ...keys("1"),
  title: "Merit Scholarship 2027", summary: "Tuition support for new undergraduates in Nigeria.",
  deadline: { kind: "fixed", fixed_at: "2027-03-31T22:59:59Z", stated_timezone: null, resolved_timezone: "Africa/Lagos", boundary: "inclusive_end_of_local_day" },
  award: { kind: "full_tuition", summary: "Full tuition for the first year.", currency: null, amount_minor: null, period: "per_year" },
  lifecycle: { publication_status: "published", status: "open", closed_reason: null },
  verification: verified, timestamps: published,
  identity: { ...fixture.identity, round_key: "2027" },
};

export const internshipRolling = {
  ...fixture, listing_id: "lst_00000000000000000000000N01", kind: "internship", ...keys("2"),
  title: "Software Engineering Intern", summary: "Six month paid internship in Lagos, hybrid.",
  description: "Work with the product team on web services.",
  provider: { name: "Example Tech", type: "company", country: "NG", url: "https://example.com" },
  eligibility: { ...fixture.eligibility, criteria_text: "Open to Nigerian undergraduates." },
  deadline: { kind: "rolling", fixed_at: null, stated_timezone: null, resolved_timezone: null, boundary: null },
  award: { kind: "stipend", summary: "Monthly stipend.", currency: "NGN", amount_minor: 15000000, period: "per_month" },
  location: { country: "NG", locality: "Lagos", arrangement: "hybrid" },
  employment: { employment_type: "internship", duration_text: "Six months", paid: true },
  lifecycle: { publication_status: "published", status: "open", closed_reason: null },
  verification: verified, timestamps: published,
  identity: { provider_key: "example-tech", opportunity_key: "swe-intern", round_key: "rolling", round_evidence: null },
};

export const job = {
  ...internshipRolling, listing_id: "lst_00000000000000000000000J01", kind: "job", ...keys("3"),
  title: "Junior Data Analyst", summary: "Full time analyst role in Abuja.",
  award: { kind: "not_stated", summary: null, currency: null, amount_minor: null, period: null },
  location: { country: "NG", locality: "Abuja", arrangement: "on_site" },
  employment: { employment_type: "full_time", duration_text: null, paid: null },
  identity: { provider_key: "example-tech", opportunity_key: "data-analyst", round_key: "2027", round_evidence: null },
};

export const expiredHistorical = {
  ...scholarshipFixed, listing_id: "lst_00000000000000000000000E01", ...keys("4"),
  title: "Merit Scholarship 2026",
  deadline: { ...scholarshipFixed.deadline, fixed_at: "2026-03-31T22:59:59Z" },
  lifecycle: { publication_status: "published", status: "expired", closed_reason: "deadline_passed" },
  timestamps: { ...published, expired_at: "2026-03-31T23:00:00Z" },
  identity: { ...fixture.identity, round_key: "2026" },
};

export const tombstone = {
  ...scholarshipFixed, listing_id: "lst_00000000000000000000000W01", ...keys("5"),
  summary: "[withdrawn]", description: "[withdrawn]", how_to_apply: "[withdrawn]", documents_required: [],
  award: { kind: "not_stated", summary: null, currency: null, amount_minor: null, period: null },
  application: { ...fixture.application, contact_email: null },
  eligibility: { ...fixture.eligibility, criteria_stated: false, criteria_text: "[withdrawn]",
    education: { ...fixture.eligibility.education, source_wording: "[withdrawn]" } },
  lifecycle: { publication_status: "withdrawn", status: "closed", closed_reason: "removed_by_producer" },
  timestamps: { ...published, withdrawn_at: "2027-03-22T09:00:00Z", closed_at: "2027-03-22T09:00:00Z" },
  identity: { ...fixture.identity, round_key: "2027-withdrawn" },
};

export const contractFixtures = { scholarshipFixed, internshipRolling, job, expiredHistorical, tombstone };
