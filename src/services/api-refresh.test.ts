import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resetAppState = vi.fn(async () => {});
vi.mock("@/lib/platform", async (orig) => ({ ...(await orig<object>()), resetAppState }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function setup(opts: { refresh: (n: number) => Response | Promise<Response> }) {
  vi.resetModules();
  localStorage.clear();
  resetAppState.mockClear();
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({
    user: { id: "u1", name: "Ada", email: "a@x.com", role: "user" },
    token: "stale",
    refreshToken: "refresh-1",
    isAuthenticated: true,
  });
  let refreshCalls = 0;
  const seenTokens: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return opts.refresh(refreshCalls);
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? "";
      seenTokens.push(auth);
      return auth === "Bearer fresh" ? json(200, { ok: true }) : json(401, { detail: "invalid or expired access token" });
    }),
  );
  const { apiGet, NetworkError } = await import("@/services/api");
  return { apiGet, NetworkError, auth: useAuthStore, refreshCalls: () => refreshCalls, seenTokens };
}

describe("shared API client: token refresh", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("N parallel 401s share ONE /auth/refresh (the backend revokes the session on refresh-token reuse)", async () => {
    const { apiGet, auth, refreshCalls } = await setup({
      refresh: async () => json(200, { user: {}, token: "fresh", refreshToken: "refresh-2" }),
    });
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => apiGet<{ ok: boolean }>(`/dashboard/x${i}`)));
    expect(results.every((r) => r.ok)).toBe(true);
    expect(refreshCalls()).toBe(1);
    expect(auth.getState()).toMatchObject({ token: "fresh", refreshToken: "refresh-2", isAuthenticated: true });
    expect(resetAppState).not.toHaveBeenCalled();
  });

  it("a request whose token was already renewed by another request retries with it instead of refreshing again", async () => {
    const { apiGet, auth, refreshCalls } = await setup({ refresh: async () => json(200, { token: "fresh", refreshToken: "refresh-2" }) });
    const first = apiGet("/a");
    await first; // the session is renewed ("fresh" now stored)
    expect(refreshCalls()).toBe(1);
    // A request that started with the old token and only now gets its 401 must not trigger a second refresh.
    auth.setState({ token: "stale" });
    const late = apiGet("/b");
    auth.setState({ token: "fresh" }); // another request renewed it while /b was in flight
    await late;
    expect(refreshCalls()).toBe(1); // still only the first refresh
  });

  it("when the server rejects the refresh token the user is signed out and local data cleared", async () => {
    const { apiGet, auth, refreshCalls } = await setup({ refresh: async () => json(401, { detail: "invalid or expired refresh token" }) });
    await expect(apiGet("/dashboard/x")).rejects.toMatchObject({ status: 401, message: "Session expired" });
    expect(refreshCalls()).toBe(1);
    expect(auth.getState()).toMatchObject({ isAuthenticated: false, token: null, user: null });
    expect(resetAppState).toHaveBeenCalledTimes(1);
  });

  it("a refresh that cannot be attempted (offline) does NOT sign the user out or wipe local data", async () => {
    const { apiGet, auth, NetworkError } = await setup({
      refresh: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(apiGet("/dashboard/x")).rejects.toBeInstanceOf(NetworkError);
    expect(auth.getState()).toMatchObject({ isAuthenticated: true, refreshToken: "refresh-1" });
    expect(resetAppState).not.toHaveBeenCalled();
  });

  it("a 5xx from /auth/refresh is treated as unavailable, not as a revoked session", async () => {
    const { apiGet, auth, NetworkError } = await setup({ refresh: async () => json(503, { detail: "down" }) });
    await expect(apiGet("/dashboard/x")).rejects.toBeInstanceOf(NetworkError);
    expect(auth.getState().isAuthenticated).toBe(true);
    expect(resetAppState).not.toHaveBeenCalled();
  });

  it("a freshly issued token that is still refused ends the session (no refresh loop)", async () => {
    const { apiGet, auth, refreshCalls } = await setup({ refresh: async () => json(200, { token: "also-bad", refreshToken: "r2" }) });
    await expect(apiGet("/dashboard/x")).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls()).toBe(1);
    expect(auth.getState().isAuthenticated).toBe(false);
  });
});
