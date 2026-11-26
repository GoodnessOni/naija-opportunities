import { describe, expect, it } from "vitest";
import { applyCitizenship, contentHash, extractCitizenship } from "../lib/listings/citizenship";
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

  it("refuses a listing that already has a citizenship rule", () => {
    const set = applyCitizenship(base, { requirement: "unconstrained", countries: ["*"] }, clock);
    expect(() => applyCitizenship(set, { requirement: "explicit", countries: ["NG"] }, clock)).toThrow(RangeError);
  });
});
