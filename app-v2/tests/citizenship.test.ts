import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCitizenship, citizenshipMentions, contentHash, extractCitizenship, parseRevertArgs, revertCitizenship } from "../lib/listings/citizenship";
import { listingSchema, type Listing } from "../lib/listings/schema";
import { fixture } from "./fixtures/listing";

const base = listingSchema.parse({
  ...fixture, synthetic: false,
  eligibility: { ...fixture.eligibility, citizenship: { requirement: "unknown", countries: [] }, criteria_text: null, criteria_stated: false },
});
const withText = (description: string): Listing => ({ ...base, description });

describe("citizenship extractor", () => {
  it.each([
    "Open to Nigerian students in their final year.",
    "This award is for Nigerian citizens.",
    "Applicants must be Nigerian nationals.",
    "Nigerians only.",
    "The programme is open to Nigerians aged 18 to 30.",
  ])("reads NG from %s", text => {
    const result = extractCitizenship(withText(text));
    expect(result).toEqual({ status: "match", citizenship: { requirement: "explicit", countries: ["NG"] }, evidence: text });
  });

  it.each([
    "The fellowship is open to all nationalities.",
    "Candidates from all countries may apply.",
    "We welcome applicants from any country.",
  ])("reads unconstrained from %s", text => {
    expect(extractCitizenship(withText(text))).toMatchObject({ status: "match", citizenship: { requirement: "unconstrained", countries: ["*"] } });
  });

  it("reads several named nationalities as sorted ISO codes", () => {
    expect(extractCitizenship(withText("Open to Kenyan, Ghanaian and Nigerian citizens."))).toMatchObject({
      status: "match", citizenship: { requirement: "explicit", countries: ["GH", "KE", "NG"] },
    });
  });

  it("reads the criteria text and education source wording", () => {
    const record = structuredClone(base);
    record.eligibility.criteria_text = "Applicants must be Ghanaian citizens.";
    expect(extractCitizenship(record)).toMatchObject({ status: "match", citizenship: { countries: ["GH"] } });
  });

  it.each([
    "Not open to Nigerian citizens.",
    "Open to all nationalities except Nigerians.",
    "Open to all countries excluding Ghana.",
    "Non-Nigerian students are welcome.",
  ])("sends negations to review: %s", text => {
    expect(extractCitizenship(withText(text))).toMatchObject({ status: "unclear", reason: "negation" });
  });

  it("sends conflicting matches to review", () => {
    expect(extractCitizenship(withText("Open to Nigerian students. Also open to all nationalities."))).toMatchObject({
      status: "unclear", reason: "conflict", suggestion: { requirement: "explicit", countries: ["NG"] },
    });
  });

  it("suggests only from sentences without a negation", () => {
    expect(extractCitizenship(withText("Open to all nationalities except Nigerians."))).toMatchObject({ suggestion: null });
    expect(extractCitizenship(withText("Open to Nigerian students. Non-Nigerian students are not eligible."))).toMatchObject({
      status: "unclear", suggestion: { requirement: "explicit", countries: ["NG"] },
    });
  });

  it.each([
    "SIWES placement for eligible Nigerian students.",
    "Six-month SIWES placement in Lagos.",
    "Must have completed NYSC or possess a valid exemption.",
    "Requirements: BSc in Accounting, completed NYSC, two years of experience.",
    "NYSC discharge certificate is required.",
    "Attach your valid NYSC exemption certificate.",
    "Nigerian undergraduates in 300 level may apply.",
    "Applicants from Nigeria are invited to apply.",
    "Applicants must be citizens of Nigeria.",
    "Young Nigerian women in technology.",
  ])("reads NG from the wider pattern: %s", text => {
    expect(extractCitizenship(withText(text))).toMatchObject({ status: "match", citizenship: { requirement: "explicit", countries: ["NG"] } });
  });

  it.each([
    "Applicants of all nationalities are welcome.",
    "Any nationality may apply.",
    "Selection is regardless of nationality.",
  ])("reads unconstrained from the wider pattern: %s", text => {
    expect(extractCitizenship(withText(text))).toMatchObject({ status: "match", citizenship: { countries: ["*"] } });
  });

  it("reads several countries named after from", () => {
    expect(extractCitizenship(withText("Open to candidates from Ghana and Kenya."))).toMatchObject({ citizenship: { countries: ["GH", "KE"] } });
  });

  it("reads the title", () => {
    expect(extractCitizenship({ ...base, title: "SIWES Internship 2027" })).toMatchObject({ status: "match", citizenship: { countries: ["NG"] } });
  });

  it("sends African regions to review without a suggestion", () => {
    expect(extractCitizenship(withText("Open to citizens of African countries."))).toMatchObject({ status: "unclear", reason: "region", suggestion: null });
  });

  it("keeps the negation guard on the wider patterns", () => {
    expect(extractCitizenship(withText("Open to all nationalities except applicants from Nigeria."))).toMatchObject({ status: "unclear", reason: "negation" });
    expect(extractCitizenship(withText("NYSC members are not eligible for this citizen scheme."))).toMatchObject({ status: "unclear", reason: "negation" });
  });

  it("lists mention sentences for the dry-run explanation", () => {
    expect(citizenshipMentions(withText("A great role. International exposure. Based in Lagos."))).toEqual(["International exposure."]);
  });

  it.each([
    "The programme lists recent tertiary graduates and current NYSC corps members.",
    "Open to NYSC corps members.",
    "Ideal for NYSC members, fresh graduates or final-year students.",
  ])("does not treat NYSC as one allowed group as citizenship: %s", text => {
    expect(extractCitizenship(withText(text))).toEqual({ status: "none" });
  });

  it("does not read a job location as citizenship", () => {
    expect(extractCitizenship(withText("The role is based in Nigeria. Remote work from Lagos is possible."))).toEqual({ status: "none" });
  });

  it("ignores the provider country and the word international", () => {
    expect(extractCitizenship(withText("An international scholarship from a Nigerian foundation."))).toEqual({ status: "none" });
    expect(extractCitizenship(base)).toEqual({ status: "none" });
  });

  it("skips withdrawn placeholder text", () => {
    expect(extractCitizenship(withText("[withdrawn]"))).toEqual({ status: "none" });
  });
});

