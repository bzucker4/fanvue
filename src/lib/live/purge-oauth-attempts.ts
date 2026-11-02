import type { PrismaClient } from "@prisma/client";

/**
 * Deletes sign-in attempts whose 10-minute window has passed. Attempts the
 * callback already completed or rejected are gone; this removes the abandoned
 * ones, including their encrypted code verifier.
 */
export async function purgeExpiredOauthAttempts(db: PrismaClient, now: Date = new Date()): Promise<number> {
  const result = await db.oauthAttempt.deleteMany({ where: { expiresAt: { lt: now } } });
  return result.count;
}
