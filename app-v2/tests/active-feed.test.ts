import { describe, expect, it } from "vitest";
import { buildActiveFeed, FRESHNESS_MS, type FeedRecord, type VerificationDecision } from "../lib/listings/active-feed";

const checked = new Date("2027-03-24T22:59:59Z");
const freshUntil = new Date(checked.getTime() + FRESHNESS_MS);
const listing: FeedRecord = {
  listing_id: "lst_00000000000000000000000001",
  synthetic: false,
  lifecycle: { publication_status: "published", status: "open" },
  deadline: { kind: "rolling", fixed_at: null },
  verification: { state: "verified", outcome: "confirmed_open", fresh_until: freshUntil.toISOString() },
};
const decisions = new Map<string, VerificationDecision>([[listing.listing_id, "confirmed_open"]]);

describe("active feed", () => {
  it("includes the last second of the seven-day verification window", () => {
    expect(buildActiveFeed([listing], decisions, freshUntil).active).toEqual([listing]);
    const next = new Date(freshUntil.getTime() + 1000);
    expect(buildActiveFeed([listing], decisions, next).excluded[0].reason).toBe("stale");
  });

  it("applies a fixed deadline independently of the freshness window", () => {
    const deadline = new Date("2027-03-30T22:59:59Z");
    const fixed: FeedRecord = { ...listing, deadline: { kind: "fixed", fixed_at: deadline.toISOString() } };
    expect(buildActiveFeed([fixed], decisions, deadline).active).toEqual([fixed]);
    expect(buildActiveFeed([fixed], decisions, new Date(deadline.getTime() + 1000)).excluded[0].reason)
      .toBe("expired_deadline");
  });

  it("hides drafts, withdrawals, closed rows, and synthetic rows regardless of verification", () => {
    const variants: FeedRecord[] = [
      { ...listing, synthetic: true },
      { ...listing, lifecycle: { publication_status: "draft", status: "open" } },
      { ...listing, lifecycle: { publication_status: "withdrawn", status: "open" } },
      { ...listing, lifecycle: { publication_status: "published", status: "closed" } },
    ];
    expect(variants.map(row => buildActiveFeed([row], decisions, checked).excluded[0].reason))
      .toEqual(Array(4).fill("not_on_active_feed"));
  });

  it("fails closed when the verification decision is missing", () => {
    expect(buildActiveFeed([listing], new Map(), checked).excluded[0].reason).toBe("missing");
  });
});
