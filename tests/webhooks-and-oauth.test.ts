import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptString, encryptString, decodeEncryptionKey } from "@/lib/crypto/secret-box";
import { issueSessionToken, readSessionToken } from "@/lib/crypto/session";
import { authorizationUrl, basicAuthHeader, exchangeAuthorizationCode, generateCodeChallenge, generateCodeVerifier } from "@/lib/fanvue/oauth";
import { readFanvueConfig } from "@/lib/fanvue/config";
import { isVerificationProbe, verifyFanvueSignature } from "@/lib/fanvue/signature";
import { decideWebhook, isSyntheticFanvueEvent } from "@/lib/fanvue/webhooks";
import { appOriginUrl, browserCookieOptions, browserCookieSecure } from "@/lib/session-cookie";

const secret = "test-webhook-secret";

function signed(body: string, timestamp: number, macSecret = secret) {
  const mac = createHmac("sha256", macSecret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v0=${mac}`;
}

describe("webhook signatures and decisions", () => {
  it("accepts a current signature and a second MAC during rotation", () => {
    const body = JSON.stringify({ id: "evt-1", type: "creator.refund.created", data: {} });
    const now = 1_700_000_000;
    expect(verifyFanvueSignature(body, signed(body, now), secret, now).ok).toBe(true);
    const rotated = `${signed(body, now, "old")},${createHmac("sha256", secret).update(`${now}.${body}`).digest("hex")}`;
    expect(verifyFanvueSignature(body, rotated, secret, now).ok).toBe(true);
  });

  it("rejects a stale timestamp, a bad mac, and an unsigned event", () => {
    const body = JSON.stringify({ id: "evt-1", type: "creator.payment.succeeded" });
    const now = 1_700_000_000;
    expect(verifyFanvueSignature(body, signed(body, now - 301), secret, now).reason).toBe("stale_timestamp");
    expect(verifyFanvueSignature(body, signed(body, now, "other"), secret, now).reason).toBe("mismatch");
    expect(verifyFanvueSignature(body, null, secret, now).reason).toBe("missing_signature");
  });

  it("recognizes the unsigned verification probe", () => {
    expect(isVerificationProbe(JSON.stringify({ type: "fanvue.webhook.verification", timestamp: "2026-01-01T00:00:00Z" }))).toBe(true);
    expect(isVerificationProbe(JSON.stringify({ type: "creator.payment.succeeded" }))).toBe(false);
  });

  it("dedupes on event id and keeps refunds off the purchase record", () => {
    const refund = {
      id: "evt-refund",
      type: "creator.refund.created",
      data: { payment_id: "FV-1", amount: 800, purchaser: { uuid: "fan-1" } },
    };
    const decision = decideWebhook(refund, false);
    expect(decision.action).toBe("store_reversal");
    if (decision.action === "store_reversal") {
      expect(decision.reversal.kind).toBe("refund");
      expect(decision.reversal.invoiceId).toBe("FV-1");
    }
    expect(decideWebhook(refund, true).action).toBe("ignore_duplicate");
  });

  it("does not invent media ids from a message payment", () => {
    const decision = decideWebhook(
      {
        id: "evt-pay",
        type: "creator.payment.succeeded",
        data: {
          source: "message",
          id: "FV-9",
          message_uuid: "msg-1",
          message_type: "BROADCAST",
          gross: 800,
          purchaser: { uuid: "fan-1" },
        },
      },
      false,
    );
    expect(decision.action).toBe("store_payment");
    if (decision.action === "store_payment") {
      expect(decision.hydration.messageId).toBe("msg-1");
      expect(decision.hydration.messageType).toBe("BROADCAST");
      expect(JSON.stringify(decision.hydration)).not.toContain("media");
    }
  });

  it("does not treat a mass send as a per-fan purchase", () => {
    const decision = decideWebhook(
      {
        id: "evt-mass",
        type: "creator.message.mass_sent",
        data: {
          object: "mass_message",
          uuid: "7c1e9d24-8a3f-4b52-9d61-0f2a3b4c5d6e",
          message_type: "BROADCAST",
          media_uuids: ["b8c47a91-3f2d-4a55-b7e8-1c9d2e4f5a6b"],
          price: 900,
          creator: { uuid: "creator-uuid" },
        },
      },
      false,
    );
    expect(decision.action).toBe("store_message_signal");
    if (decision.action === "store_message_signal") {
      expect(decision.hydration?.fanvueFanId).toBeNull();
      expect(decision.hydration?.messageId).toBe("7c1e9d24-8a3f-4b52-9d61-0f2a3b4c5d6e");
      expect(decision.hydration?.kind).toBe("message_signal");
      expect(JSON.stringify(decision.hydration)).not.toContain("b8c47a91");
    }
  });

  it("stores synthetic payment, refund, and email markers without purchase side effects", () => {
    const payment = {
      id: "evt-test-pay",
      type: "creator.payment.succeeded",
      data: {
        source: "message",
        id: "TEST-FV-1",
        transaction_id: "txn_test",
        message_uuid: "TEST-msg",
        gross: 1999,
        purchaser: { uuid: "TEST-fan", email: "test@example.com" },
      },
    };
    expect(isSyntheticFanvueEvent(payment)).toBe(true);
    const decision = decideWebhook(payment, false);
    expect(decision.action).toBe("store_only");
    expect(decideWebhook(
      {
        id: "evt-real",
        type: "creator.payment.succeeded",
        data: {
          source: "message",
          id: "FV-9",
          message_uuid: "msg-1",
          purchaser: { uuid: "11111111-1111-1111-1111-111111111111", email: null },
        },
      },
      false,
    ).action).toBe("store_payment");
    expect(decideWebhook(
      {
        id: "evt-test-refund",
        type: "creator.refund.created",
        data: { payment_id: "TEST-FV-1", amount: 800, purchaser: { uuid: "fan-1" } },
      },
      false,
    ).action).toBe("store_only");
  });

  it("treats a sent message as a signal, not a purchase", () => {
    const decision = decideWebhook(
      {
        id: "evt-sent",
        type: "creator.message.sent",
        data: { uuid: "msg-2", price: 500, fan: { uuid: "fan-1" }, message_type: "SINGLE_RECIPIENT" },
      },
      false,
    );
    expect(decision.action).toBe("store_message_signal");
  });
});

describe("oauth and token storage", () => {
  it("builds the documented authorize URL without the client secret", () => {
    const config = readFanvueConfig({
      FANVUE_CLIENT_ID: "client-id",
      FANVUE_CLIENT_SECRET: "super-secret",
      APP_ORIGIN: "https://audit.example.com",
      TOKEN_ENCRYPTION_KEY: "a",
    });
    const verifier = generateCodeVerifier();
    const url = new URL(authorizationUrl(config, { state: "abc", codeChallenge: generateCodeChallenge(verifier) }));
    expect(url.origin + url.pathname).toBe("https://auth.fanvue.com/oauth2/auth");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("scope")).toContain("read:chat");
    expect(url.searchParams.get("scope")).not.toContain("write:chat");
    expect(url.toString()).not.toContain("super-secret");
    expect(url.searchParams.get("redirect_uri")).toBe("https://audit.example.com/api/oauth/callback");
  });

  it("keeps the callback on APP_ORIGIN and marks cookies Secure only for HTTPS", () => {
    const config = readFanvueConfig({
      APP_ORIGIN: "https://bundle-audit.trycloudflare.com/",
      FANVUE_REDIRECT_URI: "",
    });
    expect(config.appOrigin).toBe("https://bundle-audit.trycloudflare.com");
    expect(config.redirectUri).toBe("https://bundle-audit.trycloudflare.com/api/oauth/callback");
    expect(appOriginUrl(config.appOrigin, "/connect?error=credentials").href).toBe(
      "https://bundle-audit.trycloudflare.com/connect?error=credentials",
    );
    expect(browserCookieSecure(config.appOrigin)).toBe(true);
    expect(browserCookieOptions(config.appOrigin, 600)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 600,
    });
    expect(browserCookieSecure("http://localhost:3000")).toBe(false);
  });

  it("sends the client secret as HTTP basic auth, not in the body", async () => {
    let authorization = "";
    let body = "";
    const fetchImpl: typeof fetch = async (_input, init) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      body = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
          scope: "openid offline_access offline read:self read:chat read:media read:creator",
        }),
        { status: 200 },
      );
    };
    const config = readFanvueConfig({
      FANVUE_CLIENT_ID: "client",
      FANVUE_CLIENT_SECRET: "secret",
      APP_ORIGIN: "https://audit.example.com",
    });
    await exchangeAuthorizationCode(config, { code: "code", codeVerifier: "verifier" }, fetchImpl);
    expect(authorization).toBe(basicAuthHeader("client", "secret"));
    expect(body).not.toContain("secret");
    expect(body).toContain("code_verifier=verifier");
  });

  it("round-trips token encryption and rejects a tampered session", () => {
    const key = decodeEncryptionKey(Buffer.alloc(32, 7).toString("base64"));
    const sealed = encryptString("refresh-token", key);
    expect(sealed).not.toContain("refresh-token");
    expect(decryptString(sealed, key)).toBe("refresh-token");
    const session = issueSessionToken("session-1", "x".repeat(32), 1000, 1_000);
    expect(readSessionToken(session, "x".repeat(32), 1_500)?.id).toBe("session-1");
    expect(readSessionToken(`${session}tamper`, "x".repeat(32), 1_500)).toBeNull();
  });
});
