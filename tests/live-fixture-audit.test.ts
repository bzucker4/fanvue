import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { canonicalPair } from "@/lib/audit/duplicates";
import { loadAuditRequest } from "@/lib/audit/load";
import { auditBundle } from "@/lib/audit/engine";
import { FanvueClient } from "@/lib/fanvue/client";
import { importPurchaseHistory, listMediaMetadata } from "@/lib/fanvue/import-history";
import { applyLiveImport, recordReversal } from "@/lib/live/apply-import";
import {
  FAN_UUID,
  MEDIA,
  documentedMessages,
  mediaCatalog,
  purchasedBundleMessage,
} from "./fixtures/documented-chat";

const prisma = new PrismaClient();
const workspaceIds: string[] = [];

afterAll(async () => {
  if (workspaceIds.length > 0) {
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  }
  await prisma.$disconnect();
});

describe("documented purchase fixture", () => {
  it("imports one purchased bundle, keeps the preview free, and audits a confirmed reupload", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = input instanceof URL ? `${input.pathname}${input.search}` : String(input);
      calls.push(url);
      const parsed = new URL(url, "https://api.fanvue.com");
      if (parsed.pathname === "/v1/chats") {
        expect(parsed.searchParams.get("size")).toBe("50");
        if (parsed.searchParams.get("cursor") === "page-2") {
          return json({ data: [], nextCursor: null });
        }
        return json({
          data: [{ user: { uuid: FAN_UUID, handle: "sam-fan", displayName: "Sam Fan" } }],
          nextCursor: "page-2",
        });
      }
      if (parsed.pathname === "/v1/media") {
        expect(parsed.searchParams.get("status")).toBe("ready");
        expect(parsed.searchParams.get("variants")).toBeNull();
        return json({ data: mediaCatalog, nextCursor: null });
      }
      if (parsed.pathname.endsWith("/messages")) {
        expect(parsed.searchParams.get("markAsRead")).toBe("false");
        return json({ data: documentedMessages, pagination: { hasMore: false } });
      }
      throw new Error(`Unexpected ${url}`);
    };

    const client = new FanvueClient("token", fetchImpl, async () => undefined);
    const draft = await importPurchaseHistory(client);
    const media = await listMediaMetadata(client);

    expect(calls.some((url) => url.includes("/chats/messages/batch"))).toBe(false);
    expect(draft.broadcastsIncluded).toBe(true);
    expect(draft.historyComplete).toBe(true);
    expect(draft.purchases.map((item) => item.messageId).sort()).toEqual(
      ["7c9e6679-7425-40de-944b-e07fc1f90ae7", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"].sort(),
    );
    const bought = draft.purchases.find((item) => item.messageId === purchasedBundleMessage.uuid);
    expect(bought?.paidMediaIds).toEqual([MEDIA.vase, MEDIA.notebook, MEDIA.lamp]);
    expect(bought?.paidMediaIds).not.toContain(MEDIA.preview);
    expect(draft.sentOffers.map((item) => item.messageId)).toEqual(["dddddddd-dddd-4ddd-8ddd-dddddddddddd"]);
    expect(draft.purchases.find((item) => item.messageId === "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")?.attachmentKind).toBe(
      "video",
    );

    const workspace = await prisma.workspace.create({
      data: {
        mode: "live",
        displayName: "Fixture creator",
        handle: "fixture-creator",
        fanvueUserUuid: `fixture-${crypto.randomUUID()}`,
      },
    });
    workspaceIds.push(workspace.id);
    const other = await prisma.workspace.create({
      data: {
        mode: "live",
        displayName: "Other creator",
        handle: "other-creator",
        fanvueUserUuid: `fixture-${crypto.randomUUID()}`,
      },
    });
    workspaceIds.push(other.id);

    await applyLiveImport(prisma, workspace.id, draft, media.items, { billingMode: "validation" });

    const uploads = await prisma.upload.findMany({ where: { workspaceId: workspace.id } });
    expect(uploads.every((upload) => upload.sampleAsset === null)).toBe(true);
    expect(uploads.find((upload) => upload.mediaId === MEDIA.clip)?.kind).toBe("video");
    const byMedia = new Map(uploads.map((upload) => [upload.mediaId, upload]));
    const notebook = byMedia.get(MEDIA.notebook);
    const notebookAgain = byMedia.get(MEDIA.notebookAgain);
    const lamp = byMedia.get(MEDIA.lamp);
    const bowl = byMedia.get(MEDIA.bowl);
    const preview = byMedia.get(MEDIA.preview);
    const clip = byMedia.get(MEDIA.clip);
    expect(notebook && notebookAgain && lamp && bowl && preview && clip).toBeTruthy();

    const [left, right] = canonicalPair(notebook!.id, notebookAgain!.id);
    await prisma.duplicateEdge.create({
      data: {
        workspaceId: workspace.id,
        leftUploadId: left,
        rightUploadId: right,
        status: "confirmed",
        note: "Creator confirmed the second notebook upload.",
      },
    });
    const fan = await prisma.fan.findFirstOrThrow({ where: { workspaceId: workspace.id, fanvueUuid: FAN_UUID } });
    const bundle = await prisma.bundle.create({
      data: {
        workspaceId: workspace.id,
        name: "Proposed still life",
        items: {
          create: [notebookAgain!, lamp!, bowl!, preview!, clip!].map((upload, position) => ({
            uploadId: upload.id,
            position,
          })),
        },
        audience: { create: { fanId: fan.id } },
      },
    });

    const request = await loadAuditRequest(prisma, workspace.id, bundle.id);
    const report = request ? auditBundle(request) : null;
    expect(report).not.toBeNull();
    const status = (mediaId: string) => report!.items.find((item) => item.mediaId === mediaId)?.status;
    expect(status(MEDIA.notebookAgain)).toBe("confirmed_purchase_overlap");
    expect(status(MEDIA.lamp)).toBe("confirmed_purchase_overlap");
    expect(status(MEDIA.bowl)).toBe("no_known_purchase_overlap");
    expect(status(MEDIA.preview)).toBe("no_known_purchase_overlap");
    expect(status(MEDIA.clip)).toBe("incomplete_or_unsupported_history");
    expect(report!.coverage.broadcastsIncluded).toBe(true);
    expect(report!.coverage.historyComplete).toBe(true);
    const notebookEvidence = report!.items.find((item) => item.mediaId === MEDIA.notebookAgain)?.purchaseEvidence ?? [];
    expect(notebookEvidence[0]?.matchedBecause).toBe("confirmed_duplicate");
    expect(notebookEvidence[0]?.preview?.mediaId).toBe(MEDIA.preview);

    const state = await prisma.importState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
    expect(state.billingMode).toBe("validation");

    const broadcast = await prisma.purchase.findFirstOrThrow({
      where: { workspaceId: workspace.id, messageType: "BROADCAST" },
    });
    await prisma.purchase.update({ where: { id: broadcast.id }, data: { invoiceId: "FV-12345" } });
    await recordReversal(prisma, workspace.id, {
      externalId: "evt-refund",
      kind: "refund",
      invoiceId: "FV-12345",
      amountCents: 800,
    });
    const reversal = await prisma.reversal.findFirstOrThrow({
      where: { workspaceId: workspace.id, externalId: "evt-refund" },
    });
    expect(reversal.purchaseId).toBe(broadcast.id);
    expect(await prisma.purchase.findUnique({ where: { id: broadcast.id } })).not.toBeNull();

    expect(await prisma.purchase.count({ where: { workspaceId: other.id } })).toBe(0);
  });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", "x-ratelimit-remaining": "100" },
  });
}
