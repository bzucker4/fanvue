import { FanvueApiError } from "../fanvue/client";
import type { ImportDraft } from "../fanvue/import-history";

const KEPT = "Stored purchases were kept. The sample workspace was not used.";

/**
 * A chat-list or per-chat failure that stored nothing must not be recorded as a
 * synchronization. An account with zero chats and a complete list is not this case.
 */
export function importStoppedBeforeAnyChat(
  draft: Pick<ImportDraft, "historyComplete" | "chatsImported" | "gaps">,
): boolean {
  return !draft.historyComplete && draft.chatsImported === 0 && draft.gaps.length > 0;
}

export function describeImportFailure(error: unknown): string {
  if (error instanceof FanvueApiError) {
    if (error.status === 429) {
      return `Fanvue rate-limited this import. Wait and try again. ${KEPT}`;
    }
    if (error.status === 401) {
      return `The Fanvue connection expired. Reconnect, then import again. ${KEPT}`;
    }
    if (error.status === 403) {
      return `Fanvue denied permission for this import. Reconnect and accept read:self, read:chat, read:media, and read:creator. ${KEPT}`;
    }
  }
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : "Import failed.";
  return message.includes(KEPT) ? message : `${message} ${KEPT}`;
}

export function coverageForAudit(state: {
  status?: string | null;
  historyComplete?: boolean | null;
  broadcastsIncluded?: boolean | null;
} | null): { historyComplete: boolean; broadcastsIncluded: boolean } {
  if (!state || state.status === "error" || state.status === "idle") {
    return { historyComplete: false, broadcastsIncluded: false };
  }
  return {
    historyComplete: state.historyComplete === true,
    broadcastsIncluded: state.broadcastsIncluded === true,
  };
}

export type PurchaseListState = "failed" | "not_imported" | "incomplete" | "none_stored";

export function purchaseListState(input: {
  status: string | null | undefined;
  purchaseCount: number;
  lastSynchronizedAt: Date | string | null | undefined;
}): PurchaseListState | "has_rows" {
  if (input.purchaseCount > 0) return "has_rows";
  if (input.status === "error") return "failed";
  if (input.status === "incomplete") return "incomplete";
  if (!input.lastSynchronizedAt || input.status === "idle") return "not_imported";
  return "none_stored";
}
