import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { auditBundle } from "@/lib/audit/engine";
import { loadAuditRequest } from "@/lib/audit/load";
import { createDemoWorkspace } from "@/lib/demo/seed";

const prisma = new PrismaClient();

describe("database creator isolation", () => {
  const sessionIds: string[] = [];

  afterAll(async () => {
    const sessions = await prisma.appSession.findMany({ where: { id: { in: sessionIds } } });
    const workspaceIds = sessions.map((session) => session.workspaceId);
    if (workspaceIds.length > 0) {
      await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    }
    await prisma.$disconnect();
  });

  it("keeps two demo workspaces from seeing each other's purchases", async () => {
    const first = await createDemoWorkspace(prisma);
    const second = await createDemoWorkspace(prisma);
    sessionIds.push(first.sessionId, second.sessionId);

    const firstBundle = await prisma.bundle.findFirstOrThrow({ where: { workspaceId: first.workspaceId } });
    const secondBundle = await prisma.bundle.findFirstOrThrow({ where: { workspaceId: second.workspaceId } });
    const firstAudit = await loadAuditRequest(prisma, first.workspaceId, firstBundle.id);
    const secondAudit = await loadAuditRequest(prisma, second.workspaceId, secondBundle.id);
    expect(firstAudit).not.toBeNull();
    expect(secondAudit).not.toBeNull();
    const mixed = auditBundle({
      ...firstAudit!,
      purchases: [...firstAudit!.purchases, ...secondAudit!.purchases],
      uploads: [...firstAudit!.uploads, ...secondAudit!.uploads],
    });
    const lamp = mixed.items.find((item) => item.label === "Brass lamp");
    expect(lamp?.status).toBe("confirmed_purchase_overlap");
    expect(lamp?.purchaseEvidence.every((evidence) => firstAudit!.fans.some((fan) => fan.id === evidence.fanId))).toBe(true);
    expect(firstAudit!.purchases.some((purchase) => secondAudit!.purchases.some((other) => other.id === purchase.id))).toBe(false);

    const live = await prisma.workspace.create({
      data: { mode: "live", displayName: "Live creator", fanvueUserUuid: `live-${second.sessionId}` },
    });
    const liveUploads = await prisma.upload.count({ where: { workspaceId: live.id, sampleAsset: { not: null } } });
    expect(liveUploads).toBe(0);
    await prisma.workspace.delete({ where: { id: live.id } });
  });
});
