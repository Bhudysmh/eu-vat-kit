import { vatPrefix } from "./parse.js";

/**
 * STANDARD rates only. Reduced, super-reduced and parking rates depend on what
 * is sold and are deliberately not included: a wrong reduced rate is worse than
 * none. Source: third-party aggregators (hellotax, eurofiscalis, taxenlight),
 * checked 6 Oct 2026. The official source is the Commission's TEDB; re-check
 * against it before relying on this for filings.
 */
export const RATES_CHECKED_AT = "2026-10-06";

const STANDARD: Record<string, number> = {
  AT: 20, BE: 21, BG: 20, CY: 19, CZ: 21, DE: 19, DK: 25, EE: 24, EL: 24,
  ES: 21, FI: 25.5, FR: 20, HR: 25, HU: 27, IE: 23, IT: 22, LT: 21, LU: 17,
  LV: 21, MT: 18, NL: 21, PL: 23, PT: 23, RO: 21, SE: 25, SI: 22, SK: 23,
};

export interface StandardRate {
  country: string;
  rate: number;
  checkedAt: string;
}

/** Standard VAT rate in percent, or undefined for a non-EU / unknown country (never a guess). */
export function standardVatRate(country: string): StandardRate | undefined {
  const p = vatPrefix(country);
  if (!p) return undefined;
  return { country: p, rate: STANDARD[p], checkedAt: RATES_CHECKED_AT };
}
