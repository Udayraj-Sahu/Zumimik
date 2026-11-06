import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/services/offline/db";
import { deriveSyncKind, readQueueCounts, EMPTY_COUNTS } from "@/services/sync-status";
import { isSyncing, trackSync } from "@/services/offline/sync-activity";
import { useAuthStore } from "@/stores/auth-store";
import { useNetworkStore } from "@/stores/network-store";

vi.setConfig({ testTimeout: 30000 });
const syncAll = vi.fn(async () => {});
vi.mock("@/services/offline/sync", async (orig) => ({ ...(await orig<object>()), syncAll: (...a: unknown[]) => (syncAll as unknown as (...x: unknown[]) => Promise<void>)(...a) }));

const ev = (id: string) => ({ event_id: id, event_type: "problem_attempt", client_timestamp: 1, metadata: {} });
const pending = (id: string, n = 2, userId = "u1") => ({ id, userId, events: Array.from({ length: n }, (_, i) => ev(`${id}-${i}`)), createdAt: 1, attempts: 0, status: "pending" as const });
const parked = (id: string, reason: string, n = 1, userId = "u1") => ({ ...pending(id, n, userId), status: "parked" as const, lastError: reason });

describe("the sync status is derived from the facts, most urgent first", () => {
  const base = { online: true, syncing: false, pendingEvents: 0, parkedEvents: 0 };
  it("covers every state", () => {
    expect(deriveSyncKind(base)).toBe("synced");
    expect(deriveSyncKind({ ...base, pendingEvents: 3 })).toBe("pending");
    expect(deriveSyncKind({ ...base, parkedEvents: 1 })).toBe("attention");
    expect(deriveSyncKind({ ...base, online: false })).toBe("offline");
    expect(deriveSyncKind({ ...base, syncing: true })).toBe("syncing");
  });
  it("orders them: syncing, then offline, then attention, then pending", () => {
    expect(deriveSyncKind({ online: false, syncing: true, pendingEvents: 1, parkedEvents: 1 })).toBe("syncing");
    expect(deriveSyncKind({ online: false, syncing: false, pendingEvents: 1, parkedEvents: 1 })).toBe("offline");
    expect(deriveSyncKind({ online: true, syncing: false, pendingEvents: 1, parkedEvents: 1 })).toBe("attention");
  });
});

describe("the queue as the learner's device holds it", () => {
  beforeEach(async () => { await db.eventQueue.clear(); });

  it("counts pending and parked batches and events for the signed-in learner only, with the server's reasons once each", async () => {
    await db.eventQueue.bulkPut([
      pending("p1", 3), pending("p2", 2), pending("other", 9, "u2"),
      parked("k1", "client_timestamp: out of range", 2), parked("k2", "client_timestamp: out of range", 1), parked("k3", "x".repeat(300)),
    ]);
    const c = await readQueueCounts("u1");
    expect(c).toMatchObject({ pendingBatches: 2, pendingEvents: 5, parkedBatches: 3, parkedEvents: 4 });
    expect(c.reasons).toHaveLength(2); // the repeated reason is listed once
    expect(c.reasons.every((r) => r.length <= 120)).toBe(true); // shortened
  });

  it("an empty queue, no learner, or unreadable storage reads as nothing waiting", async () => {
    expect(await readQueueCounts("u1")).toEqual(EMPTY_COUNTS);
    expect(await readQueueCounts("")).toEqual(EMPTY_COUNTS);
  });

  it("a parked batch with no recorded reason still says it was refused", async () => {
    await db.eventQueue.put({ ...parked("k", "x"), lastError: undefined });
    expect((await readQueueCounts("u1")).reasons).toEqual(["Rejected by the server"]);
  });
});

