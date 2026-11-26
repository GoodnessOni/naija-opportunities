import { createHash } from "node:crypto";
import { listingSchema, type Listing } from "./schema.ts";

/**
 * Deterministic citizenship extractor. No language model: exact phrase rules only.
 * A clear match is applied automatically. Anything with a negation, a limit or a
 * conflict stays "unknown" and goes to staff review with the sentence as evidence.
 */

type Citizenship = Listing["eligibility"]["citizenship"];
export type CitizenshipResult =
  | { status: "match"; citizenship: Citizenship; evidence: string }
  | { status: "unclear"; reason: "negation" | "conflict"; suggestion: Citizenship | null; evidence: string }
  | { status: "none" };

const NATIONALITIES: Record<string, string> = {
  nigerian: "NG", nigerians: "NG", ghanaian: "GH", ghanaians: "GH", kenyan: "KE", kenyans: "KE",
  "south african": "ZA", "south africans": "ZA", ugandan: "UG", ugandans: "UG", rwandan: "RW", rwandans: "RW",
  tanzanian: "TZ", tanzanians: "TZ", ethiopian: "ET", ethiopians: "ET", cameroonian: "CM", cameroonians: "CM",
  senegalese: "SN", egyptian: "EG", egyptians: "EG", zambian: "ZM", zambians: "ZM", zimbabwean: "ZW", zimbabweans: "ZW",
  british: "GB", american: "US", americans: "US", canadian: "CA", canadians: "CA", indian: "IN", indians: "IN",
};
const NAMES = Object.keys(NATIONALITIES).sort((a, b) => b.length - a.length).join("|");
const PEOPLE = "students|citizens|nationals|applicants|residents|graduates|youths?";

const rules: { pattern: RegExp; codes: (match: RegExpMatchArray) => string[] }[] = [
  { pattern: /\bnigerians only\b/i, codes: () => ["NG"] },
  { pattern: /\bopen to nigerians\b/i, codes: () => ["NG"] },
  { pattern: /\bopen to all nationalities\b/i, codes: () => ["*"] },
  { pattern: /\ball countries\b/i, codes: () => ["*"] },
  { pattern: /\bapplicants from any country\b/i, codes: () => ["*"] },
  { pattern: new RegExp(`\\b(${NAMES})(?:\\s*(?:,|and|or|&)\\s*(${NAMES}))*\\s+(?:${PEOPLE})\\b`, "gi"), codes: match =>
    [...match[0].matchAll(new RegExp(`\\b(${NAMES})\\b`, "gi"))].map(name => NATIONALITIES[name[1].toLowerCase()]) },
];
const NEGATION = /\b(not open to|except|excluding|non-nigerians?|not eligible|ineligible|cannot apply|may not apply)\b/i;

function sentences(record: Listing): string[] {
  const { eligibility, summary, description } = record;
  return [eligibility.education.source_wording, eligibility.criteria_text, summary, description]
    .filter((value): value is string => Boolean(value) && value !== "[withdrawn]")
    .flatMap(value => value.split(/(?<=[.!?])\s+|\n+/))
    .map(value => value.trim()).filter(Boolean);
}

function toCitizenship(codes: string[]): Citizenship {
  if (codes.includes("*")) return { requirement: "unconstrained", countries: ["*"] };
  return { requirement: "explicit", countries: [...new Set(codes)].sort() };
}

function suggest(found: { codes: string[] }[]): Citizenship | null {
  const explicit = found.flatMap(item => item.codes).filter(code => code !== "*");
  if (explicit.length) return toCitizenship(explicit);
  return found.length ? toCitizenship(["*"]) : null;
}

export function extractCitizenship(record: Listing): CitizenshipResult {
  const found: { codes: string[]; sentence: string }[] = [];
  const negated: string[] = [];
  for (const sentence of sentences(record)) {
    if (NEGATION.test(sentence) && /\b(nationalit|citizen|national|countr|nigerian)/i.test(sentence)) {
      negated.push(sentence);
      continue;
    }
    for (const rule of rules) {
      for (const match of sentence.matchAll(new RegExp(rule.pattern.source, "gi"))) {
        found.push({ codes: rule.codes(match), sentence });
      }
    }
  }
  const quote = (values: string[]) => [...new Set(values)].join(" | ").slice(0, 1000);
  if (negated.length) {
    return { status: "unclear", reason: "negation", suggestion: suggest(found), evidence: quote([...negated, ...found.map(item => item.sentence)]) };
  }
  if (!found.length) return { status: "none" };
  const keys = new Set(found.map(item => toCitizenship(item.codes).countries.join(",")));
  if (keys.size > 1) {
    return { status: "unclear", reason: "conflict", suggestion: suggest(found), evidence: quote(found.map(item => item.sentence)) };
  }
  return { status: "match", citizenship: toCitizenship(found[0].codes), evidence: found[0].sentence.slice(0, 1000) };
}

export function contentHash(record: Omit<Listing, "content_hash"> & { content_hash?: string }) {
  const { content_hash, ...fields } = record;
  void content_hash;
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

/** Sets only the citizenship field, then bumps revision, updated_at and content_hash. Freshness is untouched. */
export function applyCitizenship(record: Listing, citizenship: Citizenship, clock: Date): Listing {
  if (record.eligibility.citizenship.requirement !== "unknown") throw new RangeError("Citizenship is already set");
  const updated = structuredClone(record);
  updated.eligibility.citizenship = citizenship;
  updated.revision++;
  updated.timestamps.updated_at = clock.toISOString();
  updated.content_hash = contentHash(updated);
  return listingSchema.parse(updated);
}
