import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("logout revokes the refresh token on the backend", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("clears local state synchronously and POSTs the refresh token to /auth/logout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { useAuthStore } = await import("./auth-store");
    useAuthStore.setState({ token: "t", refreshToken: "r1", isAuthenticated: true });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({ token: null, refreshToken: null, isAuthenticated: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/logout$/);
    expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" });
  });

  it("still signs out locally when the revocation request fails or there is no refresh token", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const { useAuthStore } = await import("./auth-store");

    useAuthStore.setState({ token: "t", refreshToken: "r2", isAuthenticated: true });
    expect(() => useAuthStore.getState().logout()).not.toThrow();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    fetchMock.mockClear();
    useAuthStore.setState({ token: "t", refreshToken: null, isAuthenticated: true });
    useAuthStore.getState().logout();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