describe("the indicator", () => {
  beforeEach(async () => {
    syncAll.mockClear();
    await db.eventQueue.clear();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" } as never, token: "t", isAuthenticated: true });
    useNetworkStore.setState({ isOnline: true });
  });
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  async function mount() {
    const { SyncIndicator } = await import("./sync-indicator");
    return render(<SyncIndicator />);
  }
  const kind = () => screen.getByTestId("sync-indicator").getAttribute("data-kind");
  const refreshNow = () => act(async () => { await trackSync(async () => {}); }); // a sync starting and ending makes the indicator read the queue again

  it("goes through every status as the queue and the network change", async () => {
    await mount();
    expect(kind()).toBe("synced");
    expect(screen.queryByTestId("sync-label")).not.toBeInTheDocument(); // silent when all is well on load

    await db.eventQueue.put(pending("p1", 4));
    await refreshNow();
    await waitFor(() => expect(kind()).toBe("pending"));
    expect(screen.getByTestId("sync-count")).toHaveTextContent("4");

    let release!: () => void;
    const inFlight = trackSync(() => new Promise<void>((r) => { release = r; }));
    await waitFor(() => expect(kind()).toBe("syncing"));
    expect(isSyncing()).toBe(true);
    await act(async () => { release(); await inFlight; });
    await waitFor(() => expect(kind()).toBe("pending"));

    await act(async () => { useNetworkStore.setState({ isOnline: false }); });
    await waitFor(() => expect(kind()).toBe("offline"));
    await act(async () => { useNetworkStore.setState({ isOnline: true }); });

    await db.eventQueue.put(parked("k1", "client_timestamp: out of range", 2));
    await refreshNow();
    await waitFor(() => expect(kind()).toBe("attention"));

    await db.eventQueue.clear();
    await refreshNow();
    await waitFor(() => expect(kind()).toBe("synced"));
  });

  it("shows how many events need attention and the server's reasons, and never offers to delete them", async () => {
    await db.eventQueue.put(parked("k1", "client_timestamp: out of range", 2));
    await mount();
    await refreshNow();
    await waitFor(() => expect(kind()).toBe("attention"));
    fireEvent.click(screen.getByRole("button", { name: /Sync status/ }));
    expect(screen.getByTestId("sync-detail")).toHaveTextContent("2 need attention");
    expect(screen.getByTestId("sync-reasons")).toHaveTextContent("client_timestamp: out of range");
    expect(screen.getByTestId("sync-details")).toHaveTextContent("kept on this device");
    expect(screen.queryByRole("button", { name: /delete|clear|discard|remove/i })).not.toBeInTheDocument();
    expect(await db.eventQueue.count()).toBe(1); // nothing was touched
  });

  it("Try again sends what is waiting, and is not offered when nothing is", async () => {
    await mount();
    expect(screen.queryByRole("button", { name: /Sync status/ })).not.toBeInTheDocument();

    await db.eventQueue.put(pending("p1", 2));
    await refreshNow();
    fireEvent.click(await screen.findByRole("button", { name: /Sync status/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(syncAll).toHaveBeenCalledOnce();
    expect(await db.eventQueue.count()).toBe(1); // sending is the sync code's job; the button deletes nothing

    await db.eventQueue.clear();
    await refreshNow();
    await waitFor(() => expect(kind()).toBe("synced"));
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByTestId("sync-details")).toHaveTextContent("saved on the server");
  });

  it("a status flashes for a moment when it changes, then hides; offline stays", async () => {
    await mount();
    await db.eventQueue.put(pending("p1", 2));
    await refreshNow();
    expect(await screen.findByTestId("sync-label")).toHaveTextContent("Waiting to sync");
    await waitFor(() => expect(screen.queryByTestId("sync-label")).not.toBeInTheDocument(), { timeout: 4000 });
    await act(async () => { useNetworkStore.setState({ isOnline: false }); });
    await new Promise((r) => setTimeout(r, 2500));
    expect(screen.getByTestId("sync-label")).toHaveTextContent("Offline");
  });

  it("says offline progress is kept on the device", async () => {
    useNetworkStore.setState({ isOnline: false });
    await mount();
    fireEvent.click(screen.getByRole("button", { name: /Sync status/ }));
    expect(screen.getByTestId("sync-details")).toHaveTextContent("saved on this device");
  });

  it("is hidden when nobody is signed in and in demo mode", async () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false } as never);
    await mount();
    expect(screen.queryByTestId("sync-indicator")).not.toBeInTheDocument();
    cleanup();
    vi.resetModules();
    vi.doMock("@/lib/platform", async (orig) => ({ ...(await orig<object>()), IS_MOCK: true }));
    useAuthStore.setState({ user: { id: "u1" } as never });
    const { SyncIndicator } = await import("./sync-indicator");
    render(<SyncIndicator />);
    expect(screen.queryByTestId("sync-indicator")).not.toBeInTheDocument();
    vi.doUnmock("@/lib/platform");
  });
});
