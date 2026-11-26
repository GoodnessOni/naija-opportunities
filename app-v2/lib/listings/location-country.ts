/**
 * Work location country (ISO alpha-2) from an employer's location text, such as Greenhouse's
 * "Lagos, Nigeria". A location fact only: it never sets citizenship. Returns "ZZ" unless
 * every part of the text names the same single country.
 */

const COUNTRIES: Record<string, string> = {
  nigeria: "NG", ghana: "GH", kenya: "KE", "south africa": "ZA", egypt: "EG", morocco: "MA", rwanda: "RW",
  uganda: "UG", tanzania: "TZ", senegal: "SN", ethiopia: "ET", "cote d'ivoire": "CI", "ivory coast": "CI",
  cameroon: "CM", zambia: "ZM", zimbabwe: "ZW", tunisia: "TN", algeria: "DZ",
  "united kingdom": "GB", uk: "GB", england: "GB", scotland: "GB", wales: "GB", ireland: "IE",
  "united states": "US", "united states of america": "US", usa: "US", canada: "CA", mexico: "MX", brazil: "BR",
  germany: "DE", france: "FR", netherlands: "NL", "the netherlands": "NL", spain: "ES", portugal: "PT", italy: "IT",
  belgium: "BE", switzerland: "CH", austria: "AT", poland: "PL", sweden: "SE", denmark: "DK", norway: "NO",
  finland: "FI", "czech republic": "CZ", czechia: "CZ", romania: "RO", greece: "GR", estonia: "EE", lithuania: "LT",
  "united arab emirates": "AE", uae: "AE", "saudi arabia": "SA", israel: "IL", turkey: "TR", india: "IN",
  pakistan: "PK", singapore: "SG", japan: "JP", "south korea": "KR", china: "CN", philippines: "PH",
  indonesia: "ID", malaysia: "MY", vietnam: "VN", australia: "AU", "new zealand": "NZ",
};
// Nigerian places that cannot be mistaken for another country. "Lagos" alone is left out (Lagos, Portugal).
const NIGERIAN_PLACES = /^(?:lagos state|abuja|fct|federal capital territory|port harcourt|ibadan|kano|enugu|kaduna|ikeja|lekki|ajah|victoria island|yaba)$/i;
const NON_PLACES = /^(?:remote|hybrid|on[- ]?site|onsite|home based|anywhere|worldwide|global|emea|apac|americas|europe|africa|latam|hq|office)$/i;

function partCountry(part: string): string | null | undefined {
  // Returns a code, null when the part is not a place (e.g. "Remote"), or undefined when unknown.
  const pieces = part.split(/,|\s+-\s+|\(|\)/).map(piece => piece.trim().replace(/\.$/, "")).filter(Boolean);
  const codes = new Set<string>();
  let unknown = false;
  for (const piece of pieces) {
    const key = piece.toLowerCase();
    if (COUNTRIES[key]) codes.add(COUNTRIES[key]);
    else if (NIGERIAN_PLACES.test(piece)) codes.add("NG");
    else if (!NON_PLACES.test(piece)) unknown = true;
  }
  if (codes.size > 1) return undefined;
  if (codes.size === 1) return [...codes][0];
  return unknown ? undefined : null;
}

export function countryFromLocation(location: string | null | undefined): string {
  if (!location?.trim()) return "ZZ";
  const parts = location.split(/;|\||\/|\s+or\s+|\n/i).map(part => part.trim()).filter(Boolean);
  const codes = new Set<string>();
  for (const part of parts) {
    const code = partCountry(part);
    if (code === undefined) return "ZZ";
    if (code) codes.add(code);
  }
  return codes.size === 1 ? [...codes][0] : "ZZ";
}

const EMPLOYER_LOCATION = /^Location listed by the employer: (.+)$/;

/** The employer location the Greenhouse importer stores in the summary, or null. */
export function employerLocation(summary: string): string | null {
  return EMPLOYER_LOCATION.exec(summary)?.[1] ?? null;
}
