import type { PrismaClient } from "@prisma/client";
import type { MappedMessage } from "../audit/map-message";
import { mediaKindFromType, type ImportDraft, type MediaMetadata } from "../fanvue/import-history";

/**
 * Writes a live import into one creator workspace.
 * Demo sample assets are never attached. Variant URLs are never stored.
 */
export async function applyLiveImport(
  db: PrismaClient,
  workspaceId: string,
  draft: ImportDraft,
  media: MediaMetadata[],
): Promise<void> {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || workspace.mode !== "live") {
    throw new Error("Live import refused: this is not a live creator workspace.");
  }

  const fanIdByUuid = new Map<string, string>();
  for (const fan of draft.fans) {
    const saved = await db.fan.upsert({
      where: { workspaceId_fanvueUuid: { workspaceId, fanvueUuid: fan.fanvueUuid } },
      create: {
        workspaceId,
        fanvueUuid: fan.fanvueUuid,
        handle: fan.handle,
        displayName: fan.displayName,
      },
      update: { handle: fan.handle, displayName: fan.displayName },
    });
    fanIdByUuid.set(fan.fanvueUuid, saved.id);
  }

  const uploadIdByMedia = new Map<string, string>();
  for (const item of media) {
    const saved = await upsertUpload(db, workspaceId, {
      mediaId: item.uuid,
      label: item.name || `Photo ${item.uuid.slice(0, 8)}`,
      kind: mediaKindFromType(item.mediaType),
      status: item.status,
    });
    uploadIdByMedia.set(item.uuid, saved);
  }

  async function ensureMedia(mediaId: string, kindHint: "image" | "other" = "image") {
    const existing = uploadIdByMedia.get(mediaId);
    if (existing) return existing;
    const saved = await upsertUpload(db, workspaceId, {
      mediaId,
      label: `Upload ${mediaId.slice(0, 8)}`,
      kind: kindHint,
      status: "ready",
    });
    uploadIdByMedia.set(mediaId, saved);
    return saved;
  }

  for (const purchase of draft.purchases) {
    const fanUuid = draft.fanByMessage[purchase.messageId];
    const fanId = fanUuid ? fanIdByUuid.get(fanUuid) : undefined;
    if (!fanId) {
      draft.historyComplete = false;
      draft.gaps.push(`Purchase ${purchase.messageId} had no fan and was not stored.`);
      continue;
    }
    await storePurchase(db, workspaceId, fanId, purchase, ensureMedia);
  }

  for (const offer of draft.sentOffers) {
    const fanId = fanIdByUuid.get(draft.fanByMessage[offer.messageId] ?? "");
    if (!fanId) continue;
    const paidIds: string[] = [];
    for (const mediaId of offer.paidMediaIds) paidIds.push(await ensureMedia(mediaId));
    const preview = offer.previewMediaId ? await ensureMedia(offer.previewMediaId) : null;
    await db.sentOffer.upsert({
      where: { workspaceId_messageId: { workspaceId, messageId: offer.messageId } },
      create: {
        workspaceId,
        fanId,
        messageId: offer.messageId,
        messageType: offer.messageType,
        sentAt: new Date(offer.sentAt),
        priceCents: offer.priceCents,
        paidUploadIds: paidIds,
        previewUploadId: preview,
      },
      update: {
        fanId,
        messageType: offer.messageType,
        priceCents: offer.priceCents,
        paidUploadIds: paidIds,
        previewUploadId: preview,
      },
    });
  }

  const unlinked = await db.reversal.findMany({
    where: { workspaceId, purchaseId: null, invoiceId: { not: null } },
  });
  for (const reversal of unlinked) {
    if (!reversal.invoiceId) continue;
    const purchase = await db.purchase.findFirst({
      where: { workspaceId, invoiceId: reversal.invoiceId },
    });
    if (purchase) {
      await db.reversal.update({ where: { id: reversal.id }, data: { purchaseId: purchase.id } });
    }
  }

  await db.importState.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      status: draft.historyComplete ? "ready" : "incomplete",
      historyComplete: draft.historyComplete,
      broadcastsIncluded: draft.broadcastsIncluded,
      lastSynchronizedAt: new Date(),
      chatsDiscovered: draft.chatsDiscovered,
      chatsImported: draft.chatsImported,
      messagesScanned: draft.messagesScanned,
      purchasesImported: draft.purchases.length,
      gaps: draft.gaps,
      unsupported: draft.unsupported,
      methodNote: draft.methodNote,
      lastError: null,
    },
    update: {
      status: draft.historyComplete ? "ready" : "incomplete",
      historyComplete: draft.historyComplete,
      broadcastsIncluded: draft.broadcastsIncluded,
      lastSynchronizedAt: new Date(),
      chatsDiscovered: draft.chatsDiscovered,
      chatsImported: draft.chatsImported,
      messagesScanned: draft.messagesScanned,
      purchasesImported: draft.purchases.length,
      gaps: draft.gaps,
      unsupported: draft.unsupported,
      methodNote: draft.methodNote,
      lastError: null,
    },
  });
}

