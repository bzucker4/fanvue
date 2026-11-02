import { describe, expect, it } from "vitest";
import { describeCheckedHistory } from "@/lib/coverage-label";
import { erasureConfirmed } from "@/lib/deletion";

describe("coverage labels", () => {
  it("describes the sample read without turning a boolean into a percentage", () => {
    const labels = describeCheckedHistory({
      mode: "demo",
      status: "ready",
      historyComplete: true,
      broadcastsIncluded: true,
      chatsDiscovered: 2,
      chatsImported: 2,
      messagesScanned: 3,
      synchronizedAtLabel: "Oct 28, 2026, 11:04 AM ET",
    });
    expect(labels.historyLabel).toBe("History fully read");
    expect(labels.broadcastLabel).toBe("Broadcasts included");
    expect(labels.summary).toContain("Labeled sample history");
    expect(labels.summary).toContain("2 of 2 discovered chats");
    expect(labels.summary).toContain("3 messages were scanned");
    expect(labels.summary).toContain("each chat’s own history");
    expect(labels.summary).not.toMatch(/%/);
  });

  it("does not call a missing import fully read", () => {
    const labels = describeCheckedHistory({
      mode: "live",
      status: "idle",
      historyComplete: false,
      broadcastsIncluded: false,
      chatsDiscovered: 0,
      chatsImported: 0,
      messagesScanned: 0,
      synchronizedAtLabel: null,
    });
    expect(labels.historyLabel).toBe("History not imported");
    expect(labels.broadcastLabel).toBe("Broadcasts not included");
    expect(labels.summary).toContain("No successful synchronization");
  });
});

describe("workspace erasure confirmation", () => {
  it("stays off unless the dialog confirmation value is present", () => {
    expect(erasureConfirmed(null)).toBe(false);
    expect(erasureConfirmed("yes")).toBe(false);
    expect(erasureConfirmed("erase-workspace")).toBe(true);
  });
});
