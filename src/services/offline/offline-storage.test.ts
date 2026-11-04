import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubLoginFetch } from "@/lib/test-support/stub-login-fetch";
import Dexie from "dexie";

import { db } from "./db";
import { cacheQueryData, getCachedQueryData, clearExpiredCache } from "./sync";
import { resetAppState } from "@/lib/platform";
import { safeLocalStorage } from "@/lib/platform";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useNetworkStore } from "@/stores/network-store";
import { queryClient } from "@/providers/query-provider";
import type { ContentFeedbackRequest } from "@/lib/types/content-feedback";

const DAY = 86_400_000;
const HOUR = 3_600_000;

const SETTINGS_KEY = "zuzumik-settings";
const AUTH_KEY = "zuzumik-auth";

const FEEDBACK: ContentFeedbackRequest = {
  questionId: "q1",
  feedbackType: "thumbs_down",
  comment: "offline test",
};

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function resetSettingsToDefaults(): void {
  useSettingsStore.setState({ soundEnabled: true, hapticEnabled: true });
  useNetworkStore.getState().clearQueue();
  useNetworkStore.getState().setOnline(true);
}

async function bootCleanAppState(): Promise<void> {
  queryClient.clear();
  resetSettingsToDefaults();
  localStorage.clear();
  sessionStorage.clear();
  await db.dashboardCache.clear();
  await db.feedbackQueue.clear();
}

