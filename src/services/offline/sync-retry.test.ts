import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "./db";
import { cacheQueryData, getCachedQueryData, syncAll } from "./sync";
import { useAuthStore } from "@/stores/auth-store";
import { useNetworkStore } from "@/stores/network-store";

const HOUR = 3_600_000;

function enqueue(id: string, key: string, payload: unknown = { value: 1 }): void {
  useNetworkStore.getState().addToQueue({ id, key, payload, timestamp: Date.now() });
}

function setToken(t: string | null): void {
  useAuthStore.setState({ token: t, isAuthenticated: !!t });
}

async function seedFeedback(id: string, retryCount: number): Promise<void> {
  await db.feedbackQueue.put({
    id,
    payload: { questionId: "q1", feedbackType: "thumbs_down", comment: "retry-suite" },
    createdAt: Date.now(),
    retryCount,
  });
}

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  useNetworkStore.getState().clearQueue();
  setToken("test-jwt");
  await db.dashboardCache.clear();
  await db.feedbackQueue.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("API failure / retry / refresh (src/services/offline/sync.ts)", () => {
  it("1. empty queue: sync is a no-op (no network call)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await syncAll();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("2. unauthenticated: queue is untouched and no request leaves the device", async () => {
    setToken(null);
    enqueue("m1", "content/feedback");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await syncAll();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useNetworkStore.getState().syncQueue).toHaveLength(1);
  });

  it("3. success: mutation leaves the queue and its feedback row is deleted", async () => {
    enqueue("m1", "content/feedback");
    await seedFeedback("m1", 0);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    await syncAll();
    expect(useNetworkStore.getState().syncQueue).toHaveLength(0);
    expect(await db.feedbackQueue.count()).toBe(0);
  });

  it("4. server error (5xx): mutation stays queued for retry, retryCount untouched", async () => {
    enqueue("m1", "content/feedback");
    await seedFeedback("m1", 0);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await syncAll();
    expect(useNetworkStore.getState().syncQueue).toHaveLength(1);
    expect((await db.feedbackQueue.get("m1"))?.retryCount).toBe(0);
  });

  it("5. network failure (reject): error is contained (never thrown to caller), mutation retained", async () => {
    enqueue("m1", "content/feedback");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(syncAll()).resolves.toBeUndefined();
    expect(useNetworkStore.getState().syncQueue).toHaveLength(1);
  });

  it("6. retryable 4xx feedback below the cap increments retryCount and stays queued", async () => {
    enqueue("m1", "content/feedback");
    await seedFeedback("m1", 0);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await syncAll();
    expect((await db.feedbackQueue.get("m1"))?.retryCount).toBe(1);
    expect(useNetworkStore.getState().syncQueue).toHaveLength(1);
  });

  it("7. 4xx feedback at the retry cap is PARKED (kept on disk, no more automatic retries), never deleted", async () => {
    enqueue("m1", "content/feedback");
    await seedFeedback("m1", 2);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await syncAll();
    const kept = await db.feedbackQueue.get("m1");
    expect(kept).toMatchObject({ parked: true, retryCount: 3 });
    expect(useNetworkStore.getState().syncQueue).toHaveLength(0);
    // a later sync does not retry a parked item
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    await syncAll();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("8. 4xx on a NON-feedback key is never dropped (kept for manual/human retry)", async () => {
    enqueue("m1", "topics/geometric-series");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await syncAll();
    expect(useNetworkStore.getState().syncQueue).toHaveLength(1);
  });

  it("9. authorization failure (401) on feedback behaves like other 4xx (retry counted)", async () => {
    enqueue("m1", "content/feedback");
    await seedFeedback("m1", 0);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await syncAll();
    expect((await db.feedbackQueue.get("m1"))?.retryCount).toBe(1);
  });

  it("10. overlapping syncAll calls coalesce into a single request batch", async () => {
    let resolveFirst: (v: { ok: boolean; status: number }) => void = () => {};
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise((r) => (resolveFirst = r)),
    );
    vi.stubGlobal("fetch", fetchMock);
    enqueue("m1", "content/feedback");
    const p1 = syncAll();
    const p2 = syncAll();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFirst({ ok: true, status: 200 });
    await p1;
    await p2;
    expect(useNetworkStore.getState().syncQueue).toHaveLength(0);
  });

  it("11. refresh: stale cached dashboard data invalidates and self-deletes (fresh copy survives)", async () => {
    await cacheQueryData("fresh", { v: 1 }, "trusted");
    expect(await getCachedQueryData("fresh")).toEqual({ v: 1 });

    await db.dashboardCache.put({
      id: "stale",
      data: { v: 2 },
      updatedAt: Date.now() - 2 * HOUR,
      ttl: HOUR,
    });
    expect(await getCachedQueryData("stale")).toBeNull();
    expect(await db.dashboardCache.get("stale")).toBeUndefined();
  });
});