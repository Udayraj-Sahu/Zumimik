import { afterEach, describe, expect, it, vi } from "vitest";

describe("backend authentication", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    localStorage.clear();
  });

  it("persists the refresh token returned by email login", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: "u1", name: "Ada", email: "ada@example.com", role: "user", tier: "free" },
            token: "access-token",
            refreshToken: "refresh-token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "password");

    expect(useAuthStore.getState().token).toBe("access-token");
    expect(useAuthStore.getState().refreshToken).toBe("refresh-token");
  });

  it("surfaces backend validation details without echoing submitted values", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: [{
              loc: ["body", "email"],
              msg: "value is not a valid email address",
              input: "not-an-email",
              type: "value_error",
            }],
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const { useAuthStore } = await import("./auth-store");
    await expect(useAuthStore.getState().login("not-an-email", "private-password"))
      .rejects.toThrow("email: value is not a valid email address");
  });

  it("registers email accounts and stores both backend tokens", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: "u2", name: "Ada", email: "ada@example.com", role: "user", tier: "free" },
          token: "registered-access-token",
          refreshToken: "registered-refresh-token",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().register("ada@example.com", "long-password", "Ada");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com", password: "long-password", display_name: "Ada" }),
      }),
    );
    expect(useAuthStore.getState().token).toBe("registered-access-token");
    expect(useAuthStore.getState().refreshToken).toBe("registered-refresh-token");
  });

  it("never sends a mock provider placeholder to the backend in live mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    vi.resetModules();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { useAuthStore } = await import("./auth-store");
    await expect(useAuthStore.getState().loginMockUser({ name: "Google User" }))
      .rejects.toThrow("Mock sign-in is disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
