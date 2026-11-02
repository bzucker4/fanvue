import { confirmedComponent, directSuggestions, otherSide } from "./duplicates";
import type {
  AuditCoverage,
  AuditFan,
  AuditPurchase,
  AuditReport,
  AuditRequest,
  AuditStatus,
  AuditUpload,
  ItemAudit,
  PurchaseEvidence,
  SuggestionEvidence,
  UnpurchasedSend,
} from "./types";

const EMPTY_COUNTS: Record<AuditStatus, number> = {
  confirmed_purchase_overlap: 0,
  possible_duplicate_requiring_review: 0,
  no_known_purchase_overlap: 0,
  incomplete_or_unsupported_history: 0,
};

function scoped<T extends { creatorId: string }>(creatorId: string, rows: T[]): T[] {
  return rows.filter((row) => row.creatorId === creatorId);
}

function fanName(fans: AuditFan[], fanId: string): string {
  const fan = fans.find((item) => item.id === fanId);
  if (!fan) return "Unknown fan";
  return fan.displayName || `@${fan.handle}`;
}

function mediaRef(uploads: AuditUpload[], uploadId: string) {
  const upload = uploads.find((item) => item.id === uploadId);
  return {
    uploadId,
    mediaId: upload?.mediaId ?? uploadId,
    label: upload?.label ?? "Untitled upload",
  };
}

function coverageBlocksAbsence(coverage: AuditCoverage): boolean {
  return !coverage.historyComplete || !coverage.broadcastsIncluded;
}

function evidenceForPurchase(
  purchase: AuditPurchase,
  uploads: AuditUpload[],
  fans: AuditFan[],
  reversals: AuditRequest["reversals"],
  bundleUploadId: string,
  component: Set<string>,
): PurchaseEvidence {
  const matchedUpload = purchase.paidUploadIds.find((id) => component.has(id)) ?? bundleUploadId;
  return {
    purchaseId: purchase.id,
    fanId: purchase.fanId,
    fanName: fanName(fans, purchase.fanId),
    messageId: purchase.messageId,
    messageType: purchase.messageType,
    purchasedAt: purchase.purchasedAt,
    priceCents: purchase.priceCents,
    currency: purchase.currency,
    invoiceId: purchase.invoiceId,
    paidMedia: purchase.paidUploadIds.map((id) => mediaRef(uploads, id)),
    preview: purchase.previewUploadId ? mediaRef(uploads, purchase.previewUploadId) : null,
    matchedBecause: matchedUpload === bundleUploadId ? "same_upload" : "confirmed_duplicate",
    confirmedPath: [...component],
    reversals: reversals.filter(
      (reversal) =>
        reversal.purchaseId === purchase.id ||
        (purchase.invoiceId !== null && reversal.invoiceId === purchase.invoiceId),
    ),
  };
}

function purchasesForComponent(
  purchases: AuditPurchase[],
  audience: Set<string>,
  component: Set<string>,
): AuditPurchase[] {
  return purchases.filter(
    (purchase) =>
      audience.has(purchase.fanId) &&
      purchase.paidUploadIds.some((id) => component.has(id)),
  );
}

function summarize(status: AuditStatus, label: string): string {
  switch (status) {
    case "confirmed_purchase_overlap":
      return `${label} matches a recorded purchase of this photo, or of an upload you confirmed is the same photo.`;
    case "possible_duplicate_requiring_review":
      return `${label} has no confirmed purchase match. A suggested duplicate does, and that suggestion is not treated as the same photo until you confirm it.`;
    case "no_known_purchase_overlap":
      return `No purchased PPV chat attachment in the synchronized history matches ${label}. This only describes recorded purchases.`;
    case "incomplete_or_unsupported_history":
      return `No purchase match was found for ${label}, but the synchronized history is incomplete or does not include broadcasts. Absence is not evidence of no purchase.`;
  }
}

