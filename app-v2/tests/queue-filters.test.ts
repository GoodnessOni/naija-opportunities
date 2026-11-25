import { describe, expect, it } from "vitest";
import { filterQueue, needsOfficialUrl, queueState } from "../lib/listings/queue-filters";
import { listingSchema, type Listing } from "../lib/listings/schema";
import { fixture } from "./fixtures/listing";
import { internshipRolling, job } from "./fixtures/contract";

const draft = listingSchema.parse(fixture);
const intern = listingSchema.parse(internshipRolling);
const aggregator: Listing = { ...listingSchema.parse(job), application: { ...job.application, url_kind: "aggregator_page" } } as Listing;
const failed: Listing = { ...intern, listing_id: "lst_00000000000000000000000F01", verification: { ...intern.verification, last_attempt_outcome: "failed" } };
const all = [draft, intern, aggregator, failed];

describe("staff queue filters", () => {
  it("flags listings without an official application or source link", () => {
    expect(needsOfficialUrl(draft)).toBe(false);
    expect(needsOfficialUrl(aggregator)).toBe(true);
  });
  it("classifies drafts, due rechecks and inconclusive checks", () => {
    expect(queueState(draft)).toBe("draft");
    expect(queueState(intern)).toBe("due");
    expect(queueState(failed)).toBe("inconclusive");
  });
  it("filters by kind, state and assignment", () => {
    const none = { kind: "all", state: "all", owner: "all" } as const;
    expect(filterQueue(all, { ...none, kind: "internship" }, {}, "ada")).toEqual([intern, failed]);
    expect(filterQueue(all, { ...none, state: "needs_official_url" }, {}, "ada")).toEqual([aggregator]);
    const owners = { [intern.listing_id]: "ada", [failed.listing_id]: "tunde" };
    expect(filterQueue(all, { ...none, owner: "mine" }, owners, "ada")).toEqual([intern]);
    expect(filterQueue(all, { ...none, owner: "unassigned" }, owners, "ada")).toEqual([draft, aggregator]);
  });
});
