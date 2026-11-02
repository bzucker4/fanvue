import type { Entitlement } from "../fanvue/entitlement";

export type BillingMode = "fanvue_plan" | "validation" | "unknown";

export type ImportDecision =
  | { allow: true; billingMode: Exclude<BillingMode, "unknown">; notice: string }
  | { allow: false; message: string };

/**
 * An active Fanvue plan unlocks live import.
 * FANVUE_VALIDATION_IMPORT lets a test account read its own history without a charge.
 * Neither path substitutes demo purchases.
 */
export function liveImportDecision(entitlement: Entitlement, validationImport: boolean): ImportDecision {
  if (entitlement.state === "active") {
    return {
      allow: true,
      billingMode: "fanvue_plan",
      notice: "Live import is covered by an active Fanvue plan.",
    };
  }
  if (validationImport) {
    return {
      allow: true,
      billingMode: "validation",
      notice:
        "Validation import is enabled. This read is not an active Fanvue plan, and demo purchases are not used.",
    };
  }
  return { allow: false, message: entitlement.message };
}
