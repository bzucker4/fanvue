import { describe, expect, it } from "vitest";
import { validationBypassForCreator } from "@/lib/fanvue/config";
import { liveImportDecision } from "@/lib/live/import-gate";

const LISTED = "00000000-0000-4000-8000-000000000003";
const OTHER = "00000000-0000-4000-8000-000000000099";

const inactive = {
  state: "inactive" as const,
  status: "none",
  checkoutHref: "https://www.fanvue.com/app-store/details/app?plan=plan",
  message: "An active Fanvue plan is required for live import and live audit.",
};

function env(nodeEnv: string, ids = LISTED): NodeJS.ProcessEnv {
  return {
    NODE_ENV: nodeEnv,
    FANVUE_VALIDATION_IMPORT: "true",
    FANVUE_VALIDATION_CREATOR_IDS: ids,
  };
}

describe("live import gate", () => {
  it("allows an active Fanvue plan without the validation flag", () => {
    const decision = liveImportDecision(
      { state: "active", planName: "Pro", currentPeriodEnd: "2026-12-01T00:00:00.000Z" },
      { allowed: false, reason: "disabled" },
    );
    expect(decision).toMatchObject({ allow: true, billingMode: "fanvue_plan" });
  });

  it("allows validation only for an allowlisted creator in development or test", () => {
    expect(validationBypassForCreator(env("development"), LISTED.toUpperCase())).toEqual({ allowed: true });
    expect(validationBypassForCreator(env("test"), LISTED)).toEqual({ allowed: true });
    const allowed = liveImportDecision(inactive, validationBypassForCreator(env("development"), LISTED));
    expect(allowed).toMatchObject({ allow: true, billingMode: "validation" });
  });

  it("refuses every other creator, production, and an empty allowlist", () => {
    expect(validationBypassForCreator(env("development"), OTHER).reason).toBe("creator_not_listed");
    expect(validationBypassForCreator(env("production"), LISTED).reason).toBe("production");
    expect(validationBypassForCreator(env("development", ""), LISTED).reason).toBe("allowlist_empty");
    expect(validationBypassForCreator(env("development", "not-a-uuid"), LISTED).reason).toBe("allowlist_empty");
    expect(
      validationBypassForCreator({ ...env("development"), FANVUE_VALIDATION_IMPORT: "false" }, LISTED).reason,
    ).toBe("disabled");

    const blocked = liveImportDecision(inactive, validationBypassForCreator(env("development"), OTHER));
    expect(blocked.allow).toBe(false);
    if (!blocked.allow) {
      expect(blocked.message).toContain("FANVUE_VALIDATION_CREATOR_IDS");
    }
    const unpaid = liveImportDecision(inactive, { allowed: false, reason: "disabled" });
    expect(unpaid.allow).toBe(false);
    if (!unpaid.allow) expect(unpaid.message).toBe(inactive.message);
  });
});