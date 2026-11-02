import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { purgeExpiredOauthAttempts } from "../src/lib/live/purge-oauth-attempts";

const db = new PrismaClient();
const created: string[] = [];

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await db.oauthAttempt.deleteMany({ where: { state: { in: created } } });
  await db.$disconnect();
});

async function attempt(expiresAt: Date) {
  const state = `test-${randomUUID()}`;
  created.push(state);
  await db.oauthAttempt.create({ data: { state, codeVerifierCipher: "cipher", expiresAt } });
  return state;
}

describe("abandoned OAuth attempt cleanup", () => {
  it("deletes expired attempts and keeps ones still in their window", async () => {
    const now = new Date("2026-11-02T12:00:00Z");
    const expired = await attempt(new Date(now.getTime() - 60_000));
    const live = await attempt(new Date(now.getTime() + 60_000));
    await purgeExpiredOauthAttempts(db, now);
    expect(await db.oauthAttempt.findUnique({ where: { state: expired } })).toBeNull();
    expect(await db.oauthAttempt.findUnique({ where: { state: live } })).not.toBeNull();
  });

  it("rejects cron calls without the secret, and with a wrong one", async () => {
    vi.resetModules();
    const purge = vi.fn().mockResolvedValue(3);
    vi.doMock("../src/lib/live/purge-oauth-attempts", () => ({ purgeExpiredOauthAttempts: purge }));
    const { GET } = await import("../src/app/api/cron/purge-oauth-attempts/route");
    const call = (auth?: string) =>
      GET(new Request("https://x.test/api/cron/purge-oauth-attempts", { headers: auth ? { authorization: auth } : {} }));

    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "right-secret");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong-secret")).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
    const ok = await call("Bearer right-secret");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ purged: 3 });
    vi.doUnmock("../src/lib/live/purge-oauth-attempts");
  });
});
