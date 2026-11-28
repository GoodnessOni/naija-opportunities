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
  | { status: "unclear"; reason: "negation" | "conflict" | "region"; suggestion: Citizenship | null; evidence: string }
  | { status: "none" };

const NATIONALITIES: Record<string, string> = {
  nigerian: "NG", nigerians: "NG", ghanaian: "GH", ghanaians: "GH", kenyan: "KE", kenyans: "KE",
  "south african": "ZA", "south africans": "ZA", ugandan: "UG", ugandans: "UG", rwandan: "RW", rwandans: "RW",
  tanzanian: "TZ", tanzanians: "TZ", ethiopian: "ET", ethiopians: "ET", cameroonian: "CM", cameroonians: "CM",
  senegalese: "SN", egyptian: "EG", egyptians: "EG", zambian: "ZM", zambians: "ZM", zimbabwean: "ZW", zimbabweans: "ZW",
  british: "GB", american: "US", americans: "US", canadian: "CA", canadians: "CA", indian: "IN", indians: "IN",
};
const COUNTRIES: Record<string, string> = {
  nigeria: "NG", ghana: "GH", kenya: "KE", "south africa": "ZA", uganda: "UG", rwanda: "RW", tanzania: "TZ",
  ethiopia: "ET", cameroon: "CM", senegal: "SN", egypt: "EG", zambia: "ZM", zimbabwe: "ZW",
};
const NAMES = Object.keys(NATIONALITIES).sort((a, b) => b.length - a.length).join("|");
const PLACES = Object.keys(COUNTRIES).sort((a, b) => b.length - a.length).join("|");
const PEOPLE = "students?|citizens?|nationals?|applicants?|candidates?|residents?|graduates?|undergraduates?|postgraduates?|" +
  "youths?|young people|women|men|professionals|engineers|developers|entrepreneurs|founders|researchers|scholars|" +
  "talents?|individuals|persons|people|corps members";
const PERSON = "applicants?|candidates?|students?|graduates?|undergraduates?|citizens?|nationals?|youths?|individuals|people|talents?";
const codesOf = (text: string, map: Record<string, string>, names: string) =>
  [...text.matchAll(new RegExp(String.raw`\b(${names})\b`, "gi"))].map(name => map[name[1].toLowerCase()]);
const LIST = (names: string) => String.raw`(?:${names})(?:\s*(?:,|and|or|&)\s*(?:${names}))*`;

const rules: { pattern: RegExp; codes: (match: RegExpMatchArray) => string[] }[] = [
  { pattern: /\bnigerians only\b/i, codes: () => ["NG"] },
  { pattern: /\bopen to nigerians\b/i, codes: () => ["NG"] },
  // SIWES is a Nigeria-only student scheme, so a SIWES placement is NG.
  { pattern: /\bsiwes\b/i, codes: () => ["NG"] },
  // NYSC only when it is required, not when corps members are one of several allowed groups.
  { pattern: /\b(?:must|should|need to|required to) (?:have )?(?:completed|finished|done) (?:the )?nysc\b/i, codes: () => ["NG"] },
  { pattern: /\b(?:completed|completion of) (?:the )?nysc\b/i, codes: () => ["NG"] },
  { pattern: /\bnysc (?:discharge |exemption )?(?:certificate|certification) (?:is )?(?:required|mandatory|compulsory)\b/i, codes: () => ["NG"] },
  { pattern: /\b(?:valid |original )?nysc (?:discharge|exemption) certificate\b/i, codes: () => ["NG"] },
  { pattern: /\b(?:open to )?(?:all|any) nationalit(?:y|ies)\b/i, codes: () => ["*"] },
  { pattern: /\bregardless of (?:nationality|citizenship|country of origin)\b/i, codes: () => ["*"] },
  { pattern: /\ball countries\b/i, codes: () => ["*"] },
  { pattern: /\b(?:applicants|candidates|students) from any country\b/i, codes: () => ["*"] },
  { pattern: new RegExp(String.raw`\b${LIST(NAMES)}\s+(?:${PEOPLE})\b`, "i"), codes: match => codesOf(match[0], NATIONALITIES, NAMES) },
  { pattern: new RegExp(String.raw`\b(?:${PERSON})\s+(?:from|of)\s+${LIST(PLACES)}\b`, "i"), codes: match => codesOf(match[0], COUNTRIES, PLACES) },
  { pattern: new RegExp(String.raw`\b(?:citizens?|nationals?|citizenship) of\s+${LIST(PLACES)}\b`, "i"), codes: match => codesOf(match[0], COUNTRIES, PLACES) },
];
// A region is too wide for the 20-country contract field, so it goes to staff review.
const REGION = /\b(african countries|african nationals|african citizens|citizens of (?:an?|any) african|sub-saharan africa(?:n)?\s+(?:countries|nationals|citizens)|africans)\b/i;
const NEGATION = /\b(not open to|except|excluding|non-nigerians?|not eligible|ineligible|cannot apply|may not apply)\b/i;
const MENTION = /\b(nationalit\w*|citizen\w*|nationals?|countr\w*|residen\w*|international|nigerians?|nigeria|africa\w*|siwes|nysc)\b/i;

/** Sentences that mention nationality, country, citizen, resident or "international"; for dry-run explanations. */
export function citizenshipMentions(record: Listing): string[] {
  return sentences(record).filter(sentence => MENTION.test(sentence));
}

function sentences(record: Listing): string[] {
  const { eligibility, title, summary, description } = record;
  return [title, eligibility.education.source_wording, eligibility.criteria_text, summary, description]
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
  const regional = sentences(record).filter(sentence => REGION.test(sentence) && !negated.includes(sentence));
  if (regional.length && !negated.length) {
    return { status: "unclear", reason: "region", suggestion: null, evidence: quote([...regional, ...found.map(item => item.sentence)]) };
  }
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

/** Undoes a wrong automated decision: citizenship back to unknown, revision, updated_at and content_hash bumped. */
export function revertCitizenship(record: Listing, clock: Date): Listing {
  if (record.eligibility.citizenship.requirement === "unknown") throw new RangeError("Citizenship is already unknown");
  const updated = structuredClone(record);
  updated.eligibility.citizenship = { requirement: "unknown", countries: [] };
  updated.revision++;
  updated.timestamps.updated_at = clock.toISOString();
  updated.content_hash = contentHash(updated);
  return listingSchema.parse(updated);
}
