import { parseVatId } from "./parse.js";

const ENDPOINT = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

export type ViesResult =
  | { status: "valid"; country: string; number: string; name?: string; address?: string; requestDate: string; requestIdentifier?: string }
  | { status: "invalid"; country: string; number: string; requestDate: string }
  /** VIES or the member state could not answer. This is NOT "invalid": retry later or ask a human. */
  | { status: "unavailable"; reason: string }
  | { status: "malformed"; reason: string };

export interface ViesOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
  /** Your own VAT ID: VIES then returns a consultation number (requestIdentifier) as proof. */
  requester?: string;
}

const clean = (s: unknown) => (typeof s === "string" && s !== "---" && s.trim() ? s.trim() : undefined);

export async function checkVies(vatId: string, opts: ViesOptions = {}): Promise<ViesResult> {
  const parsed = parseVatId(vatId);
  if (!parsed.ok) return { status: "malformed", reason: parsed.reason };

  const body: Record<string, string> = { countryCode: parsed.country, vatNumber: parsed.number };
  if (opts.requester) {
    const r = parseVatId(opts.requester);
    if (!r.ok) return { status: "malformed", reason: `requester: ${r.reason}` };
    body.requesterMemberStateCode = r.country;
    body.requesterNumber = r.number;
  }

  let json: any;
  try {
    const res = await (opts.fetch ?? fetch)(opts.endpoint ?? ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
    });
    json = await res.json().catch(() => undefined);
    if (!res.ok || !json) {
      const code = json?.errorWrappers?.[0]?.error ?? `HTTP ${res.status}`;
      return { status: "unavailable", reason: String(code) };
    }
  } catch (e) {
    return { status: "unavailable", reason: e instanceof Error ? e.message : "network error" };
  }

  if (json.actionSucceed === false || json.errorWrappers) {
    return { status: "unavailable", reason: String(json.errorWrappers?.[0]?.error ?? "VIES error") };
  }
  if (typeof json.userError === "string" && json.userError !== "VALID" && json.userError !== "INVALID") {
    return { status: "unavailable", reason: json.userError };
  }
  if (typeof json.valid !== "boolean") return { status: "unavailable", reason: "unexpected VIES response" };

  const requestDate = String(json.requestDate ?? new Date().toISOString());
  if (!json.valid) return { status: "invalid", country: parsed.country, number: parsed.number, requestDate };
  return {
    status: "valid",
    country: parsed.country,
    number: parsed.number,
    name: clean(json.name),
    address: clean(json.address),
    requestDate,
    requestIdentifier: clean(json.requestIdentifier),
  };
}
