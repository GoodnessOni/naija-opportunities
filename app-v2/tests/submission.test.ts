import { describe, expect, it } from "vitest";
import { makeSubmission, submissionInput } from "../lib/listings/submission";

const input = submissionInput.parse({
  kind: "internship",
  title: "Engineering internship",
  provider: "Example foundation",
  source: "https://example.org/internships",
  apply: "https://example.org/apply",
  summary: "An internship for engineering students.",
  description: "The provider offers a placement for engineering students.",
  criteria: "Current engineering students.",
  deadlineKind: "fixed",
  deadlineDate: "2027-03-31",
  timezone: "",
  round: "2027",
});

describe("organisation submissions", () => {
  it("makes a draft with no verified eligibility and resolves a date-only deadline", () => {
    const draft = makeSubmission(input, new Date("2027-03-24T00:00:00Z"));
    expect(draft.lifecycle.publication_status).toBe("draft");
    expect(draft.verification.state).toBe("unverified");
    expect(draft.eligibility.citizenship.requirement).toBe("unknown");
    expect(draft.deadline.fixed_at).toBe("2027-03-31T22:59:59Z");
  });

  it("deduplicates a resubmitted round even when the apply link changes", () => {
    const at = new Date("2027-03-24T00:00:00Z");
    const first = makeSubmission(input, at);
    const second = makeSubmission({ ...input, apply: "https://example.org/new-form" }, at);
    expect(first.dedupe_key).toBe(second.dedupe_key);
    expect(first.listing_id).not.toBe(second.listing_id);
  });
});
