import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
vi.mock("@/services/api", () => ({ apiGet: (...a: unknown[]) => apiGet(...a), apiPost: vi.fn() }));

const SERVER_USER = { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "user", tier: "pro" };

function loginFetch(user: object = SERVER_USER) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify({ user, token: "access", refreshToken: "refresh" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

function meAndStreak(me: unknown, streak: unknown = { current: 4, xp: 1200 }) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/auth/me") {
      if (me instanceof Error) throw me;
      return me;
    }
    if (path === "/dashboard/streak") {
      if (streak instanceof Error) throw streak;
      return streak;
    }
    throw new Error(`unexpected ${path}`);
  });
}

describe("profile survives login, refresh, restoration and partial updates", () => {
  beforeEach(() => {
    vi.resetModules();
    apiGet.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("login stores the full backend user (including tier) and the profile renders it from /auth/me", async () => {
    vi.stubGlobal("fetch", loginFetch());
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "pw");
    expect(useAuthStore.getState().user).toEqual(SERVER_USER);

    meAndStreak({ user: SERVER_USER });
    const { getProfile } = await import("@/services/profile");
    expect(await getProfile()).toMatchObject({
      name: "Ada Lovelace",
      initials: "AL",
      badge: "pro",
      level: "Level 3",
      streak: "4 days",
    });
  });

  it("/auth/me refresh fills gaps but never erases or reverts stored profile fields", async () => {
    vi.stubGlobal("fetch", loginFetch({ id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "user" }));
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "pw");
    // Local edit: the backend has no profile-update route.
    useAuthStore.getState().updateUser({ name: "Ada L.", phone: "+911234567890" });

    meAndStreak({ user: SERVER_USER });
    const { getProfile } = await import("@/services/profile");
    const profile = await getProfile();

    expect(useAuthStore.getState().user).toMatchObject({
      name: "Ada L.",
      phone: "+911234567890",
      tier: "pro",
      email: "ada@example.com",
    });
    expect(profile.name).toBe("Ada L.");
    expect(profile.badge).toBe("pro");
  });

  it("re-login as the same account keeps a locally stored phone the backend does not return", async () => {
    vi.stubGlobal("fetch", loginFetch());
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "pw");
    useAuthStore.getState().updateUser({ phone: "+911234567890" });
    await useAuthStore.getState().login("ada@example.com", "pw");
    expect(useAuthStore.getState().user).toMatchObject({ ...SERVER_USER, phone: "+911234567890" });
  });

  it("a different account replaces the stored user entirely (no leakage)", async () => {
    vi.stubGlobal("fetch", loginFetch());
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "pw");
    useAuthStore.getState().updateUser({ phone: "+911234567890" });
    vi.stubGlobal("fetch", loginFetch({ id: "u2", name: "Bob", email: "bob@example.com", role: "user" }));
    await useAuthStore.getState().login("bob@example.com", "pw");
    const user = useAuthStore.getState().user;
    expect(user).toMatchObject({ id: "u2", name: "Bob" });
    expect(user).not.toHaveProperty("phone");
    expect(user).not.toHaveProperty("tier");
  });

  it("page refresh: the persisted session restores the user and the profile still renders", async () => {
    vi.stubGlobal("fetch", loginFetch());
    const first = await import("./auth-store");
    await first.useAuthStore.getState().login("ada@example.com", "pw");
    expect(JSON.parse(localStorage.getItem("zuzumik-auth") ?? "{}").state.user).toMatchObject({
      name: "Ada Lovelace",
    });

    vi.resetModules(); // simulate a reload: fresh module graph, same localStorage
    const { useAuthStore } = await import("./auth-store");
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, token: "access", refreshToken: "refresh" });
    expect(useAuthStore.getState().user).toEqual(SERVER_USER);

    meAndStreak({ user: SERVER_USER });
    const { getProfile } = await import("@/services/profile");
    expect((await getProfile()).name).toBe("Ada Lovelace");
  });

  it("missing optional fields: null name uses the email name, absent tier is free, a failed streak does not blank the header", async () => {
    vi.stubGlobal("fetch", loginFetch({ id: "u3", name: null, email: "grace.hopper@example.com", role: "user" }));
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("grace.hopper@example.com", "pw");

    meAndStreak(
      { user: { id: "u3", name: null, email: "grace.hopper@example.com", role: "user" } },
      new Error("streak down"),
    );
    const { getProfile } = await import("@/services/profile");
    expect(await getProfile()).toMatchObject({
      name: "grace.hopper",
      badge: "free",
      streak: "0 days",
      level: "Level 1",
    });
  });

  it("offline: a failed /auth/me still renders the stored user; with no stored user the real error surfaces", async () => {
    vi.stubGlobal("fetch", loginFetch());
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "pw");
    meAndStreak(new Error("Network request failed"), new Error("Network request failed"));
    const { getProfile } = await import("@/services/profile");
    expect((await getProfile()).name).toBe("Ada Lovelace");

    useAuthStore.getState().logout();
    await expect(getProfile()).rejects.toThrow("Network request failed");
  });

  it("partial updates keep every other field", async () => {
    vi.stubGlobal("fetch", loginFetch());
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "pw");
    useAuthStore.getState().updateUser({ phone: "+911234567890" });
    // A payload without tier/phone must not erase them.
    useAuthStore.getState().setUser({ id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "user" });
    expect(useAuthStore.getState().user).toMatchObject({ ...SERVER_USER, phone: "+911234567890" });
  });

  it("logout clears the user, and a late /auth/me response cannot re-authenticate", async () => {
    vi.stubGlobal("fetch", loginFetch());
    const { useAuthStore } = await import("./auth-store");
    await useAuthStore.getState().login("ada@example.com", "pw");
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({ user: null, token: null, isAuthenticated: false });

    useAuthStore.getState().syncServerUser(SERVER_USER);
    expect(useAuthStore.getState()).toMatchObject({ user: null, isAuthenticated: false });
    expect(JSON.parse(localStorage.getItem("zuzumik-auth") ?? "{}").state.user).toBeNull();
  });
});
