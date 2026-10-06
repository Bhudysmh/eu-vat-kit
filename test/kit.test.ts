import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVatId, checkVies, standardVatRate, decideVat, EU_COUNTRIES } from "../src/index.js";

test("parseVatId normalises and accepts well-formed IDs", () => {
  assert.deepEqual(parseVatId("nl 0000.99.998.B57"), { ok: true, country: "NL", number: "000099998B57", normalized: "NL000099998B57" });
  assert.equal(parseVatId("DE123456789").ok, true);
  assert.equal(parseVatId("EL123456789").ok, true);
  assert.equal(parseVatId("ATU12345678").ok, true);
  assert.equal(parseVatId("FRXX123456789").ok, true);
});

test("parseVatId refuses bad format, GR, XI and non-EU", () => {
  for (const bad of ["NL123", "GR123456789", "XI123456789", "GB123456789", "US12345", "DE12345678", "FRIO123456789", ""]) {
    assert.equal(parseVatId(bad).ok, false, bad);
  }
});

test("rates: every EU country has a standard rate, others undefined", () => {
  for (const c of EU_COUNTRIES) assert.ok(standardVatRate(c), c);
  assert.equal(standardVatRate("NL")?.rate, 21);
  assert.equal(standardVatRate("GR")?.country, "EL");
  assert.equal(standardVatRate("US"), undefined);
  assert.equal(EU_COUNTRIES.length, 27);
});

const fakeFetch = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("checkVies: valid, invalid, unavailable are distinct", async () => {
  const valid = await checkVies("NL000099998B57", { fetch: fakeFetch(200, { valid: true, name: "ACME BV", address: "---", requestDate: "2026-10-06" }) });
  assert.equal(valid.status, "valid");
  assert.equal(valid.status === "valid" && valid.name, "ACME BV");
  assert.equal(valid.status === "valid" && valid.address, undefined);

  const invalid = await checkVies("NL000099998B57", { fetch: fakeFetch(200, { valid: false, requestDate: "2026-10-06" }) });
  assert.equal(invalid.status, "invalid");

  const down = await checkVies("NL000099998B57", { fetch: fakeFetch(200, { actionSucceed: false, errorWrappers: [{ error: "MS_UNAVAILABLE" }] }) });
  assert.deepEqual(down, { status: "unavailable", reason: "MS_UNAVAILABLE" });

  assert.equal((await checkVies("NL000099998B57", { fetch: fakeFetch(503, {}) })).status, "unavailable");

  const boom = await checkVies("NL000099998B57", { fetch: (async () => { throw new Error("timeout"); }) as unknown as typeof fetch });
  assert.deepEqual(boom, { status: "unavailable", reason: "timeout" });

  assert.equal((await checkVies("nonsense")).status, "malformed");
});

test("decideVat: domestic, reverse charge, and refusals", async () => {
  const valid = await checkVies("DE123456789", { fetch: fakeFetch(200, { valid: true, requestDate: "x" }) });
  assert.equal(decideVat({ sellerCountry: "NL", buyerCountry: "NL", buyerIsBusiness: true }).treatment, "domestic");
  assert.equal(decideVat({ sellerCountry: "NL", buyerCountry: "DE", buyerIsBusiness: true, buyerVies: valid }).treatment, "reverse-charge");
  // VIES country must match the buyer's country
  assert.equal(decideVat({ sellerCountry: "NL", buyerCountry: "FR", buyerIsBusiness: true, buyerVies: valid }).treatment, "refuse");
  const down = await checkVies("DE123456789", { fetch: fakeFetch(503, {}) });
  assert.equal(decideVat({ sellerCountry: "NL", buyerCountry: "DE", buyerIsBusiness: true, buyerVies: down }).treatment, "refuse");
  assert.equal(decideVat({ sellerCountry: "NL", buyerCountry: "DE", buyerIsBusiness: true }).treatment, "refuse");
  assert.equal(decideVat({ sellerCountry: "NL", buyerCountry: "DE", buyerIsBusiness: false }).treatment, "refuse");
  assert.equal(decideVat({ sellerCountry: "NL", buyerCountry: "US", buyerIsBusiness: true }).treatment, "refuse");
});
