import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt, type TechniqueState } from "@vmsg/psychometrics";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

vi.setConfig({ testTimeout: 30000 });

const NOW = Date.now();
const DAY = 86_400_000;

function practised(skill: string, n: number, startAt: number): TechniqueState {
  let s = freshState(skill);
  for (let i = 0; i < n; i++) s = processAttempt(s, { correct: true, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}-old-${i}`, at: startAt + i * 1000 });
  return s;
}

const q = (id: string): Question => ({ id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId: "Fractions", feedsMastery: true, trustStatus: "trusted", difficulty: 3 });
let clock = NOW - 60_000;
const a = (questionId: string, correct: boolean | null = true): SprintAnswer => ({ questionId, selectedIndex: 0, correct, timeSpent: 3, answeredAt: (clock += 4000) });
const sessionOf = (...ids: string[]) => ({ session: { topic: "Fractions", questions: ids.map(q) }, result: { answers: ids.map((i) => a(i)), score: ids.length, total: ids.length, accuracy: 100, totalTimeSpent: ids.length * 3, xpEarned: 0 } });

/** A tiny stand-in for the backend: it dedupes by event_id and keeps, per technique, the entry with the latest practice (mastery_read). */
function makeServer(initial: Record<string, TechniqueState>) {
  const server = {
    online: true,
    postDown: false,    // only POST /sync fails (the snapshot is still readable)
    snapshotReadable: true,
    states: { ...initial } as Record<string, TechniqueState>,
    accepted: new Set<string>(),
    postCalls: 0,
    duplicates: 0,
  };
  const apiGet = vi.fn(async (path: string) => {
    if (path !== "/practice/mastery") throw new Error("unexpected " + path);
    if (!server.online || !server.snapshotReadable) throw new Error("offline");
    return { technique_states: JSON.parse(JSON.stringify(server.states)), as_of: NOW - DAY };
  });
  const apiPost = vi.fn(async (path: string, body: { events: Array<Record<string, unknown>> }) => {
    server.postCalls += 1;
    if (!server.online || server.postDown) throw new Error("offline");
    if (path !== "/sync") throw new Error("unexpected " + path);
    for (const e of body.events) {
      const id = e.event_id as string;
      if (server.accepted.has(id)) { server.duplicates += 1; continue; }
      server.accepted.add(id);
      const ts = (e.metadata as { technique_states?: Record<string, TechniqueState> }).technique_states;
      if (e.event_type === "session_end" && ts) {
        for (const [k, v] of Object.entries(ts)) {
          const cur = server.states[k];
          if (!cur || (v.lastPracticedAt ?? 0) >= (cur.lastPracticedAt ?? 0)) server.states[k] = v;
        }
      }
    }
    return { accepted: body.events.length };
  });
  return { server, apiGet, apiPost };
}

async function boot(initial: Record<string, TechniqueState>, existing?: ReturnType<typeof makeServer>) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const fake = existing ?? makeServer(initial);
  vi.doMock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage, apiUrl: (p: string) => p }));
  vi.doMock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: fake.apiGet, apiPost: fake.apiPost }));
  vi.doMock("@/providers/query-provider", () => ({ queryClient: { invalidateQueries: vi.fn() } }));
  const telemetry = await import("@/services/telemetry");
  const learner = await import("@/services/learner");
  const { db } = await import("@/services/offline/db");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" } as never, token: "t", isAuthenticated: true });
  return { ...fake, telemetry, learner, db };
}

const endOf = (events: Array<Record<string, unknown>>) => events[events.length - 1] as { metadata: { technique_states?: Record<string, TechniqueState> } };

describe("learner state across offline, retry, duplicates, devices and concurrency", () => {
  beforeEach(async () => {
    localStorage.clear();
    const { db } = await import("@/services/offline/db");
    await db.eventQueue.clear();
    clock = NOW - 60_000;
  });

  it("an offline session followed by another builds on the first one (no stale base)", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    await h.learner.loadLearnerStates("u1"); // a good online read: the snapshot is remembered
    h.server.online = false;

    const s1 = sessionOf("n1", "n2");
    expect(await h.telemetry.sendSyncBatch(await h.telemetry.queueSessionSync(s1.session, s1.result))).toBe("queued");
    const s2 = sessionOf("n3", "n4");
    const events2 = await h.telemetry.queueSessionSync(s2.session, s2.result);
    expect(endOf(events2).metadata.technique_states?.Fractions.totalAttempts).toBe(3 + 2 + 2);
    expect(await h.db.eventQueue.count()).toBe(2); // nothing deleted without an acknowledgement

    // Back online: both batches are delivered oldest first, and the server converges on the same picture.
    h.server.online = true;
    await h.telemetry.sendSyncBatch(events2);
    expect(await h.db.eventQueue.count()).toBe(0);
    expect(h.server.states.Fractions.totalAttempts).toBe(7);
    const after = await h.learner.loadLearnerStates("u1");
    expect(after?.Fractions.totalAttempts).toBe(7); // not 7 + 4: acknowledged events are not replayed again
  });

  it("a failed sync keeps the events, and the retry delivers them once", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    const s = sessionOf("n1", "n2");
    const events = await h.telemetry.queueSessionSync(s.session, s.result);
    h.server.online = false;
    expect(await h.telemetry.sendSyncBatch(events)).toBe("queued");
    expect(await h.db.eventQueue.count()).toBe(1);
    h.server.online = true;
    expect(await h.telemetry.sendSyncBatch(events)).toBe("synced"); // the SAME events again
    expect(await h.db.eventQueue.count()).toBe(0);
    expect(h.server.states.Fractions.totalAttempts).toBe(5);
    expect(h.server.accepted.size).toBe(events.length); // each event id stored once
  });

  it("the same event delivered in two batches is applied once", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    await h.learner.loadLearnerStates("u1");
    h.server.online = false;
    const s = sessionOf("n1", "n2");
    const events = await h.telemetry.queueSessionSync(s.session, s.result);
    await h.db.eventQueue.put({ id: "dup-batch", userId: "u1", events, createdAt: Date.now(), attempts: 0, status: "pending" }); // a second copy
    expect(await h.db.eventQueue.count()).toBe(2);
    h.server.online = true;
    const states = await h.learner.reconcileLearnerStates("u1");
    // flushed: both copies reached the server, which deduplicated by event id
    expect(h.server.duplicates).toBeGreaterThan(0);
    expect(states?.Fractions.totalAttempts).toBe(5);
  });

  it("offline with a dup batch queued: replay counts each attempt once", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    await h.learner.loadLearnerStates("u1");
    h.server.online = false;
    const s = sessionOf("n1", "n2");
    const events = await h.telemetry.queueSessionSync(s.session, s.result);
    await h.db.eventQueue.put({ id: "dup-batch", userId: "u1", events, createdAt: Date.now() + 1, attempts: 0, status: "pending" });
    const states = await h.learner.reconcileLearnerStates("u1");
    expect(states?.Fractions.totalAttempts).toBe(5);
  });

  it("two sessions finishing together both land (serialized state updates)", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    h.server.online = false;
    await h.learner.loadLearnerStates("u1").catch(() => null);
    h.server.online = true;
    await h.learner.loadLearnerStates("u1"); // remembered
    h.server.online = false;
    const a1 = sessionOf("c1", "c2");
    const b1 = sessionOf("d1", "d2");
    const [ea, eb] = await Promise.all([
      h.telemetry.queueSessionSync(a1.session, a1.result),
      h.telemetry.queueSessionSync(b1.session, b1.result),
    ]);
    const totals = [endOf(ea), endOf(eb)].map((e) => e.metadata.technique_states?.Fractions.totalAttempts).sort();
    expect(totals).toEqual([5, 7]); // the second one started from a state that already contained the first
    expect(await h.db.eventQueue.count()).toBe(2);
  });

  it("another device's newer progress is the base; this device's unsent attempts are replayed over it", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    // Device B practised 6 more times since and synced.
    h.server.states.Fractions = practised("Fractions", 9, NOW - 2 * DAY);
    h.server.online = false;
    await h.learner.loadLearnerStates("u1").catch(() => null);
    h.server.online = true;
    await h.learner.loadLearnerStates("u1");
    h.server.online = false;
    const s = sessionOf("n1", "n2");
    const events = await h.telemetry.queueSessionSync(s.session, s.result);
    expect(endOf(events).metadata.technique_states?.Fractions.totalAttempts).toBe(9 + 2);
  });

  it("a restart keeps queued events and the remembered snapshot", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    await h.learner.loadLearnerStates("u1");
    h.server.online = false;
    const s = sessionOf("n1", "n2");
    await h.telemetry.sendSyncBatch(await h.telemetry.queueSessionSync(s.session, s.result));

    // "Restart": a fresh module graph (the page reloaded or the app was relaunched); IndexedDB and localStorage persist.
    const again = await boot({}, h);
    const states = await again.learner.loadLearnerStates("u1");
    expect(states?.Fractions.totalAttempts).toBe(5);
  });

  it("with no readable snapshot and none remembered the history is unknown: no snapshot is written, events are kept", async () => {
    const h = await boot({});
    h.server.snapshotReadable = false;
    const s = sessionOf("n1", "n2");
    const events = await h.telemetry.queueSessionSync(s.session, s.result);
    expect(endOf(events).metadata.technique_states).toBeUndefined();
    expect(await h.db.eventQueue.count()).toBe(1);
    expect(await h.learner.loadLearnerStates("u1")).toBeNull();
  });

  it("a batch the server rejected is parked, kept, and not replayed into the state", async () => {
    const h = await boot({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });
    await h.learner.loadLearnerStates("u1");
    const s = sessionOf("n1", "n2");
    h.server.online = false;
    const events = await h.telemetry.queueSessionSync(s.session, s.result);
    await h.db.eventQueue.update(events[0].event_id as string, { status: "parked", lastError: "422" });
    expect(await h.db.eventQueue.count()).toBe(1); // still on the device
    const states = await h.learner.reconcileLearnerStates("u1");
    expect(states?.Fractions.totalAttempts).toBe(3);
  });

  it("legacy events without a canonical skill or a trusted time are skipped, never guessed", async () => {
    const { attemptsFromEvents } = await import("@/lib/learning/event-replay");
    const base = { event_type: "problem_attempt", client_timestamp: NOW - 1000, metadata: { skill: "Fractions", problem_id: "p", is_correct: true, time_ms: 3000 } };
    expect(attemptsFromEvents([{ ...base, event_id: "1" }], NOW)).toHaveLength(0); // no skill_id
    const withSkill = { ...base, metadata: { ...base.metadata, skill_id: "Fractions" } };
    expect(attemptsFromEvents([{ ...withSkill, event_id: "2" }], NOW)).toHaveLength(1);
    expect(attemptsFromEvents([{ ...withSkill, event_id: "3", client_timestamp: 5 }], NOW)).toHaveLength(0); // a 1970 clock
    expect(attemptsFromEvents([{ ...withSkill, event_id: "4", client_timestamp: NOW + DAY }], NOW)).toHaveLength(0); // from the future
    expect(attemptsFromEvents([{ ...withSkill, event_id: "5", metadata: { ...withSkill.metadata, is_correct: null } }], NOW)).toHaveLength(0); // deferred
    expect(attemptsFromEvents([{ ...withSkill, event_id: "6", metadata: { ...withSkill.metadata, feeds_mastery: false } }], NOW)).toHaveLength(0); // sandbox
    expect(attemptsFromEvents([{ ...withSkill, event_id: "7" }, { ...withSkill, event_id: "7" }], NOW)).toHaveLength(1); // same id twice
  });
});

describe("P0: reconciliation never loses a session, whichever way the network fails", () => {
  beforeEach(async () => {
    localStorage.clear();
    const { db } = await import("@/services/offline/db");
    await db.eventQueue.clear();
    clock = NOW - 60_000;
  });
  const base = () => ({ Fractions: practised("Fractions", 3, NOW - 3 * DAY) });

  it("a queued session followed by another ONLINE session: the snapshot is readable but older, and the first session is still counted", async () => {
    const h = await boot(base());
    await h.learner.loadLearnerStates("u1");
    h.server.postDown = true; // the batch cannot be delivered, but the server (and its older snapshot) is reachable
    const s1 = sessionOf("n1", "n2");
    await h.telemetry.sendSyncBatch(await h.telemetry.queueSessionSync(s1.session, s1.result));
    expect(h.server.states.Fractions.totalAttempts).toBe(3); // the server really is behind
    const s2 = sessionOf("n3", "n4");
    const events2 = await h.telemetry.queueSessionSync(s2.session, s2.result);
    expect(endOf(events2).metadata.technique_states?.Fractions.totalAttempts).toBe(3 + 2 + 2);
  });

  it("the snapshot cannot be fetched but the server accepts events: the remembered snapshot plus the queue is the base", async () => {
    const h = await boot(base());
    await h.learner.loadLearnerStates("u1");
    h.server.snapshotReadable = false;
    const s1 = sessionOf("n1", "n2");
    const events = await h.telemetry.queueSessionSync(s1.session, s1.result);
    expect(endOf(events).metadata.technique_states?.Fractions.totalAttempts).toBe(5);
    await h.telemetry.sendSyncBatch(events);
    expect(h.server.states.Fractions.totalAttempts).toBe(5);
    expect(await h.db.eventQueue.count()).toBe(0);
  });

  it("the network fails part way through flushing: delivered batches are not replayed twice, undelivered ones are not lost", async () => {
    const h = await boot(base());
    await h.learner.loadLearnerStates("u1");
    h.server.online = false;
    const batches = [sessionOf("a1", "a2"), sessionOf("b1", "b2"), sessionOf("c1", "c2")];
    for (const b of batches) await h.telemetry.sendSyncBatch(await h.telemetry.queueSessionSync(b.session, b.result));
    expect(await h.db.eventQueue.count()).toBe(3);

    h.server.online = true;
    let posts = 0;
    const deliver = h.apiPost.getMockImplementation()!;
    h.apiPost.mockImplementation(async (path: string, body: { events: Array<Record<string, unknown>> }) => {
      posts += 1;
      if (posts > 1) throw new Error("connection dropped"); // the second delivery fails
      return deliver(path, body); // the first one reaches the server, which stores it
    });
    await h.learner.loadLearnerStates("u1"); // flushes: one batch delivered, then the network drops
    expect(await h.db.eventQueue.count()).toBe(2);
    expect(h.server.states.Fractions.totalAttempts).toBe(5); // the server holds the delivered batch (3 + 2)
    const states = await h.learner.loadLearnerStates("u1");
    expect(states?.Fractions.totalAttempts).toBe(3 + 2 + 2 + 2); // 5 from the server, then only the two undelivered batches replayed
  });

  it("a batch acknowledged by the BACKGROUND flush is visible at once, not hidden behind the 60-second snapshot cache", async () => {
    const h = await boot(base());
    await h.learner.loadLearnerStates("u1"); // caches the snapshot as it was
    h.server.postDown = true;
    const s1 = sessionOf("n1", "n2");
    await h.telemetry.sendSyncBatch(await h.telemetry.queueSessionSync(s1.session, s1.result));
    h.server.postDown = false;
    const { flushEventQueue } = await import("@/services/offline/sync");
    expect(await flushEventQueue()).toBe(1); // what the reconnect handler (syncAll) does
    expect(h.server.states.Fractions.totalAttempts).toBe(5);
    const states = await h.learner.loadLearnerStates("u1");
    expect(states?.Fractions.totalAttempts).toBe(5); // not 3 from the cached older snapshot
  });

  it("after an acknowledgement the device can go offline and restart without losing that session", async () => {
    const h = await boot(base());
    await h.learner.loadLearnerStates("u1"); // remembers the snapshot as it was (3 attempts)
    const s1 = sessionOf("n1", "n2");
    expect(await h.telemetry.sendSyncBatch(await h.telemetry.queueSessionSync(s1.session, s1.result))).toBe("synced");
    expect(await h.db.eventQueue.count()).toBe(0); // acknowledged: nothing left to replay

    h.server.online = false;
    const again = await boot({}, h); // restart while offline
    const states = await again.learner.loadLearnerStates("u1");
    expect(states?.Fractions.totalAttempts).toBe(5);
  });

  it("mixed accepted and rejected events: the rejected one is parked, nothing is applied twice", async () => {
    const h = await boot(base());
    await h.learner.loadLearnerStates("u1");
    const s1 = sessionOf("n1", "n2");
    const events = await h.telemetry.queueSessionSync(s1.session, s1.result);
    const refused = events.find((e) => e.event_type === "problem_attempt") as { event_id: string };
    h.apiPost.mockImplementation(async (path: string, body: { events: Array<Record<string, unknown>> }) => {
      const ts = body.events.find((e) => e.event_type === "session_end") as { metadata: { technique_states?: Record<string, TechniqueState> } };
      if (ts?.metadata.technique_states) h.server.states = { ...h.server.states, ...ts.metadata.technique_states };
      return { accepted: body.events.length - 1, rejected: [{ event_id: refused.event_id, index: 0, reason: "client_timestamp: out of range" }] };
    });
    expect(await h.telemetry.sendSyncBatch(events)).toBe("synced");
    const rows = await h.db.eventQueue.toArray();
    expect(rows.map((r) => r.status)).toEqual(["parked"]);
    const states = await h.learner.loadLearnerStates("u1");
    expect(states?.Fractions.totalAttempts).toBe(5); // the snapshot already carried the session once; the parked event is not replayed on top
  });
});
