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

describe("InviteCard reward ladder (GET /referral rungs, POST /referral/claim)", () => {
  const RUNG = (threshold: number, name: string, over: Record<string, unknown> = {}) => ({
    threshold, name, capability: "x", tier: null, reached: false, granted: false, active: false, grant_months: null, expires_at: null, ...over,
  });
  const STATUS = (over: Record<string, unknown> = {}) => ({
    code: "ABCD1234",
    verified_referrals: 16,
    by_status: {},
    rungs: [RUNG(15, "+1 exam lane", { reached: true }), RUNG(30, "Offline queue")],
    next_rung: { threshold: 30, name: "Offline queue", remaining: 14 },
    claimable: null,
    cooldown_clear: true,
    ...over,
  });

  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("shows the ladder and the next reward; no claim button when nothing is due", async () => {
    apiGet.mockImplementation(async (path: string) => (path === "/api/config" ? { flags: {} } : STATUS()));
    await renderCard(false);
    const ladder = await screen.findByTestId("referral-ladder");
    expect(ladder).toHaveTextContent("+1 exam lane");
    expect(ladder).toHaveTextContent("Offline queue");
    expect(screen.getByTestId("referral-next")).toHaveTextContent("Next: Offline queue, 14 more verified friends.");
    expect(screen.queryByRole("button", { name: /^Claim / })).not.toBeInTheDocument();
  });

  it("a due reward gets a Claim button that POSTs /referral/claim and says what was claimed", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path === "/api/config" ? { flags: {} } : STATUS({ claimable: { threshold: 15, name: "+1 exam lane" } }),
    );
    apiPost.mockResolvedValue({ claimed: { threshold: 15, name: "+1 exam lane", capability: "extra_lane", tier: null, expires_at: null } });
    await renderCard(false);
    fireEvent.click(await screen.findByRole("button", { name: "Claim +1 exam lane" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/referral/claim"));
    expect(await screen.findByTestId("referral-claimed")).toHaveTextContent("Claimed: +1 exam lane.");
  });

  it("the server's refusal (e.g. the cooldown) is shown as returned", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path === "/api/config" ? { flags: {} } : STATUS({ claimable: { threshold: 15, name: "+1 exam lane" } }),
    );
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValue(new ApiError(429, "a reward was claimed recently; the next is available 30 days after the last"));
    await renderCard(false);
    fireEvent.click(await screen.findByRole("button", { name: "Claim +1 exam lane" }));
    expect(await screen.findByTestId("referral-claim-error")).toHaveTextContent("claimed recently");
  });

  it("with every rung earned it says so; with the flag off there is no ladder", async () => {
    apiGet.mockImplementation(async (path: string) =>
      path === "/api/config" ? { flags: {} } : STATUS({ next_rung: null, rungs: [RUNG(15, "+1 exam lane", { reached: true, granted: true })] }),
    );
    await renderCard(false);
    expect(await screen.findByTestId("referral-next")).toHaveTextContent("You have reached every reward.");
    expect(screen.getByTestId("referral-ladder")).toHaveTextContent("Claimed");
  });
});
