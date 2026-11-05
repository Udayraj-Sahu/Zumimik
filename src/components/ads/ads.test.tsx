import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
const push = vi.fn();

class FakeApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
  ApiError: FakeApiError,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

const unit = (id: string, route: string) => ({ unit_id: id, title: `Title ${id}`, body: `Body ${id}`, cta_label: `Go ${id}`, cta_route: route });
const SHOW = (seconds: number, u = unit("house_referral", "/dashboard/referral"), placement = "dashboard_banner") => ({
  show: true,
  placement,
  duration_seconds: seconds,
  unit: u,
  token: "tok-1",
  token_expires_at: "2026-11-08T00:00:00Z",
});

function route(decision: unknown, flags: Record<string, unknown> = { ad_engine: { enabled: true, rollout_pct: 100 } }) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/api/config") return { flags };
    if (path.startsWith("/ads/decision")) {
      if (decision instanceof Error) throw decision;
      return decision;
    }
    throw new Error("unexpected GET " + path);
  });
  apiPost.mockResolvedValue({ accepted: 1, duplicates: 0, rejected: [] });
}

async function mount(which: "banner" | "interstitial") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "a@x.com", role: "user" }, isAuthenticated: true });
  const { AdBanner } = await import("@/components/ads/ad-banner");
  const { AdInterstitial } = await import("@/components/ads/ad-interstitial");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {which === "banner" ? <AdBanner placement="dashboard_banner" /> : <AdInterstitial />}
    </QueryClientProvider>,
  );
}

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(50); });

describe("AdBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiGet.mockReset();
    apiPost.mockReset();
    push.mockReset();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("shows nothing and requests nothing while the ad_engine flag is off", async () => {
    route(SHOW(5), { ad_engine: { enabled: false, rollout_pct: 100 } });
    await mount("banner");
    await settle();
    expect(screen.queryByTestId("ad-banner")).not.toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalledWith(expect.stringContaining("/ads/decision"));
  });

  it("shows nothing when the server answers 404 (kill switch) or says not to show", async () => {
    route(new FakeApiError(404, "not found"));
    await mount("banner");
    await settle();
    expect(screen.queryByTestId("ad-banner")).not.toBeInTheDocument();
  });

  it("shows nothing for a refusal such as the cooldown", async () => {
    route({ show: false, reason: "cooldown: 10 minutes between ads", retry_after_seconds: 601 });
    await mount("banner");
    await settle();
    expect(screen.queryByTestId("ad-banner")).not.toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("shows the unit, and counts the impression only after the full duration on screen", async () => {
    route(SHOW(5));
    await mount("banner");
    expect(await screen.findByTestId("ad-banner")).toHaveTextContent("Title house_referral");
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(apiPost).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(apiPost).toHaveBeenCalledTimes(1);
    const [path, body] = apiPost.mock.calls[0] as [string, { impressions: Array<Record<string, unknown>> }];
    expect(path).toBe("/ads/impressions");
    expect(body.impressions[0]).toMatchObject({ token: "tok-1", unit_id: "house_referral", placement: "dashboard_banner", screen: "dashboard", duration_ms: 5000 });
  });

  it("dismissing before the duration is up records nothing", async () => {
    route(SHOW(5));
    await mount("banner");
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("ad-banner")).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("the button follows the app's own routes: referral -> dashboard, billing -> the paywall, unknown -> no button", async () => {
    route(SHOW(5, unit("house_referral", "/dashboard/referral")));
    await mount("banner");
    fireEvent.click(await screen.findByRole("button", { name: "Go house_referral" }));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("billing opens the plans paywall instead of navigating", async () => {
    route(SHOW(5, unit("house_pro_upgrade", "/dashboard/billing")));
    await mount("banner");
    fireEvent.click(await screen.findByRole("button", { name: "Go house_pro_upgrade" }));
    const { usePaywallStore } = await import("@/stores/paywall-store");
    expect(usePaywallStore.getState().open).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("an ad whose route the app does not have is shown without a button", async () => {
    route(SHOW(5, unit("house_x", "/nowhere")));
    await mount("banner");
    expect(await screen.findByTestId("ad-banner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go house_x" })).not.toBeInTheDocument();
  });
});

describe("AdInterstitial", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiGet.mockReset();
    apiPost.mockReset();
    push.mockReset();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("cannot be closed until the server's duration has passed; the impression is counted then", async () => {
    route(SHOW(5, unit("house_daily_challenge", "/dashboard"), "post_session_interstitial"));
    await mount("interstitial");
    const close = await screen.findByTestId("ad-interstitial-close");
    expect(close).toBeDisabled();
    expect(close).toHaveTextContent(/Continue in/);
    expect(apiPost).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(5500); });
    expect(screen.getByTestId("ad-interstitial-close")).toBeEnabled();
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect((apiPost.mock.calls[0][1] as { impressions: Array<Record<string, unknown>> }).impressions[0]).toMatchObject({
      placement: "post_session_interstitial",
      screen: "post_session",
      duration_ms: 5000,
    });
    fireEvent.click(screen.getByTestId("ad-interstitial-close"));
    expect(screen.queryByTestId("ad-interstitial")).not.toBeInTheDocument();
  });

  it("uses the longer duration the server asks for after a long practice stretch", async () => {
    route(SHOW(30, unit("house_daily_challenge", "/dashboard"), "post_session_interstitial"));
    await mount("interstitial");
    expect(await screen.findByTestId("ad-interstitial-close")).toHaveTextContent("Continue in 30s");
  });

  it("shows nothing when the server says not to (child, paid tier, ads off)", async () => {
    route({ show: false, reason: "kids mode: ads are disabled for children", retry_after_seconds: null });
    await mount("interstitial");
    await settle();
    expect(screen.queryByTestId("ad-interstitial")).not.toBeInTheDocument();
  });
});
