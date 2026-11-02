import { mapChatMessage, nextMessageCursor, type FanvueChatMessage, type MappedMessage } from "../audit/map-message";
import { FanvueApiError, FanvueClient } from "./client";

/**
 * Purchase backfill uses GET /chats/{userUuid}/messages.
 * Fanvue documents that this per-chat history includes BROADCAST mass messages.
 * POST /chats/messages/batch leaves mass messages out, so this importer does not call it.
 *
 * Every message read passes markAsRead=false. The default is true, and a read-only
 * import must not clear the creator's unread state.
 *
 * https://api.fanvue.com/docs/tutorials/efficient-chat-sync
 */

export interface ChatListItem {
  user?: {
    uuid?: string;
    handle?: string;
    displayName?: string;
  };
}

export interface ChatListPage {
  data?: ChatListItem[];
  pagination?: { hasMore?: boolean };
}

export interface ImportDraft {
  fans: { fanvueUuid: string; handle: string; displayName: string }[];
  purchases: MappedMessage[];
  sentOffers: MappedMessage[];
  /** Chat counterpart for every priced message, purchased or only sent. */
  fanByMessage: Record<string, string>;
  broadcastsIncluded: boolean;
  historyComplete: boolean;
  chatsDiscovered: number;
  chatsImported: number;
  messagesScanned: number;
  gaps: string[];
  unsupported: string[];
  methodNote: string;
}

const METHOD_NOTE =
  "Purchase history is read per chat with GET /chats/{userUuid}/messages?markAsRead=false. That history includes broadcast messages. POST /chats/messages/batch is not used because Fanvue documents it as excluding mass messages.";

const UNSUPPORTED = [
  "Post purchases, tips, subscriptions, and non-photo attachments are recorded only as outside this photo audit.",
  "Signed media URLs are not stored. Media files are not downloaded for fingerprinting.",
];

