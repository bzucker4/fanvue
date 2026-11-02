/**
 * Minimum scopes for read-only photo-bundle auditing.
 *
 * - read:self: who connected, and app subscription state
 * - read:chat: per-chat PPV history, including broadcasts, without write access
 * - read:media: media metadata (uuid, type, status). Bytes are not stored.
 * - read:creator: payment, refund, and dispute webhooks for purchase evidence
 *
 * write:chat is intentionally absent. This app does not send messages.
 * read:fan is unnecessary because chat counterparts already identify fans.
 * read:insights is not requested; message `purchasedAt` is the attachment source of truth.
 */
export const REQUIRED_SCOPES = ["read:self", "read:chat", "read:media", "read:creator"] as const;

export const SYSTEM_SCOPES = ["openid", "offline_access", "offline"] as const;

export const API_VERSION = "2025-06-26";
export const API_BASE = "https://api.fanvue.com";
export const AUTH_BASE = "https://auth.fanvue.com";
export const APP_STORE_HOME = "https://www.fanvue.com/app-store";

export interface FanvueConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  appOrigin: string;
  appUuid: string | null;
  planUuid: string | null;
  webhookSecret: string | null;
  scopes: string[];
  encryptionKey: string | null;
  sessionSecret: string | null;
}

export class IntegrationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationConfigError";
  }
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export function readFanvueConfig(env: NodeJS.ProcessEnv = process.env): FanvueConfig {
  const appOrigin = clean(env.APP_ORIGIN).replace(/\/$/, "");
  const scopes = clean(env.FANVUE_SCOPES)
    ? clean(env.FANVUE_SCOPES).split(/\s+/)
    : [...REQUIRED_SCOPES];
  return {
    clientId: clean(env.FANVUE_CLIENT_ID),
    clientSecret: clean(env.FANVUE_CLIENT_SECRET),
    appOrigin,
    redirectUri: clean(env.FANVUE_REDIRECT_URI) || (appOrigin ? `${appOrigin}/api/oauth/callback` : ""),
    appUuid: clean(env.FANVUE_APP_UUID) || null,
    planUuid: clean(env.FANVUE_PLAN_UUID) || null,
    webhookSecret: clean(env.FANVUE_WEBHOOK_SECRET) || null,
    scopes,
    encryptionKey: clean(env.TOKEN_ENCRYPTION_KEY) || null,
    sessionSecret: clean(env.SESSION_SECRET) || null,
  };
}

export function liveCredentialsReady(config: FanvueConfig): boolean {
  return Boolean(config.clientId && config.clientSecret && config.redirectUri && config.encryptionKey);
}

export function assertLiveCredentials(config: FanvueConfig): void {
  if (!liveCredentialsReady(config)) {
    throw new IntegrationConfigError(
      "Live Fanvue credentials are not configured. Bundle Audit will not substitute demo data.",
    );
  }
}

export function appStoreListingUrl(appUuid: string | null): string {
  if (!appUuid) return APP_STORE_HOME;
  return `${APP_STORE_HOME}/details/${appUuid}`;
}

/** Documented App Store deeplink. Not an external checkout. */
export function planDeeplink(appUuid: string, planUuid: string): string {
  return `${APP_STORE_HOME}/details/${appUuid}?plan=${planUuid}`;
}
