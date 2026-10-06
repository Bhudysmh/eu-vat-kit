import { vatPrefix } from "./parse.js";
import type { ViesResult } from "./vies.js";

export type VatDecision =
  | { treatment: "domestic"; reason: string }
  | { treatment: "reverse-charge"; reason: string }
  /** The library does not know. A human (or a better-informed rule) must decide. */
  | { treatment: "refuse"; reason: string };

export interface DecisionInput {
  sellerCountry: string;
  buyerCountry: string;
  /** Business customer with a VAT ID? false = consumer. */
  buyerIsBusiness: boolean;
  /** Result of checkVies() for the buyer's VAT ID. Required for reverse charge. */
  buyerVies?: ViesResult;
}

/**
 * Narrow rule for B2B services within the EU:
 *  - same country -> domestic VAT of that country
 *  - different EU country + business + VIES "valid" for the buyer's country -> reverse charge
 *  - everything else (consumers, VIES unavailable/invalid, non-EU, goods) -> refuse
 * Goods, digital B2C (OSS), exemptions and thresholds are NOT handled: the
 * function assumes B2B services and says so by refusing the rest.
 */
export function decideVat(i: DecisionInput): VatDecision {
  const seller = vatPrefix(i.sellerCountry);
  const buyer = vatPrefix(i.buyerCountry);
  if (!seller) return { treatment: "refuse", reason: "seller is not in an EU member state" };
  if (!buyer) return { treatment: "refuse", reason: "buyer is not in an EU member state" };
  if (!i.buyerIsBusiness) return { treatment: "refuse", reason: "consumer sale: destination rules/OSS are not handled" };

  if (seller === buyer) return { treatment: "domestic", reason: `both in ${seller}` };

  const v = i.buyerVies;
  if (!v) return { treatment: "refuse", reason: "no VIES result for the buyer" };
  if (v.status !== "valid") return { treatment: "refuse", reason: `buyer VAT ID not confirmed (VIES: ${v.status})` };
  if (v.country !== buyer) return { treatment: "refuse", reason: "VIES country differs from the buyer's country" };
  return { treatment: "reverse-charge", reason: `B2B service, valid ${buyer} VAT ID confirmed by VIES` };
}
