import type { ValidationBypass } from "../fanvue/config";
import type { Entitlement } from "../fanvue/entitlement";

export type BillingMode = "fanvue_plan" | "validation" | "unknown";

export type ImportDecision =
  | { allow: true; billingMode: Exclude<BillingMode, "unknown">; notice: string }
  | { allow: false; message: string };

/**
 * An active Fanvue plan unlocks live import for that creator.
 * The validation bypass is only the explicit development/test allowlist.
 * Neither path substitutes demo purchases.
 */
export function liveImportDecision(entitlement: Entitlement, bypass: ValidationBypass): ImportDecision {
  if (entitlement.state === "active") {
    return {
      allow: true,
      billingMode: "fanvue_plan",
      notice: "Live import is covered by an active Fanvue plan.",
    };
  }
  if (bypass.allowed) {
    return {
      allow: true,
      billingMode: "validation",
      notice:
        "Validation import is reading an allowlisted test creator. This is not an active Fanvue plan, and demo purchases are not used.",
    };
  }
  return { allow: false, message: validationBlockMessage(bypass) ?? entitlement.message };
}

export function validationBlockMessage(bypass: ValidationBypass): string | null {
  if (bypass.allowed || bypass.reason === "disabled") return null;
  if (bypass.reason === "production") {
    return "Validation import is ignored because NODE_ENV is not development or test. An active Fanvue plan is required.";
  }
  if (bypass.reason === "allowlist_empty") {
    return "FANVUE_VALIDATION_IMPORT is set, but FANVUE_VALIDATION_CREATOR_IDS has no Fanvue user ids. No creator can skip the Fanvue plan.";
  }
  if (bypass.reason === "creator_unknown") {
    return "This workspace has no Fanvue user id, so validation import cannot run.";
  }
  return "This Fanvue account is not listed in FANVUE_VALIDATION_CREATOR_IDS. Live import requires an active Fanvue plan.";
}