beforeEach(async () => {
  vi.restoreAllMocks();
  stubLoginFetch();
  await bootCleanAppState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("offline storage edge cases", () => {
  it("1. first installation: fresh DB + storage expose empty defaults", async () => {
    expect(localStorage.length).toBe(0);
    expect(await db.dashboardCache.count()).toBe(0);
    expect(await db.feedbackQueue.count()).toBe(0);

    const auth = useAuthStore.getState();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.token).toBeNull();

    const settings = useSettingsStore.getState();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.hapticEnabled).toBe(true);

    await expect(resetAppState()).resolves.toBeUndefined();
  });

  it("2. existing data: persisted state and DB rows are readable after load", async () => {
    await bootCleanAppState();

    useSettingsStore.setState({ soundEnabled: false, hapticEnabled: true });
    await tick();
    const persisted = localStorage.getItem(SETTINGS_KEY);
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted!).state?.soundEnabled).toBe(false);

    useSettingsStore.persist.rehydrate();
    await tick();
    expect(useSettingsStore.getState().soundEnabled).toBe(false);

    await cacheQueryData("dashboard:stats", { total: 42 }, "trusted");
    expect(await getCachedQueryData("dashboard:stats")).toEqual({ total: 42 });

    await db.feedbackQueue.put({
      id: "fb-1",
      payload: FEEDBACK,
      createdAt: 111,
      retryCount: 0,
    });
    const queued = await db.feedbackQueue.get("fb-1");
    expect(queued?.payload.questionId).toBe("q1");
    expect(queued?.retryCount).toBe(0);
  });

  it("3. corrupted data: malformed persisted JSON and incomplete DB rows are tolerated", async () => {
    await bootCleanAppState();

    localStorage.setItem(SETTINGS_KEY, "{ this is not valid json");
    expect(() => {
      void useSettingsStore.persist.rehydrate();
    }).not.toThrow();
    await tick();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);

    useSettingsStore.setState({ soundEnabled: false });
    await tick();
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ state: { soundEnabled: true }, version: 0 }),
    );
    useSettingsStore.persist.rehydrate();
    await tick();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);

    await db.dashboardCache.put({
      id: "broken-row",
      data: { here: true },
      updatedAt: Date.now(),
    });
    db.dashboardCache.update("broken-row", {
      updatedAt: 0,
      ttl: undefined,
    } as Partial<{ updatedAt: number; ttl: number | undefined }>);
    expect(await getCachedQueryData("broken-row")).toEqual({ here: true });
  });

  it("4. schema migration: v1 -> v2 upgrade preserves rows and adds indexes", async () => {
    function versionedDB(name: string, version: number, stores: Record<string, string>) {
      class Versioned extends Dexie {
        constructor() {
          super(name);
          this.version(version).stores(stores);
        }
      }
      return new Versioned();
    }

    const legacy = versionedDB("ZuzumikMigrationTest", 1, {
      dashboardCache: "id",
    });
    await legacy.open();
    await legacy.table("dashboardCache").put({
      id: "k1",
      data: { preserved: true },
      updatedAt: 1000,
    });
    await legacy.close();

    const upgraded = versionedDB("ZuzumikMigrationTest", 2, {
      dashboardCache: "id, updatedAt, trustStatus",
      feedbackQueue: "id, createdAt, retryCount",
    });
    await upgraded.open();

    const row = await upgraded.table("dashboardCache").get("k1");
    expect(row?.data).toEqual({ preserved: true });
    expect(
      await upgraded.table("dashboardCache").where("updatedAt").above(1).count(),
    ).toBe(1);
    expect(
      await upgraded.table("feedbackQueue").where("createdAt").above(0).count(),
    ).toBe(0);

    await upgraded.close();
    await Dexie.delete("ZuzumikMigrationTest");
  });

  it("5. storage unavailable: reads/writes/reverts never throw and fall back safely", async () => {
    await bootCleanAppState();

    const oops = () => {
      throw new DOMException("Blocked by the browser", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(oops);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(oops);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(oops);
    vi.spyOn(Storage.prototype, "clear").mockImplementation(oops);

    expect(safeLocalStorage.getItem("anything")).toBeNull();
    expect(safeLocalStorage.length).toBe(0);

    expect(() => {
      useSettingsStore.setState({ soundEnabled: false });
    }).not.toThrow();
    expect(useSettingsStore.getState().soundEnabled).toBe(false);

    await expect(resetAppState()).resolves.toBeUndefined();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("6. storage quota exceeded: writes are dropped gracefully; memory state wins", async () => {
    await bootCleanAppState();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() => {
      safeLocalStorage.setItem("k", "v");
    }).not.toThrow();

    expect(() => {
      useSettingsStore.setState({ soundEnabled: false });
    }).not.toThrow();
    expect(useSettingsStore.getState().soundEnabled).toBe(false);

    await tick();
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();

    await expect(resetAppState()).resolves.toBeUndefined();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  it("7. logout clears required data: stores, storage keys, DB tables and query cache", async () => {
    await bootCleanAppState();

    useSettingsStore.setState({ soundEnabled: false });
    await cacheQueryData("k", { u: "a" });
    await db.feedbackQueue.put({
      id: "fb-to-purge",
      payload: FEEDBACK,
      createdAt: 1,
      retryCount: 0,
    });
    await useAuthStore.getState().login("alice@example.com", "pw");
    queryClient.setQueryData(["seed"], { v: 1 });
    sessionStorage.setItem(AUTH_KEY, "session-junk");
    await tick();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem(AUTH_KEY)).toBeTruthy();

    await resetAppState();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_KEY)).toBeNull();
    expect(await db.dashboardCache.count()).toBe(0);
    expect(await db.feedbackQueue.count()).toBe(0);
    expect(queryClient.getQueryCache().getAll().length).toBe(0);
  });

  it("8. user switching: previous user's data never leaks into the next session", async () => {
    await bootCleanAppState();

    await useAuthStore.getState().login("alice@example.com", "pw1");
    expect(useAuthStore.getState().user?.name).toBe("alice");
    await cacheQueryData("k", { owner: "alice" });

    await resetAppState();
    expect(await db.dashboardCache.count()).toBe(0);
    expect(useAuthStore.getState().user).toBeNull();

    await useAuthStore.getState().login("bob@example.com", "pw2");
    expect(useAuthStore.getState().user?.name).toBe("bob");
    expect(useAuthStore.getState().user?.email).not.toContain("alice");
    expect(await db.dashboardCache.count()).toBe(0);

    await cacheQueryData("k", { owner: "bob" });
    expect(await getCachedQueryData("k")).toEqual({ owner: "bob" });
  });

  it("9. multiple tabs: state is shared through localStorage and hydrated on load", async () => {
    await bootCleanAppState();

    useSettingsStore.setState({ soundEnabled: false, hapticEnabled: false });
    await tick();
    expect(
      JSON.parse(localStorage.getItem(SETTINGS_KEY)!).state.soundEnabled,
    ).toBe(false);

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ state: { soundEnabled: true, hapticEnabled: true }, version: 0 }),
    );
    await useSettingsStore.persist.rehydrate();
    await tick();

    expect(useSettingsStore.getState().soundEnabled).toBe(true);
    expect(useSettingsStore.getState().hapticEnabled).toBe(true);
  });

  it("10. stale cache: TTL-expired entries are treated as missing and reaped", async () => {
    await bootCleanAppState();

    await cacheQueryData("k-trusted", { ok: 1 }, "trusted");
    await cacheQueryData("k-sandbox", { live: true }, "sandbox");

    expect(await getCachedQueryData("k-trusted")).toEqual({ ok: 1 });
    const trustedRow = await db.dashboardCache.get("k-trusted");
    expect(trustedRow?.ttl).toBe(DAY);

    await db.dashboardCache.update("k-trusted", { updatedAt: Date.now() - 2 * DAY });
    expect(await getCachedQueryData("k-trusted")).toBeNull();
    expect(await db.dashboardCache.get("k-trusted")).toBeUndefined();

    await db.dashboardCache.update("k-sandbox", { updatedAt: Date.now() - 2 * HOUR });
    expect(await getCachedQueryData("k-sandbox")).toBeNull();

    await cacheQueryData("fresh", { n: 1 }, "trusted");
    await cacheQueryData("stale", { n: 2 }, "trusted");
    await db.dashboardCache.update("stale", { updatedAt: Date.now() - 2 * DAY });
    expect(await db.dashboardCache.count()).toBe(2);

    await clearExpiredCache();
    expect(await db.dashboardCache.count()).toBe(1);
    expect(await db.dashboardCache.get("fresh")).toBeTruthy();
    expect(await db.dashboardCache.get("stale")).toBeUndefined();
  });

  it("11. cache invalidation: writes overwrite polls and logout purges the cache", async () => {
    await bootCleanAppState();

    await cacheQueryData("planner", { version: 1 });
    await cacheQueryData("planner", { version: 2 });
    expect(await getCachedQueryData("planner")).toEqual({ version: 2 });

    await useAuthStore.getState().login("alice@example.com", "pw");
    await tick();
    await resetAppState();
    expect(await db.dashboardCache.get("planner")).toBeUndefined();
    expect(await getCachedQueryData("planner")).toBeNull();
  });
});