function auditItem(
  upload: AuditUpload,
  request: AuditRequest,
  uploads: AuditUpload[],
  purchases: AuditPurchase[],
  audienceFans: AuditFan[],
): ItemAudit {
  const audience = new Set(audienceFans.map((fan) => fan.id));
  if (audience.size === 0) {
    return {
      uploadId: upload.id,
      mediaId: upload.mediaId,
      label: upload.label,
      kind: upload.kind,
      status: "incomplete_or_unsupported_history",
      summary: `Select a fan or audience before auditing ${upload.label}.`,
      purchaseEvidence: [],
      suggestionEvidence: [],
      unpurchasedSends: [],
      fansWithoutKnownPurchase: [],
    };
  }
  const component = confirmedComponent(upload.id, request.edges);
  const unpurchasedSends = request.sentOffers.filter(
    (offer) =>
      offer.creatorId === request.creatorId &&
      audience.has(offer.fanId) &&
      (offer.paidUploadIds.some((id) => component.has(id)) ||
        (offer.previewUploadId !== null && component.has(offer.previewUploadId))),
  );

  if (upload.kind !== "image") {
    return {
      uploadId: upload.id,
      mediaId: upload.mediaId,
      label: upload.label,
      kind: upload.kind,
      status: "incomplete_or_unsupported_history",
      summary: `${upload.label} is not a photo. This audit covers photo bundles and purchased PPV chat photo attachments only.`,
      purchaseEvidence: [],
      suggestionEvidence: [],
      unpurchasedSends,
      fansWithoutKnownPurchase: audienceFans.map((fan) => ({
        fanId: fan.id,
        fanName: fan.displayName,
      })),
    };
  }

  const directPurchases = purchasesForComponent(purchases, audience, component);
  if (directPurchases.length > 0) {
    const purchaseEvidence = directPurchases.map((purchase) =>
      evidenceForPurchase(purchase, uploads, request.fans, request.reversals, upload.id, component),
    );
    const purchasers = new Set(purchaseEvidence.map((item) => item.fanId));
    return {
      uploadId: upload.id,
      mediaId: upload.mediaId,
      label: upload.label,
      kind: upload.kind,
      status: "confirmed_purchase_overlap",
      summary: summarize("confirmed_purchase_overlap", upload.label),
      purchaseEvidence,
      suggestionEvidence: [],
      unpurchasedSends,
      fansWithoutKnownPurchase: audienceFans
        .filter((fan) => !purchasers.has(fan.id))
        .map((fan) => ({ fanId: fan.id, fanName: fan.displayName })),
    };
  }

  const suggestionEvidence: SuggestionEvidence[] = [];
  for (const edge of directSuggestions(upload.id, request.edges)) {
    const partnerId = otherSide(edge, upload.id);
    const partnerComponent = confirmedComponent(partnerId, request.edges);
    const partnerPurchases = purchasesForComponent(purchases, audience, partnerComponent);
    if (partnerPurchases.length === 0) continue;
    suggestionEvidence.push({
      edgeId: edge.id,
      suggestedUploadId: partnerId,
      suggestedMediaId: mediaRef(uploads, partnerId).mediaId,
      suggestedLabel: mediaRef(uploads, partnerId).label,
      purchases: partnerPurchases.map((purchase) =>
        evidenceForPurchase(purchase, uploads, request.fans, request.reversals, partnerId, partnerComponent),
      ),
    });
  }

  if (suggestionEvidence.length > 0) {
    return {
      uploadId: upload.id,
      mediaId: upload.mediaId,
      label: upload.label,
      kind: upload.kind,
      status: "possible_duplicate_requiring_review",
      summary: summarize("possible_duplicate_requiring_review", upload.label),
      purchaseEvidence: [],
      suggestionEvidence,
      unpurchasedSends,
      fansWithoutKnownPurchase: audienceFans.map((fan) => ({
        fanId: fan.id,
        fanName: fan.displayName,
      })),
    };
  }

  const status: AuditStatus = coverageBlocksAbsence(request.coverage)
    ? "incomplete_or_unsupported_history"
    : "no_known_purchase_overlap";

  return {
    uploadId: upload.id,
    mediaId: upload.mediaId,
    label: upload.label,
    kind: upload.kind,
    status,
    summary: summarize(status, upload.label),
    purchaseEvidence: [],
    suggestionEvidence: [],
    unpurchasedSends,
    fansWithoutKnownPurchase: audienceFans.map((fan) => ({
      fanId: fan.id,
      fanName: fan.displayName,
    })),
  };
}

export function auditBundle(request: AuditRequest): AuditReport {
  const uploads = scoped(request.creatorId, request.uploads);
  const edges = scoped(request.creatorId, request.edges);
  const purchases = scoped(request.creatorId, request.purchases);
  const reversals = scoped(request.creatorId, request.reversals);
  const sentOffers = scoped(request.creatorId, request.sentOffers);
  const fans = scoped(request.creatorId, request.fans);
  const isolated: AuditRequest = {
    ...request,
    uploads,
    edges,
    purchases,
    reversals,
    sentOffers,
    fans,
    coverage:
      request.coverage.creatorId === request.creatorId
        ? request.coverage
        : {
            ...request.coverage,
            creatorId: request.creatorId,
            historyComplete: false,
            broadcastsIncluded: false,
            gaps: [
              ...request.coverage.gaps,
              "Coverage from another creator was ignored.",
            ],
          },
  };

  const audience = isolated.fans.filter((fan) => request.audienceFanIds.includes(fan.id));
  const byId = new Map(isolated.uploads.map((upload) => [upload.id, upload]));
  const items = request.bundleUploadIds
    .map((id) => byId.get(id))
    .filter((upload): upload is AuditUpload => Boolean(upload))
    .map((upload) => auditItem(upload, isolated, isolated.uploads, isolated.purchases, audience));

  const counts = { ...EMPTY_COUNTS };
  for (const item of items) counts[item.status] += 1;

  return {
    creatorId: request.creatorId,
    coverage: isolated.coverage,
    audience,
    items,
    counts,
  };
}

export function sendsTouching(
  sends: UnpurchasedSend[],
  uploadIds: Set<string>,
): UnpurchasedSend[] {
  return sends.filter(
    (send) =>
      send.paidUploadIds.some((id) => uploadIds.has(id)) ||
      (send.previewUploadId !== null && uploadIds.has(send.previewUploadId)),
  );
}
