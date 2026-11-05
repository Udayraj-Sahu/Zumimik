import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));

async function renderCard(mock: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", mock ? "true" : "false");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "a@x.com", role: "user" }, isAuthenticated: true });
  const { InviteCard } = await import("./invite-card");
  const { useReferralStore } = await import("@/stores/referral-store");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InviteCard />
    </QueryClientProvider>,
  );
  return { referral: useReferralStore };
}

describe("InviteCard uses the server's referral code", () => {
  beforeEach(() => {
    apiGet.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("real mode: shows the code from GET /referral and the verified count; never generates one locally", async () => {
    apiGet.mockResolvedValue({ code: "ABCD1234", verified_referrals: 3, by_status: {}, next_rung: null, claimable: null });
    const { referral } = await renderCard(false);
    await waitFor(() => expect(screen.getAllByText("ABCD1234").length).toBeGreaterThan(0));
    expect(apiGet).toHaveBeenCalledWith("/referral");
    expect(screen.getByText("Joined").parentElement).toHaveTextContent("3");
    expect(referral.getState().code).toBeNull(); // no locally invented code
  });

  it("real mode while loading or when the feature is off: a placeholder, not an invented code", async () => {
    apiGet.mockRejectedValue(new Error("feature disabled"));
    const { referral } = await renderCard(false);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(screen.getAllByText("——————").length).toBeGreaterThan(0);
    expect(referral.getState().code).toBeNull();
  });

  it("explicit mock mode keeps the development code and makes no request", async () => {
    const { referral } = await renderCard(true);
    await waitFor(() => expect(referral.getState().code).toBeTruthy());
    expect(apiGet).not.toHaveBeenCalled();
  });
});

describe("InviteCard respects the referral feature flag", () => {
  beforeEach(() => {
    apiGet.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("flag off: says so, shows 'Not enabled' instead of 'Active', and never requests /referral", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/api/config") return { flags: { referral_ladder: { enabled: false, rollout_pct: 100 } } };
      throw new Error("must not be called: " + path);
    });
    await renderCard(false);
    expect(await screen.findByTestId("referral-off")).toHaveTextContent("Referrals aren't enabled");
    expect(screen.getByText("Not enabled")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalledWith("/referral");
  });

  it("flag on: shows the server code and 'Active'", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/api/config") return { flags: { referral_ladder: { enabled: true, rollout_pct: 100 } } };
      if (path === "/referral") return { code: "ZXCV9876", verified_referrals: 0 };
      throw new Error("unexpected " + path);
    });
    await renderCard(false);
    await waitFor(() => expect(screen.getAllByText("ZXCV9876").length).toBeGreaterThan(0));
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByTestId("referral-off")).not.toBeInTheDocument();
  });

  it("flag list unreadable: nothing is hidden (unknown is treated as available)", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/api/config") throw new Error("config down");
      return { code: "QWER5555", verified_referrals: 1 };
    });
    await renderCard(false);
    await waitFor(() => expect(screen.getAllByText("QWER5555").length).toBeGreaterThan(0));
    expect(screen.queryByTestId("referral-off")).not.toBeInTheDocument();
  });
});

describe("InviteCard friend QR (POST /social/friends/qr/generate)", () => {
  const SIG = "a".repeat(64);
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  function routeGet(flags: Record<string, unknown> = {}) {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/api/config") return { flags };
      if (path === "/referral") return { code: "ABCD1234", verified_referrals: 0 };
      throw new Error("unexpected " + path);
    });
  }
  async function openFriendTab() {
    await renderCard(false);
    fireEvent.click(await screen.findByRole("button", { name: "Show invite QR code" }));
    fireEvent.click(await screen.findByRole("tab", { name: "Add friend" }));
  }

  it("requests a code only when the Add friend tab is opened, and shows its expiry", async () => {
    routeGet();
    apiPost.mockResolvedValue({ code: "friendcode123456", sig: SIG, expiresIn: 300 });
    await renderCard(false);
    fireEvent.click(await screen.findByRole("button", { name: "Show invite QR code" }));
    expect(apiPost).not.toHaveBeenCalled(); // the invite-link tab does not touch the friend route
    fireEvent.click(await screen.findByRole("tab", { name: "Add friend" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/friends/qr/generate"));
    expect(await screen.findByText(/Expires in 5:00|Expires in 4:5/)).toBeInTheDocument();
  });

  it("flag off: explains it and never calls the route", async () => {
    routeGet({ social_friends: { enabled: false, rollout_pct: 100 } });
    await openFriendTab();
    expect(await screen.findByText(/Adding friends isn't enabled/)).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("shows the server's refusal (e.g. a child account) and offers to retry", async () => {
    routeGet();
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValue(new ApiError(403, "QR pairing is not available for this account"));
    await openFriendTab();
    expect(await screen.findByRole("alert")).toHaveTextContent(/not available for this account/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
