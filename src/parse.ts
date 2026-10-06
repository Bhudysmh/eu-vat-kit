/** VAT prefixes of the 27 EU member states. Greece uses EL, not GR. */
const PATTERNS: Record<string, RegExp> = {
  AT: /^ATU\d{8}$/,
  BE: /^BE[01]\d{9}$/,
  BG: /^BG\d{9,10}$/,
  CY: /^CY\d{8}[A-Z]$/,
  CZ: /^CZ\d{8,10}$/,
  DE: /^DE\d{9}$/,
  DK: /^DK\d{8}$/,
  EE: /^EE\d{9}$/,
  EL: /^EL\d{9}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^FI\d{8}$/,
  FR: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/,
  HR: /^HR\d{11}$/,
  HU: /^HU\d{8}$/,
  IE: /^IE(\d{7}[A-W][A-IW]?|\d[A-Z+*]\d{5}[A-W])$/,
  IT: /^IT\d{11}$/,
  LT: /^LT(\d{9}|\d{12})$/,
  LU: /^LU\d{8}$/,
  LV: /^LV\d{11}$/,
  MT: /^MT\d{8}$/,
  NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/,
  PT: /^PT\d{9}$/,
  RO: /^RO\d{2,10}$/,
  SE: /^SE\d{12}$/,
  SI: /^SI\d{8}$/,
  SK: /^SK\d{10}$/,
};

export const EU_COUNTRIES = Object.keys(PATTERNS);

export type ParsedVatId =
  | { ok: true; country: string; number: string; normalized: string }
  | { ok: false; reason: string };

/** Map an ISO country code to the VAT prefix (GR -> EL). Returns undefined if not an EU member. */
export function vatPrefix(code: string): string | undefined {
  const c = code.trim().toUpperCase();
  const p = c === "GR" ? "EL" : c;
  return p in PATTERNS ? p : undefined;
}

/**
 * Normalise and format-check an EU VAT ID. Format only: whether the number is
 * registered is a VIES question. Northern Ireland (XI) and non-EU IDs are
 * refused rather than guessed.
 */
export function parseVatId(input: string): ParsedVatId {
  const normalized = input.replace(/[\s.\-]/g, "").toUpperCase();
  if (normalized.length < 4) return { ok: false, reason: "too short" };
  const prefix = normalized.slice(0, 2);
  const pattern = PATTERNS[prefix];
  if (!pattern) return { ok: false, reason: `unsupported or unknown country prefix "${prefix}"` };
  if (!pattern.test(normalized)) return { ok: false, reason: `not a valid ${prefix} VAT number format` };
  return { ok: true, country: prefix, number: normalized.slice(2), normalized };
}
