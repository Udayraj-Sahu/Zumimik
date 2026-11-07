import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const apiGet = vi.fn();
vi.mock("@/services/api", () => ({ apiGet: (...a: unknown[]) => apiGet(...a), apiPost: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function route(map: Record<string, unknown>) {
  apiGet.mockImplementation(async (path: string) => {
    const hit = Object.entries(map).find(([prefix]) => path.startsWith(prefix));
    if (!hit) throw new Error(`unexpected ${path}`);
    if (hit[1] instanceof Error) throw hit[1];
    return hit[1];
  });
}

describe("real mode data (mock flag off)", () => {
  beforeEach(() => {
    vi.resetModules();
    apiGet.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.doUnmock("@/lib/platform"));

  describe("account summary (Settings overview, Your Stats, adaptive stats)", () => {
    async function summary(map: Record<string, unknown>) {
      const { useAuthStore } = await import("@/stores/auth-store");
      useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "a@x.com", role: "user" }, isAuthenticated: true });
      route(map);
      const { useAccountSummary } = await import("@/hooks/queries/use-account-summary");
      return renderHook(() => useAccountSummary(), { wrapper });
    }

    it("maps the actual API responses", async () => {
      const { result } = await summary({
        "/dashboard/streak": { current: 5, xp: 900, days: [], labels: [] },
        "/dashboard/stats": { accuracy: 82, questions: 140, percentile: 71, speed: 12 },
        "/dashboard/leaderboard": [{ rank: 3, name: "You", xp: 900, me: true }],
      });
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.data).toEqual({
        streakDays: 5, xp: 900, questions: 140, rank: 3, accuracy: 82, speed: 12, percentile: 71,
      });
    });

    it("an empty account has no accuracy/speed/percentile measurements (null, not 0 or invented)", async () => {
      const { result } = await summary({
        "/dashboard/streak": { current: 0, xp: 0, days: [], labels: [] },
        "/dashboard/stats": { accuracy: 0, questions: 0, percentile: 0, speed: 0 },
        "/dashboard/leaderboard": [],
      });
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.data).toMatchObject({ questions: 0, accuracy: null, speed: null, percentile: null, rank: null, streakDays: 0 });
    });

    it("a failed request yields null for its fields; all failing is an error, never fabricated numbers", async () => {
      const { result } = await summary({
        "/dashboard/streak": new Error("down"),
        "/dashboard/stats": { accuracy: 50, questions: 10, percentile: 40, speed: 20 },
        "/dashboard/leaderboard": new Error("down"),
      });
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.data).toMatchObject({ streakDays: null, xp: null, rank: null, questions: 10 });

      const failing = await summary({
        "/dashboard/streak": new Error("down"),
        "/dashboard/stats": new Error("down"),
        "/dashboard/leaderboard": new Error("down"),
      });
      await waitFor(() => expect(failing.result.current.isError).toBe(true));
      expect(failing.result.current.data).toBeUndefined();
    });
  });

  describe("subscription and entitlement come from the backend", () => {
    it("reads /billing/subscription and uses the entitlement tier, not the subscription row's or the UI's", async () => {
      const { getSubscription, mapSubscription } = await import("@/services/billing");
      route({
        "/billing/subscription": {
          tier: "pro",
          subscription: { status: "past_due", tier: "pro", effective_tier: "free", current_period_end: "2026-12-01T00:00:00", trial_ends_at: null, cancel_at_period_end: true },
          entitlement: { tier: "free", expires_at: 1, grace_days: 3, signature: "x" },
        },
      });
      const sub = await getSubscription();
      expect(apiGet).toHaveBeenCalledWith("/billing/subscription");
      expect(sub).toMatchObject({ tier: "free", isPaid: false, status: "past_due", cancelAtPeriodEnd: true });
      expect(mapSubscription({ tier: "pro", subscription: null, entitlement: { tier: "pro", expires_at: 1, grace_days: 3, signature: "x" } }).isPaid).toBe(true);
    });

    it("plan gate: a UI upgrade cannot grant pro; only the entitlement can", async () => {
      const { usePlanStore } = await import("@/stores/plan-store");
      usePlanStore.getState().setPro();
      expect(usePlanStore.getState().plan).toBe("free");
      expect(usePlanStore.getState().canTakeMock()).toBe(true); // within the free limit
      usePlanStore.getState().setPlanFromEntitlement("pro");
      expect(usePlanStore.getState().plan).toBe("pro");
      usePlanStore.getState().setPlanFromEntitlement("free");
      expect(usePlanStore.getState().plan).toBe("free");
    });

    it("a 'pro' left in storage by the old local-only upgrade is reset on load", async () => {
      localStorage.setItem("zuzumik-plan", JSON.stringify({ state: { plan: "pro", mocksTaken: 1 }, version: 0 }));
      const { usePlanStore } = await import("@/stores/plan-store");
      expect(usePlanStore.getState().plan).toBe("free");
    });
  });

});
