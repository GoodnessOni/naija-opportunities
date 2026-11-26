import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { listingSchema } from "../lib/listings/schema";
import { contractFixtures, tombstone, scholarshipFixed } from "./fixtures/contract";

vi.mock("../lib/listings/partner-feed", async (original) => ({
  ...(await original<typeof import("../lib/listings/partner-feed")>()),
  readPartnerListings: vi.fn(),
}));
const feed = await import("../lib/listings/partner-feed");
const { GET } = await import("../app/api/v1/listings/[listing_id]/route");

describe("contract fixtures", () => {
  for (const [name, record] of Object.entries(contractFixtures)) {
    it(`${name} is a valid schema 1.0.0 record`, () => {
      const result = listingSchema.safeParse(record);
      expect(result.error?.issues ?? []).toEqual([]);
      expect(record.synthetic).toBe(true);
    });
  }
});

describe("GET /api/v1/listings/{listing_id}", () => {
  const key = "partner-test-key";
  const call = (id: string, auth = `Bearer ${key}`) =>
    GET(new Request(`http://x/api/v1/listings/${id}`, { headers: { authorization: auth } }), { params: Promise.resolve({ listing_id: id }) });
  beforeEach(() => {
    process.env.FEED_API_KEY_HASHES = createHash("sha256").update(key).digest("hex");
    vi.mocked(feed.readPartnerListings).mockReset();
  });

  it("rejects a wrong key", async () => {
    expect((await call(scholarshipFixed.listing_id, "Bearer nope")).status).toBe(401);
  });

  it("returns the active record", async () => {
    vi.mocked(feed.readPartnerListings).mockResolvedValue([{ listing_id: scholarshipFixed.listing_id, record: scholarshipFixed, reason: null }] as never);
    const response = await call(scholarshipFixed.listing_id);
    expect(response.status).toBe(200);
    expect((await response.json()).listing.listing_id).toBe(scholarshipFixed.listing_id);
  });

  for (const reason of ["withdrawn", "stale", "expired_deadline", "closed", "not_found"]) {
    it(`returns only the reason "${reason}" for an inactive listing, never its text`, async () => {
      vi.mocked(feed.readPartnerListings).mockResolvedValue([{ listing_id: tombstone.listing_id, record: null, reason }] as never);
      const response = await call(tombstone.listing_id);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: reason });
    });
  }
});

describe("PathSync fixture handoff file", () => {
  it("docs/pathsync-contract-fixtures.json matches the fixtures (update with vitest -u)", async () => {
    const f = contractFixtures;
    const handoff = {
      note: "Synthetic schema 1.0.0 fixtures. Generated from app-v2/tests/fixtures/contract.ts; do not edit by hand.",
      active_feed_page: { evaluation_time: "2027-03-24T09:00:00Z", listings: [f.scholarshipFixed, f.internshipRolling, f.job], cursor: null },
      inactive_lookups: { [f.expiredHistorical.listing_id]: { error: "expired_deadline" }, [f.tombstone.listing_id]: { error: "withdrawn" } },
      records: f,
    };
    await expect(JSON.stringify(handoff, null, 2) + "\n").toMatchFileSnapshot("../docs/pathsync-contract-fixtures.json");
  });
});

describe("FEED_API_KEY_HASHES parsing", () => {
  it("accepts a digest pasted with spaces, a newline or upper case", async () => {
    const key = "partner-test-key";
    process.env.FEED_API_KEY_HASHES = ` ${createHash("sha256").update(key).digest("hex").toUpperCase()} \n`;
    const { authorizedPartner } = await import("../lib/listings/partner-feed");
    expect(authorizedPartner(new Request("http://x", { headers: { authorization: `Bearer ${key}` } }))).toBe(true);
  });
});
