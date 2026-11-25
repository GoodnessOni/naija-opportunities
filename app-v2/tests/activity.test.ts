import { describe, expect, it } from "vitest";
import { planActivityWrite } from "../lib/activity";
import { authCookieDomain } from "../lib/supabase/cookie-domain";

const base = { listingId: "lst_01JD2Z8Q4X7K9M3N5P6R8S0T1V", userId: "u1", confirmed: false, now: new Date("2026-11-25T10:00:00Z") };

describe("planActivityWrite", () => {
  it("Interested inserts once and never overwrites an existing record", () => {
    const first = planActivityWrite({ ...base, action: "interested" });
    const retry = planActivityWrite({ ...base, action: "interested" });
    expect(first).toEqual(retry);
    expect(first).toMatchObject({ kind: "upsert", keepExisting: true, row: { status: "interested", applied_at: null } });
  });
  it("Applied requires the confirmation box", () => {
    expect(planActivityWrite({ ...base, action: "applied" }).kind).toBe("error");
    expect(planActivityWrite({ ...base, action: "applied", confirmed: true }))
      .toMatchObject({ kind: "upsert", keepExisting: false, row: { status: "applied", applied_at: "2026-11-25T10:00:00.000Z" } });
  });
  it("undo returns to Interested and clears applied_at", () => {
    expect(planActivityWrite({ ...base, action: "not_applied" })).toMatchObject({ row: { status: "interested", applied_at: null } });
  });
  it("requires a signed-in user and a valid listing id", () => {
    expect(planActivityWrite({ ...base, userId: "", action: "interested" }).kind).toBe("error");
    expect(planActivityWrite({ ...base, listingId: "lst_x", action: "interested" }).kind).toBe("error");
    expect(planActivityWrite({ ...base, action: "clicked" }).kind).toBe("error");
  });
});

describe("authCookieDomain", () => {
  it("shares the cookie only in production on naijaopportunities.live", () => {
    expect(authCookieDomain("naijaopportunities.live", "production")).toBe(".naijaopportunities.live");
    expect(authCookieDomain("pathsync-ai.naijaopportunities.live:443", "production")).toBe(".naijaopportunities.live");
    expect(authCookieDomain("naijaopportunities.live", "development")).toBeUndefined();
    expect(authCookieDomain("naija-opportunities-v3.vercel.app", "production")).toBeUndefined();
    expect(authCookieDomain("evilnaijaopportunities.live", "production")).toBeUndefined();
    expect(authCookieDomain("localhost:3000", "production")).toBeUndefined();
  });
});