describe("applying a citizenship decision", () => {
  const clock = new Date("2027-03-25T09:00:00Z");

  it("changes only citizenship, revision, updated_at and content_hash", () => {
    const updated = applyCitizenship(base, { requirement: "explicit", countries: ["NG"] }, clock);
    expect(updated.eligibility.citizenship).toEqual({ requirement: "explicit", countries: ["NG"] });
    expect(updated.revision).toBe(base.revision + 1);
    expect(updated.timestamps.updated_at).toBe(clock.toISOString());
    expect(updated.content_hash).toBe(contentHash(updated));
    expect(updated.content_hash).not.toBe(base.content_hash);
    expect(updated.verification).toEqual(base.verification);
    const strip = (record: Listing) => ({ ...record, eligibility: { ...record.eligibility, citizenship: null },
      revision: 0, content_hash: "", timestamps: { ...record.timestamps, updated_at: "" } });
    expect(strip(updated)).toEqual(strip(base));
    expect(base.eligibility.citizenship.requirement).toBe("unknown");
  });

  it("reverts a wrong decision to unknown, bumping revision and hash only", () => {
    const set = applyCitizenship(base, { requirement: "explicit", countries: ["NG"] }, clock);
    const later = new Date("2027-03-26T09:00:00Z");
    const reverted = revertCitizenship(set, later);
    expect(reverted.eligibility.citizenship).toEqual({ requirement: "unknown", countries: [] });
    expect(reverted.revision).toBe(set.revision + 1);
    expect(reverted.content_hash).toBe(contentHash(reverted));
    expect(reverted.verification).toEqual(set.verification);
    expect(() => revertCitizenship(reverted, later)).toThrow(RangeError);
  });

  it("parses the revert script arguments", () => {
    const id = "lst_VDK1Q876PKR48S015N411W80MC";
    expect(parseRevertArgs([id, "engrog", " NYSC listed as one group "])).toEqual({ apply: false, listingId: id, reviewer: "engrog", reason: "NYSC listed as one group" });
    expect(parseRevertArgs([id, "engrog", "reason", "--apply"])).toMatchObject({ apply: true });
    expect(parseRevertArgs(["lst_bad", "engrog", "reason"])).toBeNull();
    expect(parseRevertArgs([id, "engrog", "  "])).toBeNull();
    expect(parseRevertArgs([id, "Eng Rog", "reason"])).toBeNull();
  });

  it("the revert script reads by id, not the active feed, and never calls process.exit", () => {
    const script = readFileSync(new URL("../scripts/revert-citizenship.mjs", import.meta.url), "utf8");
    expect(script).toContain('rpc("citizenship_listing"');
    expect(script).not.toContain("partner_listings");
    expect(script).not.toMatch(/process\.exit\(/);
  });

  it("refuses a listing that already has a citizenship rule", () => {
    const set = applyCitizenship(base, { requirement: "unconstrained", countries: ["*"] }, clock);
    expect(() => applyCitizenship(set, { requirement: "explicit", countries: ["NG"] }, clock)).toThrow(RangeError);
  });
});
