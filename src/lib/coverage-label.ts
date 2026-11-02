export interface CheckedHistory {
  mode: string;
  status: string | null;
  historyComplete: boolean;
  broadcastsIncluded: boolean;
  chatsDiscovered: number;
  chatsImported: number;
  messagesScanned: number;
  /** Already formatted for display. Null when no successful synchronization is stored. */
  synchronizedAtLabel: string | null;
}

export interface CoverageLabels {
  historyLabel: string;
  broadcastLabel: string;
  summary: string;
}

/**
 * Words for the coverage panel. These are not a percentage: a boolean flag has
 * no denominator, and “2 of 2 discovered chats” only counts chats this import saw.
 */
export function describeCheckedHistory(input: CheckedHistory): CoverageLabels {
  const historyLabel = !input.synchronizedAtLabel
    ? "History not imported"
    : input.historyComplete
      ? "History fully read"
      : "History not fully read";
  const broadcastLabel = input.broadcastsIncluded ? "Broadcasts included" : "Broadcasts not included";
  const source =
    input.mode === "demo"
      ? "Labeled sample history, not a Fanvue account."
      : "Connected Fanvue account.";
  const chats = `${input.chatsImported} of ${input.chatsDiscovered} discovered chats were fully imported, and ${input.messagesScanned} messages were scanned.`;
  const when = input.synchronizedAtLabel
    ? `Last successful synchronization ${input.synchronizedAtLabel}.`
    : "No successful synchronization is stored.";
  const broadcasts = input.broadcastsIncluded
    ? "Broadcast purchases are included because each chat’s own history was read."
    : "Broadcast purchases were not included in this read.";
  const limits =
    "Checked records are purchased PPV chat photo attachments only. A sent message, free preview, tip, subscription, post purchase, or video is not counted as a purchase.";
  return {
    historyLabel,
    broadcastLabel,
    summary: `${source} ${chats} ${when} ${broadcasts} ${limits}`,
  };
}
