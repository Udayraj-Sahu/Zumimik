import { PLANS } from "@/lib/types/onboarding";
import { formatINR } from "@/lib/text";

export type PricedPlan = (typeof PLANS)[number];

/** The fields of GET /api/v1/billing/plans -> plans[] that pricing needs. */
export type BackendPlan = { tier: string; lanes: number; inr_paise: number; trial_days: number };

export type PricingState = {
  plans: PricedPlan[];
  /** The backend bills monthly only (there is no annual price), so the annual option exists only for bundled/mock pricing. */
  annualAvailable: boolean;
  source: "static" | "backend" | "unavailable";
};

/** Bundled marketing prices. Used only in explicit mock mode. */
export const STATIC_PRICING: PricingState = { plans: PLANS, annualAvailable: true, source: "static" };

const paid = (plan: PricedPlan) => plan.id !== "initiate";

/**
 * Overlay the backend's real monthly prices on the UI plans. A UI plan matches the backend plan with the same number of lanes
 * (pro = 1, bundle_2 = 2, bundle_3 = 3). A paid plan with no backend match, or any unsupported annual price, is NaN, which
 * renders as an em dash: a wrong price is never shown.
 */
export function applyBackendPricing(backend: BackendPlan[]): PricingState {
  const plans = PLANS.map((plan): PricedPlan => {
    if (!paid(plan)) return plan;
    const match = backend.find((b) => b.tier !== "free" && b.lanes === plan.lanes);
    if (!match) return unpriced(plan);
    const monthly = match.inr_paise / 100;
    return {
      ...plan,
      price: formatINR(monthly),
      cadence: "/month",
      billing: { annual: Number.NaN, monthly },
      trialDays: match.trial_days,
    };
  });
  return { plans, annualAvailable: false, source: "backend" };
}

function unpriced(plan: PricedPlan): PricedPlan {
  return { ...plan, price: "—", billing: { annual: Number.NaN, monthly: Number.NaN } };
}

/** Real mode while the prices are loading or could not be loaded: paid prices are unknown, never the bundled ones. */
export function unavailablePricing(): PricingState {
  return { plans: PLANS.map((p) => (paid(p) ? unpriced(p) : p)), annualAvailable: false, source: "unavailable" };
}

/** The billing cycle that can actually be charged. */
export function effectiveCycle(requested: "annual" | "monthly", state: Pick<PricingState, "annualAvailable">): "annual" | "monthly" {
  return state.annualAvailable ? requested : "monthly";
}
