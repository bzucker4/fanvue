import { describe, expect, it } from "vitest";
import { liveImportDecision } from "@/lib/live/import-gate";

describe("live import gate", () => {
  it("allows an active Fanvue plan", () => {
    const decision = liveImportDecision(
      { state: "active", planName: "Pro", currentPeriodEnd: "2026-12-01T00:00:00.000Z" },
      false,
    );
    expect(decision).toMatchObject({ allow: true, billingMode: "fanvue_plan" });
  });

  it("blocks an unpaid account unless validation import is explicit", () => {
    const inactive = {
      state: "inactive" as const,
      status: "none",
      checkoutHref: "https://www.fanvue.com/app-store/details/app?plan=plan",
      message: "An active Fanvue plan is required for live import and live audit.",
    };
    expect(liveImportDecision(inactive, false)).toMatchObject({ allow: false });
    expect(liveImportDecision(inactive, true)).toMatchObject({ allow: true, billingMode: "validation" });
    expect(liveImportDecision({ state: "unconfigured", message: "FANVUE_APP_UUID is not set." }, false).allow).toBe(
      false,
    );
  });
});
