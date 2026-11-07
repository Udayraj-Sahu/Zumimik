import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a) }));

const PLANS_RESPONSE = {
  default_currency: "INR", trial_days: 7, providers_available: [],
  plans: [
    { tier: "free", lanes: 1, usd_cents: 0, inr_paise: 0, trial_days: 0, ad_free: false },
    { tier: "pro", lanes: 1, usd_cents: 600, inr_paise: 50400, trial_days: 7, ad_free: true },
    { tier: "bundle_2", lanes: 2, usd_cents: 960, inr_paise: 80640, trial_days: 7, ad_free: true },
    { tier: "bundle_3", lanes: 3, usd_cents: 1260, inr_paise: 105840, trial_days: 7, ad_free: true },
  ],
};

async function renderTiers(mock: boolean) {
  vi.resetModules();
  const { ClearanceTiers } = await import("./clearance-tiers");
  const view = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ClearanceTiers value="single-lane" onChange={() => {}} />
    </QueryClientProvider>,
  );
  return view;
}

describe("paywall plan prices", () => {
  beforeEach(() => {
    apiGet.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("real mode: shows the backend prices, monthly only, and none of the bundled prices", async () => {
    apiGet.mockResolvedValue(PLANS_RESPONSE);
    const view = await renderTiers(false);
    await waitFor(() => expect(view.container.textContent).toContain("₹504"));
    expect(view.container.textContent).toContain("₹806.40");
    expect(view.container.textContent).not.toMatch(/₹399|₹649|₹3,990|₹6,490/);
    expect(view.container.textContent).toContain("/mo");
    expect(view.container.textContent).not.toContain("/yr");
    // there is no annual price on the backend, so there is no billing-cycle choice
    expect(screen.queryByRole("group", { name: "Billing cycle" })).not.toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith("/billing/plans");
  });

  it("real mode while the prices load, or if they fail: an em dash, never the bundled price", async () => {
    apiGet.mockRejectedValue(new Error("down"));
    const view = await renderTiers(false);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 150));
    expect(view.container.textContent).not.toMatch(/₹399|₹649/);
    expect(view.container.textContent).toContain("—");
  });
});