export async function importPurchaseHistory(client: FanvueClient): Promise<ImportDraft> {
  const draft: ImportDraft = {
    fans: [],
    purchases: [],
    sentOffers: [],
    fanByMessage: {},
    broadcastsIncluded: true,
    historyComplete: true,
    chatsDiscovered: 0,
    chatsImported: 0,
    messagesScanned: 0,
    gaps: [],
    unsupported: [...UNSUPPORTED],
    methodNote: METHOD_NOTE,
  };

  let chats: ChatListItem[] = [];
  try {
    chats = await listAllChats(client);
  } catch (error) {
    draft.historyComplete = false;
    draft.gaps.push(error instanceof Error ? error.message : "Chat list failed.");
    return draft;
  }
  draft.chatsDiscovered = chats.length;

  for (const chat of chats) {
    const fanvueUuid = chat.user?.uuid;
    if (!fanvueUuid) {
      draft.historyComplete = false;
      draft.gaps.push("A chat was missing a fan uuid and was skipped.");
      continue;
    }
    draft.fans.push({
      fanvueUuid,
      handle: chat.user?.handle || fanvueUuid.slice(0, 8),
      displayName: chat.user?.displayName || chat.user?.handle || "Fan",
    });
    try {
      const messages = await walkChat(client, fanvueUuid, draft);
      for (const message of messages) {
        draft.messagesScanned += 1;
        const mapped = mapChatMessage(message);
        if (!mapped) continue;
        draft.fanByMessage[mapped.messageId] = fanvueUuid;
        if (mapped.purchased) draft.purchases.push(mapped);
        else draft.sentOffers.push(mapped);
      }
      draft.chatsImported += 1;
    } catch (error) {
      draft.historyComplete = false;
      if (error instanceof FanvueApiError && error.ageVerificationUrl) {
        draft.gaps.push(`Age verification is required before media or chat media can be read. ${error.ageVerificationUrl}`);
      } else {
        draft.gaps.push(
          `Chat ${fanvueUuid} was not fully imported: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }
  }

  return draft;
}

async function listAllChats(client: FanvueClient): Promise<ChatListItem[]> {
  const chats: ChatListItem[] = [];
  const size = 50;
  for (let page = 1; page <= 200; page += 1) {
    const body = await client.getJson<ChatListPage>(`/chats?page=${page}&size=${size}`);
    const data = Array.isArray(body.data) ? body.data : [];
    chats.push(...data);
    if (body.pagination?.hasMore === false) break;
    if (data.length < size) break;
    if (page === 200) {
      throw new Error("Chat list did not end before the page guard. Coverage is incomplete.");
    }
  }
  return chats;
}

async function walkChat(client: FanvueClient, fanUuid: string, draft: ImportDraft): Promise<FanvueChatMessage[]> {
  const messages: FanvueChatMessage[] = [];
  let cursor: string | null = null;
  for (let guard = 0; guard < 10000; guard += 1) {
    const params = new URLSearchParams({ size: "50", markAsRead: "false" });
    if (cursor) params.set("beforeMessageUuid", cursor);
    const page = await client.getJson<{ data?: FanvueChatMessage[]; pagination?: { hasMore?: boolean } }>(
      `/chats/${encodeURIComponent(fanUuid)}/messages?${params.toString()}`,
    );
    const data = Array.isArray(page.data) ? page.data : [];
    messages.push(...data);
    const next = nextMessageCursor(page);
    if (!next.paginationKnown) {
      draft.historyComplete = false;
      draft.gaps.push(
        `Chat ${fanUuid} omitted pagination.hasMore. Import stopped for that chat instead of guessing the next page.`,
      );
      break;
    }
    if (!next.hasMore) break;
    if (!next.cursor) {
      draft.historyComplete = false;
      draft.gaps.push(`Chat ${fanUuid} reported more messages without a cursor.`);
      break;
    }
    cursor = next.cursor;
  }
  return messages;
}

export interface MediaMetadata {
  uuid: string;
  status: string;
  mediaType: string | null;
  name: string | null;
}

/**
 * Stores ids and type only. Variant URLs are omitted on purpose.
 * https://api.fanvue.com/docs/tutorials/working-with-media
 */
export async function listMediaMetadata(client: FanvueClient): Promise<{ items: MediaMetadata[]; complete: boolean; gap?: string }> {
  const items: MediaMetadata[] = [];
  const size = 50;
  try {
    for (let page = 1; page <= 200; page += 1) {
      const body = await client.getJson<{ data?: Array<Record<string, unknown>>; pagination?: { hasMore?: boolean } }>(
        `/media?status=ready&page=${page}&size=${size}`,
      );
      const data = Array.isArray(body.data) ? body.data : [];
      for (const row of data) {
        if (typeof row.uuid !== "string") continue;
        items.push({
          uuid: row.uuid,
          status: typeof row.status === "string" ? row.status : "ready",
          mediaType: typeof row.mediaType === "string" ? row.mediaType : typeof row.media_type === "string" ? row.media_type : null,
          name: typeof row.name === "string" ? row.name : typeof row.caption === "string" ? row.caption : null,
        });
      }
      if (body.pagination?.hasMore === false) break;
      if (data.length < size) break;
    }
    return { items, complete: true };
  } catch (error) {
    return {
      items,
      complete: false,
      gap: error instanceof Error ? error.message : "Media metadata import failed.",
    };
  }
}

export function mediaKindFromType(mediaType: string | null): "image" | "video" | "other" {
  const value = (mediaType ?? "").toLowerCase();
  if (value.includes("image") || value === "photo") return "image";
  if (value.includes("video")) return "video";
  return "other";
}

/**
 * Catch-up after downtime. `startDate` is exclusive and per chat.
 * Broadcasts stay included because this still uses the per-chat endpoint.
 */
export async function reconcileChatSince(
  client: FanvueClient,
  fanUuid: string,
  startDate: string,
): Promise<FanvueChatMessage[]> {
  const messages: FanvueChatMessage[] = [];
  let page = 1;
  for (let guard = 0; guard < 10000; guard += 1) {
    const params = new URLSearchParams({
      size: "50",
      markAsRead: "false",
      startDate,
      page: String(page),
    });
    const body = await client.getJson<{ data?: FanvueChatMessage[]; pagination?: { hasMore?: boolean } }>(
      `/chats/${encodeURIComponent(fanUuid)}/messages?${params.toString()}`,
    );
    const data = Array.isArray(body.data) ? body.data : [];
    messages.push(...data);
    const next = nextMessageCursor(body);
    if (!next.paginationKnown || !next.hasMore) break;
    page += 1;
  }
  return messages;
}
