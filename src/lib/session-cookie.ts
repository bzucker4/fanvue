import { cookies } from "next/headers";
import { issueSessionToken, readSessionToken } from "./crypto/session";
import { readFanvueConfig } from "./fanvue/config";

export const SESSION_COOKIE = "ba_session";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/** Secure when the browser origin is HTTPS, including `next dev` behind a tunnel. */
export function browserCookieSecure(appOrigin: string): boolean {
  return appOrigin.startsWith("https://");
}

export function browserCookieOptions(appOrigin: string, maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: browserCookieSecure(appOrigin),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Redirects stay on APP_ORIGIN so the OAuth host and the cookie host are the same. */
export function appOriginUrl(appOrigin: string, pathAndQuery: string): URL {
  const base = appOrigin.replace(/\/$/, "");
  return new URL(pathAndQuery.replace(/^\//, ""), `${base}/`);
}

export async function writeSessionCookie(sessionId: string): Promise<void> {
  const config = readFanvueConfig();
  if (!config.sessionSecret) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  const token = issueSessionToken(sessionId, config.sessionSecret, THIRTY_DAYS);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, browserCookieOptions(config.appOrigin, THIRTY_DAYS / 1000));
}

export async function readSessionId(): Promise<string | null> {
  const config = readFanvueConfig();
  if (!config.sessionSecret) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token, config.sessionSecret)?.id ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const config = readFanvueConfig();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...browserCookieOptions(config.appOrigin, 0), maxAge: 0 });
}
