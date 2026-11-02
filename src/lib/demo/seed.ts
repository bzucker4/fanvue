import type { PrismaClient } from "@prisma/client";
import { randomId } from "../crypto/session";
import {
  demoBundleSelection,
  demoCoverage,
  demoEdges,
  demoFans,
  demoPhotos,
  demoPurchases,
  demoReversals,
  demoSentOffers,
} from "./catalog";

/** Creates an isolated demo workspace. Sample rows are never attached to a live creator. */
export async function createDemoWorkspace(db: PrismaClient): Promise<{ workspaceId: string; sessionId: string }> {
  const sessionId = randomId();
  const bundle = demoBundleSelection();
  const coverage = demoCoverage();
  const photos = demoPhotos();

  const workspace = await db.workspace.create({
    data: {
      mode: "demo",
      displayName: "Demo studio",
      handle: "demo.studio",
      fans: {
        create: demoFans().map((fan) => ({
          id: `${fan.id}-${sessionId.slice(0, 8)}`,
          fanvueUuid: fan.id,
          displayName: fan.displayName,
          handle: fan.handle,
        })),
      },
      uploads: {
        create: photos.map((photo) => ({
          id: `${photo.upload.id}-${sessionId.slice(0, 8)}`,
          mediaId: photo.upload.mediaId,
          label: photo.upload.label,
          kind: photo.upload.kind,
          sampleAsset: photo.sampleAsset,
          status: "ready",
        })),
      },
    },
  });

  const idFor = (catalogId: string) => `${catalogId}-${sessionId.slice(0, 8)}`;

  await db.duplicateEdge.createMany({
    data: demoEdges().map((edge) => ({
      workspaceId: workspace.id,
      leftUploadId: idFor(edge.leftUploadId),
      rightUploadId: idFor(edge.rightUploadId),
      status: edge.status,
      note: edge.status === "suggested" ? "Sample suggestion. Confirm only if you agree these are the same photo." : null,
    })),
  });

  for (const purchase of demoPurchases()) {
    const created = await db.purchase.create({
      data: {
        workspaceId: workspace.id,
        fanId: idFor(purchase.fanId),
        messageId: purchase.messageId,
        messageType: purchase.messageType,
        purchasedAt: new Date(purchase.purchasedAt),
        priceCents: purchase.priceCents,
        currency: purchase.currency,
        invoiceId: purchase.invoiceId,
        textExcerpt: purchase.textExcerpt,
        attachments: {
          create: [
            ...purchase.paidUploadIds.map((uploadId) => ({
              uploadId: idFor(uploadId),
              role: "paid",
            })),
            ...(purchase.previewUploadId
              ? [{ uploadId: idFor(purchase.previewUploadId), role: "preview" }]
              : []),
          ],
        },
      },
    });
    const reversal = demoReversals().find((item) => item.purchaseId === purchase.id);
    if (reversal) {
      await db.reversal.create({
        data: {
          workspaceId: workspace.id,
          purchaseId: created.id,
          invoiceId: reversal.invoiceId,
          externalId: `${reversal.id}-${workspace.id}`,
          kind: reversal.kind,
          amountCents: reversal.amountCents,
        },
      });
    }
  }

  for (const offer of demoSentOffers()) {
    await db.sentOffer.create({
      data: {
        workspaceId: workspace.id,
        fanId: idFor(offer.fanId),
        messageId: offer.messageId,
        messageType: offer.messageType,
        sentAt: new Date(offer.sentAt),
        priceCents: offer.priceCents,
        paidUploadIds: offer.paidUploadIds.map(idFor),
        previewUploadId: offer.previewUploadId ? idFor(offer.previewUploadId) : null,
      },
    });
  }

  await db.bundle.create({
    data: {
      workspaceId: workspace.id,
      name: bundle.name,
      items: {
        create: bundle.uploadIds.map((uploadId, position) => ({
          uploadId: idFor(uploadId),
          position,
        })),
      },
      audience: {
        create: bundle.audienceFanIds.map((fanId) => ({ fanId: idFor(fanId) })),
      },
    },
  });

  await db.importState.create({
    data: {
      workspaceId: workspace.id,
      status: "ready",
      historyComplete: coverage.historyComplete,
      broadcastsIncluded: coverage.broadcastsIncluded,
      lastSynchronizedAt: coverage.lastSynchronizedAt ? new Date(coverage.lastSynchronizedAt) : null,
      chatsDiscovered: 2,
      chatsImported: 2,
      messagesScanned: 3,
      purchasesImported: demoPurchases().length,
      gaps: coverage.gaps,
      unsupported: coverage.unsupported,
      methodNote:
        "Demo mode uses scripted sample history. It is not a Fanvue sync. Per-chat history in the sample includes one broadcast purchase.",
    },
  });

  await db.appSession.create({
    data: {
      id: sessionId,
      workspaceId: workspace.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { workspaceId: workspace.id, sessionId };
}
