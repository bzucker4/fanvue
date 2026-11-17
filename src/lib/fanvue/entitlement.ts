import { planDeeplink, type FanvueConfig } from "./config";
import { FanvueApiError, FanvueClient } from "./client";

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
 * Access to live import and live audit is read from
 * GET /apps/{appUuid}/subscription/me (scope read:self). Creators subscribe through the Fanvue App Store.
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
        ? "Subscribe on Fanvue to import purchase history and run live audits."
        : "An active Fanvue subscription is required for live import. Contact support if the plan is unavailable.",
    };
  } catch (error) {
    if (error instanceof FanvueApiError && error.status === 404) {
      return {
        state: "inactive",
        status: "none",
        checkoutHref: null,
        message: "The Bundle Audit subscription is not available to this account yet. You can still try the free sample audit.",
      };
    }
    return {
      state: "unknown",
      message: error instanceof Error ? error.message : "Subscription status could not be read.",
    };
  }
}
