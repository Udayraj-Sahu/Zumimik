import { describe, expect, it } from "vitest";
import { applyBackendPricing, effectiveCycle, unavailablePricing, STATIC_PRICING } from "./pricing";
import { formatINR } from "./text";

// Real values returned by GET /api/v1/billing/plans on staging.
const BACKEND = [
  { tier: "free", lanes: 1, inr_paise: 0, trial_days: 0 },
  { tier: "pro", lanes: 1, inr_paise: 50400, trial_days: 7 },
  { tier: "bundle_2", lanes: 2, inr_paise: 80640, trial_days: 7 },
  { tier: "bundle_3", lanes: 3, inr_paise: 105840, trial_days: 7 },
];

describe("pricing from GET /billing/plans", () => {
  it("prices each UI plan from the backend plan with the same number of lanes", () => {
    const { plans } = applyBackendPricing(BACKEND);
    const single = plans.find((p) => p.id === "single-lane")!;
    const dual = plans.find((p) => p.id === "dual-lane")!;
    expect(single.billing.monthly).toBe(504);
    expect(single.price).toBe("₹504");
    expect(dual.billing.monthly).toBeCloseTo(806.4);
    expect(dual.price).toBe("₹806.40");
  });

  it("uses the backend trial length, not the bundled 7/14-day labels", () => {
    const { plans } = applyBackendPricing(BACKEND);
    expect(plans.find((p) => p.id === "single-lane")!.trialDays).toBe(7);
    expect(plans.find((p) => p.id === "dual-lane")!.trialDays).toBe(7);
  });

  it("the free plan is untouched and no bundled paid price survives", () => {
    const { plans } = applyBackendPricing(BACKEND);
    expect(plans.find((p) => p.id === "initiate")).toEqual(STATIC_PRICING.plans.find((p) => p.id === "initiate"));
    expect(JSON.stringify(plans)).not.toMatch(/399|649|3990|6490/);
  });

  it("there is no annual price on the backend: annual is unavailable and billing is forced to monthly", () => {
    const state = applyBackendPricing(BACKEND);
    expect(state.annualAvailable).toBe(false);
    expect(Number.isNaN(state.plans.find((p) => p.id === "single-lane")!.billing.annual)).toBe(true);
    expect(effectiveCycle("annual", state)).toBe("monthly");
    expect(effectiveCycle("annual", STATIC_PRICING)).toBe("annual"); // bundled/mock pricing keeps its toggle
  });

  it("a paid plan with no backend match shows no price (never a guess)", () => {
    const { plans } = applyBackendPricing(BACKEND.filter((b) => b.lanes !== 2));
    const dual = plans.find((p) => p.id === "dual-lane")!;
    expect(dual.price).toBe("—");
    expect(Number.isNaN(dual.billing.monthly)).toBe(true);
  });

  it("while loading or after a failure paid prices are unknown, not the bundled ones", () => {
    const state = unavailablePricing();
    expect(state.source).toBe("unavailable");
    for (const id of ["single-lane", "dual-lane"]) {
      const plan = state.plans.find((p) => p.id === id)!;
      expect(plan.price).toBe("—");
      expect(formatINR(plan.billing.monthly)).toBe("—");
    }
    expect(JSON.stringify(state.plans)).not.toMatch(/399|649/);
  });
});

describe("formatINR", () => {
  it("keeps whole rupees, shows paise when fractional, and never turns an unknown amount into ₹0", () => {
    expect(formatINR(504)).toBe("₹504");
    expect(formatINR(806.4)).toBe("₹806.40");
    expect(formatINR(1058.4)).toBe("₹1,058.40");
    expect(formatINR(1234567)).toBe("₹12,34,567");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(Number.NaN)).toBe("—");
  });
});
