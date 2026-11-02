import { cookies } from "next/headers";
import { issueSessionToken, readSessionToken } from "./crypto/session";
import { readFanvueConfig } from "./fanvue/config";

export const SESSION_COOKIE = "ba_session";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function writeSessionCookie(sessionId: string): Promise<void> {
  const config = readFanvueConfig();
  if (!config.sessionSecret) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  const token = issueSessionToken(sessionId, config.sessionSecret, THIRTY_DAYS);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS / 1000,
  });
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
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
