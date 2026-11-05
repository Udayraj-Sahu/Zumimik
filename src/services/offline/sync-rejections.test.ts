import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { flushEventQueue, pendingEvents, rejectionsOf, settleAcknowledged } from "./sync";
import { sendSyncBatch } from "@/services/telemetry";
import { useAuthStore } from "@/stores/auth-store";

const apiPost = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiPost: (...a: unknown[]) => apiPost(...a) }));

const attempt = (id: string) => ({ event_id: id, event_type: "problem_attempt", client_timestamp: Date.now(), metadata: { skill_id: "S", is_correct: true, problem_id: id } });
const EVENTS = [attempt("e1"), attempt("e2"), attempt("e3"), { event_id: "e4", event_type: "session_end", client_timestamp: Date.now(), metadata: {} }];
const REJECTED = { accepted: 3, duplicates: 0, rejected: [{ event_id: "e2", index: 1, reason: "client_timestamp: Input should be greater than or equal to 0" }] };

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  apiPost.mockReset();
  localStorage.clear();
  await db.eventQueue.clear();
  useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" }, token: "t", isAuthenticated: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /sync answers 200 but may reject individual events", () => {
  it("reads the rejections from the response, and tolerates a response without them", () => {
    expect(rejectionsOf(REJECTED)).toHaveLength(1);
    expect(rejectionsOf({ accepted: 2 })).toEqual([]);
    expect(rejectionsOf(undefined)).toEqual([]);
    expect(rejectionsOf({ rejected: "nope" })).toEqual([]);
  });

  it("an acknowledged batch with a rejected event: the rest is cleared, the rejected one is parked with its reason, nothing is lost", async () => {
    apiPost.mockResolvedValue(REJECTED);
    expect(await sendSyncBatch(EVENTS)).toBe("synced");
    const rows = await db.eventQueue.toArray();
    expect(rows).toHaveLength(1); // the accepted batch is gone; only the parked remainder is on the device
    expect(rows[0]).toMatchObject({ status: "parked", userId: "u1" });
    expect(rows[0].events.map((e) => e.event_id)).toEqual(["e2"]);
    expect(rows[0].lastError).toContain("client_timestamp");
  });

  it("the parked event is never retried and never replayed into the learner's state", async () => {
    apiPost.mockResolvedValue(REJECTED);
    await sendSyncBatch(EVENTS);
    apiPost.mockClear();
    expect(await flushEventQueue()).toBe(0); // parked rows are not sent again (resending gets the same answer)
    expect(apiPost).not.toHaveBeenCalled();
    expect(await pendingEvents()).toEqual([]); // so the replayed learner state excludes it
  });

  it("the same applies when the batch is delivered later by the background flush", async () => {
    apiPost.mockRejectedValueOnce(new Error("offline"));
    expect(await sendSyncBatch(EVENTS)).toBe("queued");
    expect(await pendingEvents()).toHaveLength(4); // unacknowledged: still replayed locally
    apiPost.mockResolvedValue(REJECTED);
    expect(await flushEventQueue()).toBe(1);
    const rows = await db.eventQueue.toArray();
    expect(rows.map((r) => r.status)).toEqual(["parked"]);
    expect(rows[0].events.map((e) => e.event_id)).toEqual(["e2"]);
    expect(await pendingEvents()).toEqual([]);
  });

  it("a rejection with no event id is matched by its position in the batch", async () => {
    apiPost.mockResolvedValue({ accepted: 3, rejected: [{ event_id: null, index: 2, reason: "event_id: String should have at least 1 character" }] });
    await sendSyncBatch(EVENTS);
    const rows = await db.eventQueue.toArray();
    expect(rows[0].events.map((e) => e.event_id)).toEqual(["e3"]);
  });

  it("a fully accepted batch leaves nothing behind, as before", async () => {
    apiPost.mockResolvedValue({ accepted: 4, duplicates: 0, rejected: [] });
    await sendSyncBatch(EVENTS);
    expect(await db.eventQueue.count()).toBe(0);
  });

  it("settling is atomic and idempotent: running it twice parks the rejected event once", async () => {
    await db.eventQueue.put({ id: "b", userId: "u1", events: EVENTS, createdAt: 1, attempts: 0, status: "pending" });
    expect(await settleAcknowledged({ id: "b", userId: "u1", events: EVENTS }, REJECTED)).toBe(1);
    expect(await settleAcknowledged({ id: "b", userId: "u1", events: EVENTS }, REJECTED)).toBe(1);
    expect((await db.eventQueue.toArray()).map((r) => r.id)).toEqual(["rejected:b"]);
  });
});
