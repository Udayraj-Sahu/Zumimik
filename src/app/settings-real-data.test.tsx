import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const summary = vi.fn();
const subscription = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings",
}));
vi.mock("@/hooks/queries/use-account-summary", () => ({ useAccountSummary: () => summary() }));
vi.mock("@/hooks/queries/use-subscription", () => ({ useSubscription: () => subscription() }));

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Settings shows backend data, not fabricated account data", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    summary.mockReset();
    subscription.mockReset();
    vi.doMock("@/lib/platform", async (orig) => ({ ...(await orig<object>()), IS_MOCK: false }));
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({
      user: { id: "u1", name: "Ada Lovelace", email: "a@x.com", role: "user", tier: "pro" },
      isAuthenticated: true,
    });
  });

  it("renders the API numbers, the account tier badge and the entitled plan", async () => {
    summary.mockReturnValue({ data: { streakDays: 5, xp: 900, questions: 140, rank: 3, accuracy: 80, speed: 10, percentile: 60 } });
    subscription.mockReturnValue({
      data: { tier: "pro", isPaid: true, status: "active", periodEnd: "2026-12-01T00:00:00", trialEndsAt: null, cancelAtPeriodEnd: false },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    const { default: SettingsPage } = await import("@/app/(app)/settings/page");
    const view = wrap(<SettingsPage />);
    const text = view.container.textContent ?? "";

    expect(text).toContain("5-Day");
    expect(text).toContain("#3");
    expect(text).toContain("900");
    expect(text).toContain("140");
    expect(text).toContain("PRO"); // badge from the account tier
    expect(within(screen.getByTestId("subscription-plan")).getByText("Pro")).toBeInTheDocument();
    // None of the previous hard-coded values or claims:
    for (const fake of ["12-Day", "2,340", "CHAMPION", "$9.99", "5 sprints per day", "Advanced analytics"]) {
      expect(text).not.toContain(fake);
    }
  });

  it("an empty/unloaded account shows '--', and a failed subscription shows an error, not 'Free Plan'", async () => {
    summary.mockReturnValue({ data: undefined });
    subscription.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
    const { default: SettingsPage } = await import("@/app/(app)/settings/page");
    const view = wrap(<SettingsPage />);
    const text = view.container.textContent ?? "";

    expect(text).toContain("--");
    expect(text).not.toContain("12-Day");
    expect(text).not.toContain("2,340");
    expect(screen.getByTestId("subscription-plan")).toHaveTextContent("Couldn't load your plan");
    expect(text).not.toContain("Free Plan");
  });
});
