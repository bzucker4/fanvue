import { planDeeplink, type FanvueConfig } from "./config";
import { FanvueClient } from "./client";

export type Entitlement =
  | { state: "unconfigured"; message: string }
  | { state: "active"; planName: string | null; currentPeriodEnd: string | null }
  | { state: "inactive"; status: string; checkoutHref: string | null; message: string }
  | { state: "unknown"; message: string };

interface SubscriptionMe {
  hasActiveSubscription?: boolean;
  status?: string;
  planName?: string | null;
  currentPeriodEnd?: string | null;
  managedCreators?: Array<{
    userUuid?: string;
    hasActiveSubscription?: boolean;
    status?: string;
    planName?: string | null;
    currentPeriodEnd?: string | null;
  }>;
}

/**
 * Live import and live audit are the paid surface. Entitlement is read from
 * GET /apps/{appUuid}/subscription/me (scope read:self). Checkout, when offered,
 * is the documented Fanvue App Store deeplink.
 */
export async function readEntitlement(
  config: FanvueConfig,
  client: FanvueClient,
  creatorUuid: string | null,
): Promise<Entitlement> {
  if (!config.appUuid) {
    return {
      state: "unconfigured",
      message: "FANVUE_APP_UUID is not set, so Bundle Audit cannot read Fanvue subscription status.",
    };
  }
  try {
    const body = await client.getJson<SubscriptionMe>(`/apps/${config.appUuid}/subscription/me`);
    const managed = (body.managedCreators ?? []).find((row) => creatorUuid && row.userUuid === creatorUuid);
    const record = managed ?? body;
    if (record.hasActiveSubscription) {
      return {
        state: "active",
        planName: record.planName ?? null,
        currentPeriodEnd: record.currentPeriodEnd ?? null,
      };
    }
    const checkoutHref =
      config.planUuid ? planDeeplink(config.appUuid, config.planUuid) : null;
    return {
      state: "inactive",
      status: record.status ?? "none",
      checkoutHref,
      message: checkoutHref
        ? "An active Fanvue plan is required for live import and live audit. Payment stays on Fanvue."
        : "An active Fanvue plan is required. Add FANVUE_PLAN_UUID to show the App Store plan deeplink.",
    };
  } catch (error) {
    return {
      state: "unknown",
      message: error instanceof Error ? error.message : "Subscription status could not be read.",
    };
  }
}
