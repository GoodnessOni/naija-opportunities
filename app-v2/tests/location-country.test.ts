import { describe, expect, it } from "vitest";
import { countryFromLocation, employerLocation } from "../lib/listings/location-country";
import { makeGreenhouseDraft } from "../lib/listings/submission";
import { createHash } from "node:crypto";

describe("country from employer location", () => {
  it.each([
    ["Lagos, Nigeria", "NG"], ["Remote, Nigeria", "NG"], ["Nigeria", "NG"], ["Abuja", "NG"],
    ["Lagos State", "NG"], ["Lagos, Nigeria; Abuja, Nigeria", "NG"], ["Hybrid - Lagos, Nigeria", "NG"],
    ["London, United Kingdom", "GB"], ["Nairobi, Kenya", "KE"], ["Remote (Ghana)", "GH"], ["Berlin, Germany", "DE"],
  ])("%s gives %s", (text, code) => {
    expect(countryFromLocation(text)).toBe(code);
  });

  it.each([
    "Lagos", "Remote", "Home based - EMEA", "Home based - Worldwide", "Lagos, Nigeria; London, United Kingdom",
    "Nigeria or Kenya", "Some City", "", null, "EMEA",
  ])("%s is unclear (ZZ)", text => {
    expect(countryFromLocation(text)).toBe("ZZ");
  });

  it("reads the importer's summary line", () => {
    expect(employerLocation("Location listed by the employer: Lagos, Nigeria")).toBe("Lagos, Nigeria");
    expect(employerLocation("See the employer's listing for details.")).toBeNull();
  });
});

describe("Greenhouse drafts", () => {
  const clock = new Date("2027-03-25T09:00:00Z");
  const candidate = { source_key: "greenhouse:moniepoint:123", title: "Backend Engineer", source_url: "https://example.org/jobs/123" };

  it("set location.country from the employer location and keep a valid content hash", () => {
    const draft = makeGreenhouseDraft("Moniepoint", { ...candidate, location: "Lagos, Nigeria" }, clock);
    expect(draft.location.country).toBe("NG");
    const { content_hash, ...fields } = draft;
    expect(createHash("sha256").update(JSON.stringify(fields)).digest("hex")).toBe(content_hash);
  });

  it("leave citizenship and provider country alone", () => {
    const draft = makeGreenhouseDraft("Moniepoint", { ...candidate, location: "Lagos, Nigeria" }, clock);
    expect(draft.eligibility.citizenship).toEqual({ requirement: "unknown", countries: [] });
    expect(draft.provider.country).toBe("ZZ");
  });

  it("use ZZ when the location is unclear", () => {
    expect(makeGreenhouseDraft("Canonical", { ...candidate, location: "Home based - EMEA" }, clock).location.country).toBe("ZZ");
  });
});
