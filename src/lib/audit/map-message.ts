/**
 * Maps a documented Fanvue chat message into purchase evidence.
 *
 * Purchase state comes from `purchasedAt` on the message. A priced message
 * without that timestamp was sent, not purchased. The free preview
 * (`mediaPreviewUuid`) is stored separately and is not a paid attachment.
 *
 * See: https://api.fanvue.com/docs/tutorials/working-with-messages
 * and the pricing section of https://api.fanvue.com/docs/tutorials/working-with-media
 */

export interface FanvueChatMessage {
  uuid: string;
  text?: string | null;
  sentAt: string;
  hasMedia?: boolean;
  mediaType?: string | null;
  mediaUuids?: string[] | null;
  mediaPreviewUuid?: string | null;
  type?: string | null;
  pricing?: { USD?: { price?: number | null } | null } | null;
  purchasedAt?: string | null;
}

export interface MappedMessage {
  messageId: string;
  messageType: string;
  sentAt: string;
  priceCents: number | null;
  purchasedAt: string | null;
  textExcerpt: string | null;
  paidMediaIds: string[];
  previewMediaId: string | null;
  isBroadcast: boolean;
  /** True when this message is purchase evidence. False for unpaid sends. */
  purchased: boolean;
}

const BROADCAST_TYPES = new Set(["BROADCAST", "GHOST_PROMOTION"]);

export function priceCentsOf(message: FanvueChatMessage): number | null {
  const price = message.pricing?.USD?.price;
  return typeof price === "number" ? price : null;
}

export function isPricedMessage(message: FanvueChatMessage): boolean {
  return priceCentsOf(message) !== null;
}

export function mapChatMessage(message: FanvueChatMessage): MappedMessage | null {
  if (!isPricedMessage(message)) return null;
  const preview = message.mediaPreviewUuid ?? null;
  const attached = Array.isArray(message.mediaUuids) ? message.mediaUuids : [];
  const paidMediaIds = attached.filter((id) => id && id !== preview);
  const purchasedAt = message.purchasedAt ?? null;
  const text = message.text?.trim() ?? "";
  return {
    messageId: message.uuid,
    messageType: message.type ?? "UNKNOWN",
    sentAt: message.sentAt,
    priceCents: priceCentsOf(message),
    purchasedAt,
    textExcerpt: text ? text.slice(0, 140) : null,
    paidMediaIds,
    previewMediaId: preview,
    isBroadcast: BROADCAST_TYPES.has(message.type ?? ""),
    purchased: Boolean(purchasedAt),
  };
}

export interface MessagePage {
  data?: FanvueChatMessage[];
  pagination?: { hasMore?: boolean };
}

/**
 * Fanvue documents `pagination.hasMore` on per-chat history. A missing flag is
 * treated as an incomplete page rather than guessed.
 */
export function nextMessageCursor(
  page: MessagePage,
): { cursor: string | null; hasMore: boolean; paginationKnown: boolean } {
  const data = Array.isArray(page.data) ? page.data : [];
  const hasMore = page.pagination?.hasMore;
  if (typeof hasMore !== "boolean") {
    return { cursor: null, hasMore: false, paginationKnown: false };
  }
  if (!hasMore || data.length === 0) {
    return { cursor: null, hasMore: false, paginationKnown: true };
  }
  const last = data[data.length - 1];
  return { cursor: last?.uuid ?? null, hasMore: true, paginationKnown: true };
}
