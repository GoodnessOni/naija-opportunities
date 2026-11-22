import { describe, expect, it } from "vitest";
import { listingSchema } from "../lib/listings/schema";

import { fixture } from "./fixtures/listing";

describe("listing record candidate schema", () => {
  it("accepts the complete synthetic draft fixture", () => {
    expect(listingSchema.safeParse(fixture).success).toBe(true);
  });

  it.each([
    { previous_round_id: undefined },
    { listing_id: "lst_bad" },
    { title: " leading space" },
    { description: "<strong>HTML</strong>" },
    { description: "Email person@example.org for details." },
    { description: "Call +234 801 234 5678 for details." },
    { eligibility: { ...fixture.eligibility, citizenship: { requirement: "explicit", countries: ["*"] } } },
    { verification: { ...fixture.verification, last_success_at: fixture.timestamps.created_at, fresh_until: fixture.timestamps.created_at } },
  ])("rejects an invalid record: %j", overrides => {
    expect(listingSchema.safeParse({ ...fixture, ...overrides }).success).toBe(false);
  });
});
