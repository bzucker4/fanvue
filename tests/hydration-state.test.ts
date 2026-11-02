import { describe, expect, it } from "vitest";
import { hydrationCanResolve } from "../src/lib/live/hydration-state";

describe("payment reconciliation", () => {
  it("does not resolve a paid event against an unpaid send", () => {
    expect(hydrationCanResolve("message_purchase", "fan-a", null, "fan-a")).toBe(false);
  });
  it("requires a purchase belonging to the event buyer", () => {
    expect(hydrationCanResolve("message_purchase", "fan-a", "fan-b", null)).toBe(false);
    expect(hydrationCanResolve("message_purchase", null, "fan-a", null)).toBe(false);
    expect(hydrationCanResolve("message_purchase", "fan-a", "fan-a", null)).toBe(true);
  });
  it("can resolve a send signal without falsely requiring a purchase", () => {
    expect(hydrationCanResolve("message_signal", "fan-a", null, "fan-a")).toBe(true);
    expect(hydrationCanResolve("message_signal", null, null, "fan-a")).toBe(false);
  });
});
