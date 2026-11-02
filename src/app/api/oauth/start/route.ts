import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encryptString, decodeEncryptionKey } from "@/lib/crypto/secret-box";
import { assertLiveCredentials, readFanvueConfig } from "@/lib/fanvue/config";
import { authorizationUrl, generateCodeChallenge, generateCodeVerifier, generateState } from "@/lib/fanvue/oauth";
import { appOriginUrl, browserCookieOptions } from "@/lib/session-cookie";

export async function GET(request: Request) {
  const config = readFanvueConfig();
  try {
    assertLiveCredentials(config);
  } catch {
    const origin = config.appOrigin || new URL(request.url).origin;
    return NextResponse.redirect(appOriginUrl(origin, "/connect?error=credentials"));
  }
  const verifier = generateCodeVerifier();
  const state = generateState();
  const key = decodeEncryptionKey(config.encryptionKey!);
  await prisma.oauthAttempt.create({
    data: {
      state,
      codeVerifierCipher: encryptString(verifier, key),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  const response = NextResponse.redirect(
    authorizationUrl(config, { state, codeChallenge: generateCodeChallenge(verifier) }),
  );
  response.cookies.set("ba_oauth_state", state, browserCookieOptions(config.appOrigin, 600));
  return response;
}
