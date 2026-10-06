# eu-vat-kit

Small, dependency-free TypeScript helpers for EU VAT in invoicing code.
Node 18+. MIT.

It does four things and **refuses when it is unsure**: a refused invoice is
better than a wrong one.

```ts
import { parseVatId, checkVies, standardVatRate, decideVat } from "eu-vat-kit";

parseVatId("nl 0000.99.998.B57");
// { ok: true, country: "NL", number: "000099998B57", normalized: "NL000099998B57" }

const vies = await checkVies("DE123456789");
// { status: "valid" | "invalid" | "unavailable" | "malformed", ... }

standardVatRate("NL");
// { country: "NL", rate: 21, checkedAt: "2026-10-06" }

decideVat({ sellerCountry: "NL", buyerCountry: "DE", buyerIsBusiness: true, buyerVies: vies });
// { treatment: "reverse-charge" | "domestic" | "refuse", reason: "..." }
```

## What each part promises

- **`parseVatId`**: normalises (spaces, dots, dashes, case) and checks the
  format of the 27 EU member states. Format only; no checksum. Greece is `EL`.
  Northern Ireland (`XI`), the UK and non-EU IDs are refused.
- **`checkVies`**: calls the European Commission's VIES REST API. An outage,
  timeout or "member state unavailable" returns `unavailable`, never `invalid`.
  Pass `requester` (your own VAT ID) to get a consultation number as proof.
  Keep `requestDate` and `requestIdentifier` with the invoice.
- **`standardVatRate`**: **standard rates only**, in percent, with the date
  they were checked. Reduced rates depend on what you sell and are left out on
  purpose. Unknown country returns `undefined`.
- **`decideVat`**: a deliberately narrow rule for **B2B services inside the
  EU**: same country is domestic; a different EU country with a VIES-confirmed
  VAT ID is reverse charge; everything else (consumers, OSS, goods, non-EU,
  VIES down) returns `refuse` with a reason.

## Limits, read before use

- This is not tax advice. You are responsible for your invoices and returns.
- Rates were taken from third-party aggregators on 2026-10-06, not from the
  Commission's TEDB. Check the official source before filing, and expect rates
  to change.
- No checksum validation, no exemptions, no thresholds, no goods, no B2C/OSS.
- VIES is a public service with its own rate limits and downtime.

## Develop

```bash
npm install
npm test
```

Issues and pull requests welcome, especially rate corrections with a source.
