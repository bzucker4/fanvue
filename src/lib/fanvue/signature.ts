import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300;

export interface SignatureCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Verifies X-Fanvue-Signature: t=<unix>,v0=<hex>[,<hex>...]
 * https://api.fanvue.com/docs/webhooks/signature-verification
 */
export function verifyFanvueSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): SignatureCheck {
  if (!header) return { ok: false, reason: "missing_signature" };
  let timestamp: string | undefined;
  const macs: string[] = [];
  let key: string | undefined;
  let timestampCount = 0;

  for (const field of header.split(",")) {
    const separator = field.indexOf("=");
    if (separator !== -1) key = field.slice(0, separator).trim();
    const value = field.slice(separator + 1).trim();
    if (key === "t") {
      timestampCount += 1;
      timestamp = value;
    } else if (key === "v0") {
      macs.push(value);
    }
  }

  if (!timestamp || timestampCount !== 1 || !/^[0-9]+$/.test(timestamp) || macs.length === 0) {
    return { ok: false, reason: "malformed_signature" };
  }
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const match = macs.some((mac) => {
    const actual = Buffer.from(mac);
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  });
  return match ? { ok: true } : { ok: false, reason: "mismatch" };
}

export function isVerificationProbe(rawBody: string): boolean {
  try {
    const body = JSON.parse(rawBody) as { type?: string };
    return body.type === "fanvue.webhook.verification";
  } catch {
    return false;
  }
}
