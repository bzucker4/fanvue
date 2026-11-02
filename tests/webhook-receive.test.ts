import { createHmac } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { handleFanvueWebhook } from "@/lib/fanvue/receive-webhook";

const prisma = new PrismaClient();
const secret = "fixture-webhook-secret";
const workspaceIds: string[] = [];

afterAll(async () => {
  delete process.env.FANVUE_WEBHOOK_SECRET;
  if (workspaceIds.length > 0) {
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  }
  await prisma.$disconnect();
});

describe("webhook receiver", () => {
  it("acks a signed payment once, retries a failed write, and does not invent attachments", async () => {
    process.env.FANVUE_WEBHOOK_SECRET = secret;
    const creatorUuid = crypto.randomUUID();
    const workspace = await prisma.workspace.create({
      data: {
        mode: "live",
        displayName: "Webhook creator",
        handle: "webhook-creator",
        fanvueUserUuid: creatorUuid,
      },
    });
    workspaceIds.push(workspace.id);

    const eventId = `evt-${crypto.randomUUID()}`;
    const body = JSON.stringify({
      id: eventId,
      type: "creator.payment.succeeded",
      timestamp: "2026-06-09T08:39:33.139Z",
      data: {
        object: "payment",
        id: "FV-12345",
        source: "message",
        message_uuid: "2f7c5e8a-6d36-4e3a-98d9-9f1b3b0a1a10",
        message_type: "SINGLE_RECIPIENT",
        gross: 1999,
        purchaser: { uuid: "fan-uuid", handle: "janed", display_name: "Jane D" },
        creator: { uuid: creatorUuid },
      },
    });

    const unsigned = await handleFanvueWebhook(prisma, request(body, null));
    expect(unsigned.status).toBe(401);
    expect(await prisma.webhookEvent.findUnique({ where: { id: eventId } })).toBeNull();

    let failWrite = true;
    const flaky = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === "pendingHydration" && failWrite) {
          return {
            findFirst: async () => null,
            create: async () => {
              failWrite = false;
              throw new Error("database unavailable");
            },
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as PrismaClient;

    const failed = await handleFanvueWebhook(flaky, request(body, signature(body)));
    expect(failed.status).toBe(500);
    expect((await prisma.webhookEvent.findUnique({ where: { id: eventId } }))?.processed).toBe(false);
    expect(await prisma.pendingHydration.count({ where: { workspaceId: workspace.id } })).toBe(0);

    const delivered = await handleFanvueWebhook(prisma, request(body, signature(body)));
    expect(delivered.status).toBe(200);
    const stored = await prisma.pendingHydration.findMany({ where: { workspaceId: workspace.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.messageId).toBe("2f7c5e8a-6d36-4e3a-98d9-9f1b3b0a1a10");
    expect(JSON.stringify(stored[0]?.payload)).not.toContain("media");
    expect((await prisma.webhookEvent.findUnique({ where: { id: eventId } }))?.processed).toBe(true);

    const replay = await handleFanvueWebhook(prisma, request(body, signature(body)));
    expect(replay.status).toBe(200);
    expect(await prisma.pendingHydration.count({ where: { workspaceId: workspace.id } })).toBe(1);
    expect(await prisma.purchase.count({ where: { workspaceId: workspace.id } })).toBe(0);
  });

  it("acks the unsigned verification probe without writing a purchase", async () => {
    const probe = await handleFanvueWebhook(
      prisma,
      request(JSON.stringify({ type: "fanvue.webhook.verification", timestamp: "2026-06-09T08:39:33.139Z" }), null),
    );
    expect(probe.status).toBe(200);
    expect(await prisma.webhookEvent.count({ where: { type: "fanvue.webhook.verification" } })).toBe(0);
  });

  it("stores a signed Events-tab test payment without a live purchase", async () => {
    process.env.FANVUE_WEBHOOK_SECRET = secret;
    const creatorUuid = crypto.randomUUID();
    const workspace = await prisma.workspace.create({
      data: {
        mode: "live",
        displayName: "Synthetic webhook creator",
        handle: "synthetic-webhook",
        fanvueUserUuid: creatorUuid,
        importState: {
          create: {
            status: "complete",
            historyComplete: true,
            broadcastsIncluded: true,
            gaps: [],
            unsupported: [],
            methodNote: "Fixture coverage before a synthetic delivery.",
          },
        },
      },
    });
    workspaceIds.push(workspace.id);
    const eventId = `evt-test-${crypto.randomUUID()}`;
    const body = JSON.stringify({
      id: eventId,
      type: "creator.payment.succeeded",
      timestamp: "2026-06-09T08:39:33.139Z",
      data: {
        object: "payment",
        id: "TEST-FV-1",
        transaction_id: "txn_test_1",
        source: "message",
        message_uuid: "TEST-message",
        message_type: "SINGLE_RECIPIENT",
        gross: 1999,
        purchaser: { uuid: "TEST-fan", email: "test@example.com" },
        creator: { uuid: creatorUuid },
      },
    });
    const delivered = await handleFanvueWebhook(prisma, request(body, signature(body)));
    expect(delivered.status).toBe(200);
    expect((await prisma.webhookEvent.findUnique({ where: { id: eventId } }))?.processed).toBe(true);
    expect(await prisma.pendingHydration.count({ where: { workspaceId: workspace.id } })).toBe(0);
    expect(await prisma.purchase.count({ where: { workspaceId: workspace.id } })).toBe(0);
    expect(await prisma.reversal.count({ where: { workspaceId: workspace.id } })).toBe(0);
    expect((await prisma.importState.findUnique({ where: { workspaceId: workspace.id } }))?.historyComplete).toBe(true);
  });
});

function signature(body: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const mac = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v0=${mac}`;
}

function request(body: string, header: string | null) {
  return new Request("https://audit.example.com/api/webhooks/fanvue", {
    method: "POST",
    headers: header ? { "x-fanvue-signature": header, "content-type": "application/json" } : { "content-type": "application/json" },
    body,
  });
}
