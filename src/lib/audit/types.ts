/** An upload is one Fanvue media ID. It is not, by itself, a content identity. */
export type MediaKind = "image" | "video" | "other";

export type DuplicateStatus = "suggested" | "confirmed" | "rejected" | "reversed";

export type AuditStatus =
  | "confirmed_purchase_overlap"
  | "possible_duplicate_requiring_review"
  | "no_known_purchase_overlap"
  | "incomplete_or_unsupported_history";

export interface AuditUpload {
  id: string;
  creatorId: string;
  mediaId: string;
  label: string;
  kind: MediaKind;
}

export interface AuditEdge {
  id: string;
  creatorId: string;
  leftUploadId: string;
  rightUploadId: string;
  status: DuplicateStatus;
}

export interface AuditPurchase {
  id: string;
  creatorId: string;
  fanId: string;
  messageId: string;
  messageType: string;
  purchasedAt: string;
  priceCents: number | null;
  currency: string;
  invoiceId: string | null;
  /** Paid attachments only. The free preview is never included here. */
  paidUploadIds: string[];
  previewUploadId: string | null;
  textExcerpt: string | null;
}

export interface AuditReversal {
  id: string;
  creatorId: string;
  purchaseId: string | null;
  invoiceId: string | null;
  kind: "refund" | "dispute_flagged" | "dispute_open";
  amountCents: number | null;
}

/** A priced send with no purchase timestamp. The audit must not treat it as a purchase. */
export interface UnpurchasedSend {
  id: string;
  creatorId: string;
  fanId: string;
  messageId: string;
  messageType: string;
  sentAt: string;
  priceCents: number | null;
  paidUploadIds: string[];
  previewUploadId: string | null;
}

export interface AuditFan {
  id: string;
  creatorId: string;
  displayName: string;
  handle: string;
}

export interface AuditCoverage {
  creatorId: string;
  historyComplete: boolean;
  /**
   * True only when purchase history was read from per-chat message history,
   * which Fanvue documents as including broadcast messages.
   * Bulk chat history excludes them, so a batch-only import must leave this false.
   */
  broadcastsIncluded: boolean;
  lastSynchronizedAt: string | null;
  gaps: string[];
  unsupported: string[];
}

export interface AuditRequest {
  creatorId: string;
  bundleUploadIds: string[];
  audienceFanIds: string[];
  uploads: AuditUpload[];
  edges: AuditEdge[];
  purchases: AuditPurchase[];
  reversals: AuditReversal[];
  sentOffers: UnpurchasedSend[];
  fans: AuditFan[];
  coverage: AuditCoverage;
}

export interface PurchaseEvidence {
  purchaseId: string;
  fanId: string;
  fanName: string;
  messageId: string;
  messageType: string;
  purchasedAt: string;
  priceCents: number | null;
  currency: string;
  invoiceId: string | null;
  paidMedia: { uploadId: string; mediaId: string; label: string }[];
  preview: { uploadId: string; mediaId: string; label: string } | null;
  matchedBecause: "same_upload" | "confirmed_duplicate";
  confirmedPath: string[];
  reversals: AuditReversal[];
}

export interface SuggestionEvidence {
  edgeId: string;
  suggestedUploadId: string;
  suggestedMediaId: string;
  suggestedLabel: string;
  purchases: PurchaseEvidence[];
}

export interface ItemAudit {
  uploadId: string;
  mediaId: string;
  label: string;
  kind: MediaKind;
  status: AuditStatus;
  summary: string;
  purchaseEvidence: PurchaseEvidence[];
  suggestionEvidence: SuggestionEvidence[];
  unpurchasedSends: UnpurchasedSend[];
  fansWithoutKnownPurchase: { fanId: string; fanName: string }[];
}

export interface AuditReport {
  creatorId: string;
  coverage: AuditCoverage;
  audience: AuditFan[];
  items: ItemAudit[];
  counts: Record<AuditStatus, number>;
}
