import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "./db";
import { flushEventQueue, pendingEventBatchCount, syncAll } from "./sync";
import { sendSyncBatch } from "@/services/telemetry";
import { ApiError } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useNetworkStore } from "@/stores/network-store";

const apiPost = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiPost: (...a: unknown[]) => apiPost(...a) }));

const EVENTS = [
  { event_id: "e1", event_type: "problem_attempt", client_timestamp: 1, metadata: {} },
  { event_id: "e2", event_type: "session_end", client_timestamp: 2, metadata: {} },
];

function signIn(id = "u1") {
  useAuthStore.setState({ user: { id, name: "A", email: "a@x.com", role: "user" }, token: "t", isAuthenticated: true });
}

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  apiPost.mockReset();
  localStorage.clear();
  useNetworkStore.getState().clearQueue();
  await db.eventQueue.clear();
  await db.feedbackQueue.clear();
  signIn();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("durable attempt queue", () => {
  it("acknowledged send: resolves 'synced' and leaves nothing on disk", async () => {
    apiPost.mockResolvedValue({ accepted: 2 });
    expect(await sendSyncBatch(EVENTS)).toBe("synced");
    expect(await db.eventQueue.count()).toBe(0);
  });

  it("offline / server trouble: the batch is kept on disk and reported 'queued' (never 'synced')", async () => {
    apiPost.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await sendSyncBatch(EVENTS)).toBe("queued");
    const [batch] = await db.eventQueue.toArray();
    expect(batch).toMatchObject({ userId: "u1", status: "pending" });
    expect(batch.events.map((e) => e.event_id)).toEqual(["e1", "e2"]);
    expect(await pendingEventBatchCount()).toBe(1);
  });

  it("a 5xx is queued, not parked or lost", async () => {
    apiPost.mockRejectedValue(new ApiError(503, "down"));
    expect(await sendSyncBatch(EVENTS)).toBe("queued");
    expect((await db.eventQueue.toArray())[0].status).toBe("pending");
  });

  it("a permanent rejection (422) is parked with the reason and thrown, so it is never claimed as saved", async () => {
    apiPost.mockRejectedValue(new ApiError(422, "bad event"));
    await expect(sendSyncBatch(EVENTS)).rejects.toMatchObject({ status: 422 });
    expect((await db.eventQueue.toArray())[0]).toMatchObject({ status: "parked", lastError: "bad event" });
  });

  it("flush after coming back online re-sends the SAME event ids and clears the queue", async () => {
    apiPost.mockRejectedValueOnce(new TypeError("offline"));
    await sendSyncBatch(EVENTS);
    apiPost.mockResolvedValue({ accepted: 2 });
    expect(await flushEventQueue()).toBe(1);
    const body = apiPost.mock.calls.at(-1)![1] as { events: Array<{ event_id: string }> };
    expect(body.events.map((e) => e.event_id)).toEqual(["e1", "e2"]);
    expect(await db.eventQueue.count()).toBe(0);
  });

  it("survives a reload: syncAll picks pending batches up from Dexie with an empty in-memory queue", async () => {
    await db.eventQueue.put({ id: "b1", userId: "u1", events: EVENTS, createdAt: Date.now(), attempts: 0, status: "pending" });
    useNetworkStore.getState().clearQueue();
    apiPost.mockResolvedValue({ accepted: 2 });
    await syncAll();
    expect(apiPost).toHaveBeenCalledWith("/sync", { events: EVENTS, device_id: expect.any(String) });
    expect(await db.eventQueue.count()).toBe(0);
  });

  it("a failed flush keeps the batch and counts the attempt (nothing is deleted before an acknowledgement)", async () => {
    await db.eventQueue.put({ id: "b1", userId: "u1", events: EVENTS, createdAt: Date.now(), attempts: 0, status: "pending" });
    apiPost.mockRejectedValue(new TypeError("offline"));
    expect(await flushEventQueue()).toBe(0);
    expect(await db.eventQueue.get("b1")).toMatchObject({ status: "pending", attempts: 1 });
  });

  it("batches belong to a user: another account's pending work is never sent and survives logout", async () => {
    await db.eventQueue.put({ id: "a", userId: "u1", events: EVENTS, createdAt: Date.now(), attempts: 0, status: "pending" });
    signIn("u2");
    apiPost.mockResolvedValue({});
    expect(await flushEventQueue()).toBe(0);
    expect(apiPost).not.toHaveBeenCalled();
    expect(await db.eventQueue.count()).toBe(1);
    signIn("u1");
    expect(await flushEventQueue()).toBe(1);
  });

  it("parked batches are not retried automatically", async () => {
    await db.eventQueue.put({ id: "p", userId: "u1", events: EVENTS, createdAt: Date.now(), attempts: 1, status: "parked", lastError: "rejected" });
    apiPost.mockResolvedValue({});
    expect(await flushEventQueue()).toBe(0);
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("queued feedback on disk is replayed after a reload (previously only the in-memory queue was sent)", async () => {
    await db.feedbackQueue.put({ id: "f1", payload: { questionId: "q1", feedbackType: "thumbs_down", wrongAnswer: true, comment: "x" } as never, createdAt: 1234, retryCount: 0 });
    useNetworkStore.getState().clearQueue();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    await syncAll();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/sync\/content\/feedback$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ templateId: "q1", reportedAt: 1234 });
    expect(await db.feedbackQueue.count()).toBe(0);
  });
});
