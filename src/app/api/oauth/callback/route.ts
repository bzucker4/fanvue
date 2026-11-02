import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomId } from "@/lib/crypto/session";
import { decryptString, decodeEncryptionKey, encryptString } from "@/lib/crypto/secret-box";
import { issueSessionToken } from "@/lib/crypto/session";
import { FanvueClient } from "@/lib/fanvue/client";
import { readFanvueConfig, REQUIRED_SCOPES } from "@/lib/fanvue/config";
import { exchangeAuthorizationCode, grantedScopes, missingRequiredScopes } from "@/lib/fanvue/oauth";
import { parseSelfProfile } from "@/lib/live/tokens";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = readFanvueConfig();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const fail = (reason: string) => NextResponse.redirect(new URL(`/connect?error=${reason}`, url.origin));

  if (oauthError) return fail("denied");
  if (!code || !state || !config.encryptionKey || !config.sessionSecret) return fail("callback");

  const cookie = request.headers.get("cookie") ?? "";
  const cookieState = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ba_oauth_state="))
    ?.slice("ba_oauth_state=".length);
  if (!cookieState || cookieState !== state) return fail("state");

  const attempt = await prisma.oauthAttempt.findUnique({ where: { state } });
  if (!attempt || attempt.expiresAt.getTime() < Date.now()) return fail("state");

  try {
    const key = decodeEncryptionKey(config.encryptionKey);
    const verifier = decryptString(attempt.codeVerifierCipher, key);
    const tokens = await exchangeAuthorizationCode(config, { code, codeVerifier: verifier });
    const missing = missingRequiredScopes(grantedScopes(tokens.scope), REQUIRED_SCOPES);
    if (missing.length > 0) {
      await prisma.oauthAttempt.delete({ where: { state } });
      return fail("scopes");
    }
    const profile = parseSelfProfile(await new FanvueClient(tokens.accessToken).getJson("/users/me"));
    const workspace = await prisma.workspace.upsert({
      where: { fanvueUserUuid: profile.uuid },
      create: {
        mode: "live",
        displayName: profile.displayName,
        handle: profile.handle,
        fanvueUserUuid: profile.uuid,
        importState: {
          create: {
            status: "idle",
            historyComplete: false,
            broadcastsIncluded: false,
            gaps: ["Purchase history has not been imported yet."],
            unsupported: [
              "Photo bundles and purchased PPV chat attachments only. Post purchases, tips, subscriptions, and video matching are outside this audit.",
            ],
            methodNote:
              "When you import, history is read per chat so broadcast purchases are included. Nothing has been synchronized yet.",
          },
        },
      },
      update: {
        mode: "live",
        displayName: profile.displayName,
        handle: profile.handle,
      },
    });
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    await prisma.oauthToken.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        accessCipher: encryptString(tokens.accessToken, key),
        refreshCipher: encryptString(tokens.refreshToken, key),
        expiresAt,
        scope: tokens.scope,
      },
      update: {
        accessCipher: encryptString(tokens.accessToken, key),
        refreshCipher: encryptString(tokens.refreshToken, key),
        expiresAt,
        scope: tokens.scope,
      },
    });
    const sessionId = randomId();
    await prisma.appSession.upsert({
      where: { workspaceId: workspace.id },
      create: {
        id: sessionId,
        workspaceId: workspace.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        id: sessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.oauthAttempt.delete({ where: { state } });
    const response = NextResponse.redirect(new URL("/workspace/connection", url.origin));
    response.cookies.set(SESSION_COOKIE, issueSessionToken(sessionId, config.sessionSecret, 30 * 24 * 60 * 60 * 1000), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    response.cookies.set("ba_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    return fail("exchange");
  }
}
