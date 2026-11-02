import { describe, expect, it } from "vitest";
import { FanvueApiError } from "@/lib/fanvue/client";
import {
  coverageForAudit,
  describeImportFailure,
  importStoppedBeforeAnyChat,
  purchaseListState,
} from "@/lib/live/import-failure";

describe("import failure handling", () => {
  it("does not treat a failed chat list as a completed empty sync", () => {
    expect(
      importStoppedBeforeAnyChat({
        historyComplete: false,
        chatsImported: 0,
        gaps: ["Chat list failed."],
      }),
    ).toBe(true);
  });

  it("allows a complete account that simply has no chats", () => {
    expect(
      importStoppedBeforeAnyChat({
        historyComplete: true,
        chatsImported: 0,
        gaps: [],
      }),
    ).toBe(false);
  });

  it("keeps a partial import as an incomplete sync rather than a total failure", () => {
    expect(
      importStoppedBeforeAnyChat({
        historyComplete: false,
        chatsImported: 1,
        gaps: ["One chat failed."],
      }),
    ).toBe(false);
  });

  it("names rate limit, expiry, and permission denial without calling the import successful", () => {
    expect(describeImportFailure(new FanvueApiError("too many", 429, null))).toMatch(/rate-limited/i);
    expect(describeImportFailure(new FanvueApiError("unauthorized", 401, null))).toMatch(/Reconnect/);
    expect(describeImportFailure(new FanvueApiError("forbidden", 403, null))).toMatch(/denied permission/i);
    for (const status of [429, 401, 403]) {
      const message = describeImportFailure(new FanvueApiError("x", status, null));
      expect(message).toMatch(/sample workspace was not used/i);
      expect(message).not.toMatch(/import finished/i);
    }
  });

  it("does not let an errored import report complete coverage", () => {
    expect(
      coverageForAudit({ status: "error", historyComplete: true, broadcastsIncluded: true }),
    ).toEqual({ historyComplete: false, broadcastsIncluded: false });
    expect(coverageForAudit({ status: "ready", historyComplete: true, broadcastsIncluded: true })).toEqual({
      historyComplete: true,
      broadcastsIncluded: true,
    });
  });

  it("does not describe a failed or unfinished import as an empty purchase history", () => {
    expect(purchaseListState({ status: "error", purchaseCount: 0, lastSynchronizedAt: null })).toBe("failed");
    expect(purchaseListState({ status: "idle", purchaseCount: 0, lastSynchronizedAt: null })).toBe("not_imported");
    expect(purchaseListState({ status: "incomplete", purchaseCount: 0, lastSynchronizedAt: new Date() })).toBe(
      "incomplete",
    );
    expect(purchaseListState({ status: "ready", purchaseCount: 0, lastSynchronizedAt: new Date() })).toBe("none_stored");
    expect(purchaseListState({ status: "error", purchaseCount: 2, lastSynchronizedAt: new Date() })).toBe("has_rows");
  });
});
