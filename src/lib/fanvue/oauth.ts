import { createHash, randomBytes } from "node:crypto";
import { AUTH_BASE, SYSTEM_SCOPES, type FanvueConfig } from "./config";

export function base64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function generateCodeVerifier(): string {
  return base64Url(randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return randomBytes(32).toString("hex");
}

export function authorizationUrl(config: FanvueConfig, input: { state: string; codeChallenge: string }): string {
  const url = new URL("/oauth2/auth", AUTH_BASE);
  const scope = [...SYSTEM_SCOPES, ...config.scopes].join(" ");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}

export function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeAuthorizationCode(
  config: FanvueConfig,
  input: { code: string; codeVerifier: string },
  fetchImpl: typeof fetch = fetch,
): Promise<TokenSet> {
  return requestToken(
    config,
    {
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: config.redirectUri,
      code_verifier: input.codeVerifier,
    },
    fetchImpl,
  );
}

export async function refreshAccessToken(
  config: FanvueConfig,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenSet> {
  return requestToken(
    config,
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    fetchImpl,
  );
}

async function requestToken(
  config: FanvueConfig,
  body: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<TokenSet> {
  const response = await fetchImpl(new URL("/oauth2/token", AUTH_BASE), {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const description =
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
          ? payload.error
          : `Token request failed (${response.status}).`;
    throw new Error(description);
  }
  if (typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") {
    throw new Error("Token response did not include an access token and a refresh token.");
  }
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 0;
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error("Token response has an invalid expiry.");
  const scope = typeof payload.scope === "string" ? payload.scope : config.scopes.join(" ");
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn,
    scope,
  };
}

export function grantedScopes(scope: string): string[] {
  return scope.split(/\s+/).filter(Boolean);
}

export function missingRequiredScopes(granted: string[], required: readonly string[]): string[] {
  const have = new Set(granted);
  return required.filter((scope) => !have.has(scope));
}