async function upsertUpload(
  db: PrismaClient,
  workspaceId: string,
  input: { mediaId: string; label: string; kind: string; status: string },
) {
  const saved = await db.upload.upsert({
    where: { workspaceId_mediaId: { workspaceId, mediaId: input.mediaId } },
    create: {
      workspaceId,
      mediaId: input.mediaId,
      label: input.label,
      kind: input.kind,
      status: input.status,
      sampleAsset: null,
    },
    update: {
      label: input.label,
      kind: input.kind,
      status: input.status,
      sampleAsset: null,
    },
  });
  return saved.id;
}

async function storePurchase(
  db: PrismaClient,
  workspaceId: string,
  fanId: string,
  purchase: MappedMessage,
  ensureMedia: (mediaId: string) => Promise<string>,
) {
  const paid: { uploadId: string; role: string }[] = [];
  for (const mediaId of purchase.paidMediaIds) {
    paid.push({ uploadId: await ensureMedia(mediaId), role: "paid" });
  }
  if (purchase.previewMediaId) {
    paid.push({ uploadId: await ensureMedia(purchase.previewMediaId), role: "preview" });
  }
  const existing = await db.purchase.findUnique({
    where: { workspaceId_messageId: { workspaceId, messageId: purchase.messageId } },
  });
  if (existing) {
    await db.purchaseAttachment.deleteMany({ where: { purchaseId: existing.id } });
    await db.purchase.update({
      where: { id: existing.id },
      data: {
        fanId,
        messageType: purchase.messageType,
        purchasedAt: new Date(purchase.purchasedAt ?? purchase.sentAt),
        priceCents: purchase.priceCents,
        textExcerpt: purchase.textExcerpt,
        attachments: { create: paid },
      },
    });
    return;
  }
  await db.purchase.create({
    data: {
      workspaceId,
      fanId,
      messageId: purchase.messageId,
      messageType: purchase.messageType,
      purchasedAt: new Date(purchase.purchasedAt ?? purchase.sentAt),
      priceCents: purchase.priceCents,
      currency: "USD",
      textExcerpt: purchase.textExcerpt,
      attachments: { create: paid },
    },
  });
}

export async function recordReversal(
  db: PrismaClient,
  workspaceId: string,
  input: {
    externalId: string;
    kind: string;
    invoiceId: string | null;
    amountCents: number | null;
  },
) {
  const purchase = input.invoiceId
    ? await db.purchase.findFirst({ where: { workspaceId, invoiceId: input.invoiceId } })
    : null;
  await db.reversal.upsert({
    where: { workspaceId_externalId: { workspaceId, externalId: input.externalId } },
    create: {
      workspaceId,
      externalId: input.externalId,
      kind: input.kind,
      invoiceId: input.invoiceId,
      amountCents: input.amountCents,
      purchaseId: purchase?.id ?? null,
    },
    update: {
      kind: input.kind,
      invoiceId: input.invoiceId,
      amountCents: input.amountCents,
      purchaseId: purchase?.id ?? null,
    },
  });
}
