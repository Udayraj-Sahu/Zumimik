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

describe("cognitive load is logged with the attempt", () => {
  it("each problem_attempt carries the engine's load for its question, and an item with no text carries none", async () => {
    const { buildSprintSyncEvents } = await import("@/services/telemetry");
    const q = (id: string, text: string) => ({ id, text, options: [], correctIndex: 0, timeLimit: 30, skillId: "S" });
    const events = buildSprintSyncEvents(
      { topic: "S", questions: [q("a", "98 × 97 = ?"), q("b", "")] },
      { answers: [{ questionId: "a", selectedIndex: -1, answerText: "1", correct: true, timeSpent: 3 }, { questionId: "b", selectedIndex: -1, answerText: "1", correct: true, timeSpent: 3 }], score: 2, total: 2, accuracy: 100, totalTimeSpent: 6, xpEarned: 0 },
    );
    const attempts = events.filter((e) => e.event_type === "problem_attempt") as Array<{ metadata: { bcl?: number } }>;
    expect(attempts[0].metadata.bcl).toBe(5);
    expect(attempts[1].metadata.bcl).toBeUndefined();
  });
});

describe("a sprint's recorded checkpoints are logged with its result", () => {
  it("syncSprintResult sends the extra psychometric events in the same batch, before session_end", async () => {
    apiPost.mockResolvedValue({ accepted: 3, rejected: [] });
    const { syncSprintResult } = await import("@/services/telemetry");
    const question = { id: "a", text: "1 + 1", options: [], correctIndex: 0, timeLimit: 30, skillId: "S" };
    await syncSprintResult(
      { topic: "S", questions: [question] },
      { answers: [{ questionId: "a", selectedIndex: -1, answerText: "2", correct: true, timeSpent: 3, answeredAt: Date.now() - 1000 }], score: 1, total: 1, accuracy: 100, totalTimeSpent: 3, xpEarned: 0 },
      "cat",
      "sprint",
      [{ event_type: "fatigue_index_computed", metadata: { evaluated: false, skip_reason: "too_few_attempts" } }],
    );
    const sent = (apiPost.mock.calls.find(([p]) => p === "/sync") as unknown as [string, { events: Array<{ event_type: string }> }])[1].events.map((e) => e.event_type);
    expect(sent).toContain("fatigue_index_computed");
    expect(sent[sent.length - 1]).toBe("session_end");
    expect(sent.indexOf("fatigue_index_computed")).toBeLessThan(sent.indexOf("session_end"));
  });
});
