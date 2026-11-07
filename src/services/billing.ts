import { apiGet } from "./api";
/** GET /api/v1/billing/subscription — verified against the backend router (billing.py). */
export type BackendSubscriptionResponse = {
  tier: string;
  subscription: {
    id: string;
    provider: string;
    tier: string;
    status: string;
    effective_tier: string;
    seats_count: number;
    currency: string | null;
    amount_minor: number | null;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    cancel_at_period_end: boolean;
  } | null;
  entitlement: {
    tier: string;
    expires_at: number;
    grace_days: number;
    signature: string;
  };
};
export type Subscription = {
  /** Entitled tier decided by the backend ("free" | "pro" | "bundle_2" | "bundle_3"). */
  tier: string;
  isPaid: boolean;
  status: string | null;
  periodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
};
export function mapSubscription(response: BackendSubscriptionResponse): Subscription {
  // The entitlement is the backend's decision; the plan the UI selected is never proof of it.
  const tier = response.entitlement?.tier ?? "free";
  const sub = response.subscription;
  return {
    tier,
    isPaid: tier !== "free",
    status: sub?.status ?? null,
    periodEnd: sub?.current_period_end ?? null,
    trialEndsAt: sub?.trial_ends_at ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
  };
}
/** GET /api/v1/billing/plans (public): the real tier prices. Only the fields pricing needs are typed. */
export type BackendPlansResponse = {
  plans: Array<{
    tier: string;
    lanes: number;
    usd_cents: number;
    inr_paise: number;
    trial_days: number;
    ad_free: boolean;
  }>;
  trial_days: number;
  default_currency: string;
  providers_available: string[];
};
export async function getPlans(): Promise<BackendPlansResponse> {
  return apiGet<BackendPlansResponse>("/billing/plans");
}
export async function getSubscription(): Promise<Subscription> {
  return mapSubscription(await apiGet<BackendSubscriptionResponse>("/billing/subscription"));
}
