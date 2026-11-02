import type { PrismaClient } from "@prisma/client";
import { coverageForAudit } from "../live/import-failure";
import type { AuditRequest, AuditStatus } from "./types";
import { auditBundle } from "./engine";

export async function loadAuditRequest(
  db: PrismaClient,
  workspaceId: string,
  bundleId: string,
): Promise<AuditRequest | null> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      fans: true,
      uploads: true,
      edges: true,
      purchases: { include: { attachments: true, reversals: true } },
      reversals: true,
      sentOffers: true,
      importState: true,
      bundles: {
        where: { id: bundleId },
        include: { items: { orderBy: { position: "asc" } }, audience: true },
      },
    },
  });
  if (!workspace || workspace.bundles.length === 0) return null;
  const bundle = workspace.bundles[0];
  const coverage = workspace.importState;
  return {
    creatorId: workspace.id,
    bundleUploadIds: bundle.items.map((item) => item.uploadId),
    audienceFanIds: bundle.audience.map((item) => item.fanId),
    uploads: workspace.uploads.map((upload) => ({
      id: upload.id,
      creatorId: workspace.id,
      mediaId: upload.mediaId,
      label: upload.label,
      kind: upload.kind === "image" || upload.kind === "video" ? upload.kind : "other",
    })),
    edges: workspace.edges.map((edge) => ({
      id: edge.id,
      creatorId: workspace.id,
      leftUploadId: edge.leftUploadId,
      rightUploadId: edge.rightUploadId,
      status:
        edge.status === "confirmed" ||
        edge.status === "suggested" ||
        edge.status === "rejected" ||
        edge.status === "reversed"
          ? edge.status
          : "suggested",
    })),
    purchases: workspace.purchases.map((purchase) => ({
      id: purchase.id,
      creatorId: workspace.id,
      fanId: purchase.fanId,
      messageId: purchase.messageId,
      messageType: purchase.messageType,
      purchasedAt: purchase.purchasedAt.toISOString(),
      priceCents: purchase.priceCents,
      currency: purchase.currency,
      invoiceId: purchase.invoiceId,
      paidUploadIds: purchase.attachments.filter((item) => item.role === "paid").map((item) => item.uploadId),
      previewUploadId: purchase.attachments.find((item) => item.role === "preview")?.uploadId ?? null,
      textExcerpt: purchase.textExcerpt,
    })),
    reversals: workspace.reversals.map((reversal) => ({
      id: reversal.id,
      creatorId: workspace.id,
      purchaseId: reversal.purchaseId,
      invoiceId: reversal.invoiceId,
      kind:
        reversal.kind === "refund" || reversal.kind === "dispute_flagged" || reversal.kind === "dispute_open"
          ? reversal.kind
          : "refund",
      amountCents: reversal.amountCents,
    })),
    sentOffers: workspace.sentOffers.map((offer) => ({
      id: offer.id,
      creatorId: workspace.id,
      fanId: offer.fanId,
      messageId: offer.messageId,
      messageType: offer.messageType,
      sentAt: offer.sentAt.toISOString(),
      priceCents: offer.priceCents,
      paidUploadIds: Array.isArray(offer.paidUploadIds) ? offer.paidUploadIds.filter((id): id is string => typeof id === "string") : [],
      previewUploadId: offer.previewUploadId,
    })),
    fans: workspace.fans.map((fan) => ({
      id: fan.id,
      creatorId: workspace.id,
      displayName: fan.displayName,
      handle: fan.handle,
    })),
    coverage: {
      creatorId: workspace.id,
      ...coverageForAudit(coverage),
      lastSynchronizedAt: coverage?.lastSynchronizedAt?.toISOString() ?? null,
      gaps: asStrings(coverage?.gaps),
      unsupported: asStrings(coverage?.unsupported),
    },
  };
}

export async function runWorkspaceAudit(db: PrismaClient, workspaceId: string, bundleId: string) {
  const request = await loadAuditRequest(db, workspaceId, bundleId);
  if (!request) return null;
  return auditBundle(request);
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export type { AuditStatus };
