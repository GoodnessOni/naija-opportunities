import { describe, expect, it } from "vitest";
import { applyStaffReview, reviewInput } from "../lib/listings/review";
import { listingSchema } from "../lib/listings/schema";
import { fixture } from "./fixtures/listing";

const candidate = listingSchema.parse({ ...fixture, synthetic: false });
const checked = new Date("2027-03-25T09:00:00Z");
const openReview = reviewInput.parse({
  outcome: "confirmed_open",
  evidence: { open: "Applications are open.", deadline: "No date is stated.", eligibility: "NG citizens.", application: "Official form." },
});

describe("staff review decisions", () => {
  it("publishes an official candidate and adds 168 hours of freshness", () => {
    const result = applyStaffReview(candidate, openReview, "staff-one", checked);
    expect(result.lifecycle.publication_status).toBe("published");
    expect(result.revision).toBe(candidate.revision + 1);
    expect(result.verification.fresh_until).toBe("2027-04-01T09:00:00.000Z");
    expect(candidate.lifecycle.publication_status).toBe("draft");
  });

  it("requires all four facts", () => {
    expect(reviewInput.safeParse({
      outcome: "confirmed_open", evidence: { open: "Applications accepted." },
    }).success).toBe(false);
  });

  it("preserves the prior successful check on failure", () => {
    const published = applyStaffReview(candidate, openReview, "staff-one", checked);
    const failed = applyStaffReview(published, { outcome: "failed", evidence: { note: "Source unavailable." } },
      "staff-two", new Date("2027-03-26T09:00:00Z"));
    expect(failed.verification.last_success_at).toBe(published.verification.last_success_at);
    expect(failed.verification.fresh_until).toBe(published.verification.fresh_until);
    expect(failed.verification.last_attempt_outcome).toBe("failed");
  });

  it("closes a published listing immediately", () => {
    const published = applyStaffReview(candidate, openReview, "staff-one", checked);
    const closed = applyStaffReview(published, { outcome: "confirmed_closed", evidence: { note: "Provider ended the round." } },
      "staff-two", new Date("2027-03-26T09:00:00Z"));
    expect(closed.lifecycle.status).toBe("closed");
  });
});
