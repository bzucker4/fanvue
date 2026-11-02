import type { PrismaClient } from "@prisma/client";
import { decryptString, encryptString, decodeEncryptionKey } from "../crypto/secret-box";
import { FanvueClient } from "../fanvue/client";
import { assertLiveCredentials, readFanvueConfig, type FanvueConfig } from "../fanvue/config";
import { refreshAccessToken } from "../fanvue/oauth";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function authorizedClient(db: PrismaClient, workspaceId: string, fetchImpl?: typeof fetch) {
  const config = readFanvueConfig();
  assertLiveCredentials(config);
  const key = decodeEncryptionKey(config.encryptionKey!);
  // Lock the token row across processes; a second request must reread the rotated token.
  const access = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "workspaceId" FROM "OauthToken" WHERE "workspaceId" = ${workspaceId} FOR UPDATE`;
    const token = await tx.oauthToken.findUnique({ where: { workspaceId } });
    if (!token) throw new Error("This workspace has no Fanvue connection.");
    let currentAccess = decryptString(token.accessCipher, key);
    if (token.expiresAt.getTime() - Date.now() <= REFRESH_BUFFER_MS) {
      const next = await refreshAccessToken(config, decryptString(token.refreshCipher, key), fetchImpl);
      currentAccess = next.accessToken;
      await tx.oauthToken.update({
        where: { workspaceId },
        data: {
          accessCipher: encryptString(next.accessToken, key),
          refreshCipher: encryptString(next.refreshToken, key),
          expiresAt: new Date(Date.now() + next.expiresIn * 1000),
          scope: next.scope,
        },
      });
    }
    return currentAccess;
  }, { maxWait: 10000, timeout: 25000 });
  return { client: new FanvueClient(access, fetchImpl), config: config satisfies FanvueConfig };
}

export function parseSelfProfile(body: unknown): { uuid: string; handle: string | null; displayName: string } {
  if (!body || typeof body !== "object") {
    throw new Error("Fanvue did not return a profile.");
  }
  const record = body as Record<string, unknown>;
  const uuid = typeof record.uuid === "string" ? record.uuid : null;
  if (!uuid) throw new Error("Fanvue profile did not include uuid.");
  const handle = typeof record.handle === "string" ? record.handle : null;
  const displayName =
    typeof record.displayName === "string"
      ? record.displayName
      : typeof record.display_name === "string"
        ? record.display_name
        : handle || "Creator";
  return { uuid, handle, displayName };
}
