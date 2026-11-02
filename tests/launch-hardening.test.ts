import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { encryptString } from "../src/lib/crypto/secret-box";
import { authorizedClient } from "../src/lib/live/tokens";
import { FanvueClient } from "../src/lib/fanvue/client";
import { importPurchaseHistory } from "../src/lib/fanvue/import-history";
import { applyLiveImport } from "../src/lib/live/apply-import";

const db = new PrismaClient();
const workspaceIds: string[] = [];
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  await db.$disconnect();
});

async function workspace() {
  const row = await db.workspace.create({ data: {
    mode: "live", displayName: "Hardening test", fanvueUserUuid: randomUUID(),
  } });
  workspaceIds.push(row.id);
  return row;
}

describe("database launch regressions", () => {
  it("preserves two broadcast buyers sharing the same message id", async () => {
    const row = await workspace();
    const message = {
      uuid: "shared-broadcast", type: "BROADCAST", sentAt: "2026-10-01T00:00:00Z",
      purchasedAt: "2026-10-02T00:00:00Z", pricing: { USD: { price: 500 } },
      mediaUuids: ["photo-a"], mediaType: "image",
    };
    const client = new FanvueClient("fixture", async (input) => {
      const url = String(input);
      return Response.json(url.includes("/v1/chats?")
        ? { data: [{ user: { uuid: "fan-a" } }, { user: { uuid: "fan-b" } }], nextCursor: null }
        : { data: [message], pagination: { hasMore: false } });
    });
    const draft = await importPurchaseHistory(client);
    expect(draft.purchases.map((item) => item.fanvueFanId)).toEqual(["fan-a", "fan-b"]);
    await applyLiveImport(db, row.id, {
      ...draft, purchases: [], sentOffers: draft.purchases.map((item) => ({ ...item, purchased: false, purchasedAt: null })),
    }, []);
    expect(await db.sentOffer.count({ where: { workspaceId: row.id } })).toBe(2);
    await applyLiveImport(db, row.id, draft, []);
    expect(await db.sentOffer.count({ where: { workspaceId: row.id } })).toBe(0);
    await applyLiveImport(db, row.id, draft, []);
    const purchases = await db.purchase.findMany({ where: { workspaceId: row.id } });
    expect(purchases).toHaveLength(2);
    expect(new Set(purchases.map((item) => item.fanId)).size).toBe(2);
    expect(await db.purchaseAttachment.count({ where: { purchase: { workspaceId: row.id } } })).toBe(2);

    // A webhook invalidated revision 2 while this import was scanning revision 1.
    await db.importState.update({ where: { workspaceId: row.id }, data: {
      revision: 2, status: "incomplete", historyComplete: false,
    } });
    await applyLiveImport(db, row.id, draft, [], { expectedRevision: 1 });
    expect((await db.importState.findUnique({ where: { workspaceId: row.id } }))?.historyComplete).toBe(false);
  });

  it("refreshes a rotating token only once across concurrent clients", async () => {
    const row = await workspace();
    const key = Buffer.alloc(32, 7);
    vi.stubEnv("FANVUE_CLIENT_ID", "fixture-id");
    vi.stubEnv("FANVUE_CLIENT_SECRET", "fixture-secret");
    vi.stubEnv("APP_ORIGIN", "https://fixture.example");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", key.toString("base64"));
    await db.oauthToken.create({ data: {
      workspaceId: row.id, accessCipher: encryptString("old-access", key),
      refreshCipher: encryptString("old-refresh", key), expiresAt: new Date(0), scope: "read:self",
    } });
    let refreshes = 0;
    const fetchImpl: typeof fetch = async () => {
      refreshes += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 });
    };
    await Promise.all([authorizedClient(db, row.id, fetchImpl), authorizedClient(db, row.id, fetchImpl)]);
    expect(refreshes).toBe(1);
  });
});
