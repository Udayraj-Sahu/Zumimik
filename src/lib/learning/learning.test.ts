import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt, type TechniqueState } from "@vmsg/psychometrics";
import { applySession, attemptEligibility, ageFromDob, attemptTimes, buildSessionLog, hydrateLearner } from "./learner-state";
import { bucketFor, planAdaptiveSession } from "./session-plan";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);
const DAY = 86_400_000;

function practised(skill: string, results: boolean[], startAt = NOW - 2 * DAY): TechniqueState {
  let s = freshState(skill);
  results.forEach((correct, i) => {
    s = processAttempt(s, { correct, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}-${i}`, at: startAt + i * 1000 });
  });
  return s;
}

const q = (id: string, extra: Partial<Question> = {}): Question => ({
  id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId: "Fractions", feedsMastery: true, trustStatus: "trusted", ...extra,
});
const a = (questionId: string, correct: boolean | null, timeSpent = 5): SprintAnswer => ({ questionId, selectedIndex: 0, correct, timeSpent });

describe("hydration restores every field of the persisted state", () => {
  it("keeps distinct ids, recent history, CUSUM evidence, practice time and attempts", () => {
    const stored = practised("Fractions", [true, true, false, true, true, true]);
    // The server returns the entry exactly as it was stored: a JSON round trip.
    const snapshot = { technique_states: JSON.parse(JSON.stringify({ Fractions: stored })), as_of: NOW - DAY };
    const hydrated = hydrateLearner(snapshot, NOW - 2 * DAY + 10_000).Fractions;
    expect(hydrated.distinctCorrectIds.sort()).toEqual(stored.distinctCorrectIds.sort());
    expect(hydrated.recent).toEqual(stored.recent);
    expect(hydrated.evidenceNats).toBeCloseTo(stored.evidenceNats, 10);
    expect(hydrated.lastPracticedAt).toBe(stored.lastPracticedAt);
    expect(hydrated.totalAttempts).toBe(6);
    expect(hydrated.engineVersion).toBe(stored.engineVersion);
  });

  it("a legacy snapshot (no engine version) hydrates safely instead of throwing", () => {
    const snapshot = { technique_states: { Old: { pLearned: 0.9, state: "fluid", masteryScore: 90 } }, as_of: NOW - DAY };
    const states = hydrateLearner(snapshot, NOW);
    expect(states.Old).toBeDefined();
    expect(states.Old.state).not.toBe("fluid"); // it cannot show the evidence the current gate asks for
  });

  it("an empty or missing snapshot gives no states, not an error", () => {
    expect(hydrateLearner(null, NOW)).toEqual({});
    expect(hydrateLearner({ technique_states: null }, NOW)).toEqual({});
  });
});

describe("which answers may move mastery", () => {
  it("rejects unanswered, deferred, sandbox, no-mastery and skill-less items", () => {
    const ok = a("x", true);
    expect(attemptEligibility(q("x"), ok)).toBeNull();
    expect(attemptEligibility(q("x"), { selectedIndex: -1, correct: false })).toBe("unanswered");
    expect(attemptEligibility(q("x"), a("x", null))).toBe("deferred");
    expect(attemptEligibility(q("x", { trustStatus: "sandbox" }), ok)).toBe("sandbox");
    expect(attemptEligibility(q("x", { feedsMastery: false }), ok)).toBe("no_mastery");
    expect(attemptEligibility(q("x", { skillId: undefined }), ok)).toBe("no_skill");
    expect(attemptEligibility(undefined, ok)).toBe("no_skill");
  });

  it("builds an ordered log with real times ending at the session end, one entry per problem", () => {
    const questions = [q("1"), q("2"), q("2b", { id: "1" }), q("3", { trustStatus: "sandbox" })];
    const answers = [a("1", true, 4), a("2", false, 6), a("1", true, 5), a("3", true, 3)];
    const log = buildSessionLog(questions, answers, { endedAt: NOW, age: 20 });
    expect(log.map((l) => l.attempt.problemId)).toEqual(["1", "2"]); // repeat of 1 and the sandbox item are dropped
    expect(log.every((l) => l.skill === "Fractions")).toBe(true);
    const times = log.map((l) => l.attempt.at);
    expect(times[0]).toBeLessThan(times[1]);
    expect(times[1]).toBeLessThanOrEqual(NOW);
    expect(attemptTimes(answers, NOW).get("1")).toBe(times[0]);
  });
});

describe("replaying a session over the persisted history", () => {
  it("adds to the history instead of replacing it, and never starts a returning learner blank", () => {
    const base = hydrateLearner({ technique_states: { Fractions: practised("Fractions", [true, true, true, true]) }, as_of: NOW - DAY }, NOW);
    const log = buildSessionLog([q("n1"), q("n2")], [a("n1", true), a("n2", true)], { endedAt: NOW });
    const next = applySession(base, log, NOW);
    expect(next?.Fractions.totalAttempts).toBe(6);
    expect(next?.Fractions.distinctCorrectIds).toEqual(expect.arrayContaining(["Fractions-0", "n1", "n2"]));
    expect(next?.Fractions.pLearned).toBeGreaterThanOrEqual(base.Fractions.pLearned);
    expect(applySession(null, log, NOW)).toBeNull(); // unknown history: nothing is written
    expect(applySession(base, [], NOW)).toBe(base);
  });

  it("answering the same problem repeatedly does not satisfy the distinct-item requirement", () => {
    let s = freshState("Fractions");
    for (let i = 0; i < 10; i++) s = processAttempt(s, { correct: true, timeSpentSeconds: 2, targetTimeSeconds: 10, problemId: "same", at: NOW - 5000 + i });
    expect(s.distinctCorrectIds).toEqual(["same"]);
    expect(s.state).not.toBe("fluid");
  });
});

describe("the adaptive plan comes from the engine", () => {
  const catalog = [
    { skill: "A", parents: [] as string[], servable: 5 },
    { skill: "B", parents: ["A"], servable: 5 },
    { skill: "C", parents: [] as string[], servable: 5 },
    { skill: "D", parents: [] as string[], servable: 5 },
  ];
  const states = (): Record<string, TechniqueState> => ({
    A: practised("A", Array(30).fill(true)),               // fluid
    C: practised("C", [true, true, true, true, true, true]), // fragile (the engine holds a skill at fragile until the distinct-item and evidence gates are met)
    D: practised("D", [false, false, false, false]),       // fractured
  });

  it("splits a 10-question session 6 / 2 / 2 by default and uses every bucket", () => {
    const plan = planAdaptiveSession({ states: states(), catalog, age: 20, size: 10, now: NOW });
    expect(plan.composed.allocation).toEqual({ primary: 6, sinking: 2, frontier: 2 });
    expect(plan.slots.reduce((n, s) => n + s.n, 0)).toBe(10);
    expect(new Set(plan.slots.map((s) => s.bucket))).toEqual(new Set(["primary", "sinking", "frontier"]));
    // A practised skill carries the device's live P(L); a never-attempted one has none to send.
    for (const slot of plan.slots) {
      if (slot.skill in states()) expect(slot.p_learned).toBeGreaterThan(0);
      else expect(slot.p_learned).toBeUndefined();
    }
  });

  it("honours a different session size", () => {
    for (const size of [5, 15, 25]) {
      const plan = planAdaptiveSession({ states: states(), catalog, age: 20, size, now: NOW });
      expect(plan.slots.reduce((n, s) => n + s.n, 0)).toBe(size);
    }
  });

  it("a persona changes the allocation (the engine decides, nothing is hardcoded)", () => {
    const plan = planAdaptiveSession({ states: states(), catalog, age: 20, size: 20, now: NOW, persona: "SpeedDemon" });
    expect(plan.composed.allocation.primary).toBeGreaterThan(12);
  });

  it("keeps a skill whose prerequisite is not mastered off the frontier", () => {
    const plan = planAdaptiveSession({ states: { C: states().C }, catalog, age: 20, size: 10, now: NOW });
    expect(plan.pools.frontier).not.toContain("B"); // A is unattempted, so B is locked
    expect(plan.pools.frontier).toContain("A");
    const unlocked = planAdaptiveSession({ states: states(), catalog, age: 20, size: 10, now: NOW });
    expect(unlocked.pools.frontier).toContain("B"); // A is now fluid
  });

  it("redistributes when a pool is empty and never draws from it", () => {
    const plan = planAdaptiveSession({ states: { D: states().D }, catalog: [{ skill: "D", parents: [], servable: 3 }], age: 20, size: 10, now: NOW });
    expect(plan.slots.every((s) => s.bucket === "frontier")).toBe(true);
    expect(plan.slots.reduce((n, s) => n + s.n, 0)).toBe(10);
  });

  it("a chosen technique takes every slot, labelled with its own pool", () => {
    const plan = planAdaptiveSession({ states: states(), catalog, age: 20, size: 8, now: NOW, focusSkill: "C" });
    expect(plan.slots).toEqual([expect.objectContaining({ skill: "C", bucket: "sinking", n: 8 })]);
    expect(plan.focus).toEqual({ skill: "C", bucket: "sinking" });
    expect(bucketFor("Z", plan.pools)).toBe("frontier"); // never attempted
  });
});

describe("age from the onboarding date of birth", () => {
  it("counts whole years and rejects nonsense", () => {
    expect(ageFromDob({ day: 6, month: "November", year: 2010 }, NOW)).toBe(15);
    expect(ageFromDob({ day: 4, month: "November", year: 2010 }, NOW)).toBe(16);
    expect(ageFromDob({ day: 1, month: "Smarch", year: 2010 }, NOW)).toBeUndefined();
  });
});

describe("session sync carries the updated mastery", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  async function load(masteryResult: "ok" | "fail") {
    const snapshot = { technique_states: { Fractions: practised("Fractions", [true, true, true]) }, as_of: NOW - DAY };
    vi.doMock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage }));
    vi.doMock("@/services/api", () => ({
      apiGet: vi.fn(async (path: string) => {
        if (path === "/practice/mastery" && masteryResult === "ok") return snapshot;
        throw new Error("offline");
      }),
      apiPost: vi.fn(),
    }));
    const telemetry = await import("@/services/telemetry");
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1" } as never });
    return telemetry;
  }
  const session = { topic: "Fractions", questions: [q("n1"), q("n2")] };
  const result = { answers: [a("n1", true), a("n2", false)], score: 1, total: 2, accuracy: 50, totalTimeSpent: 10, xpEarned: 0 };

  it("attaches technique_states built on the persisted history", async () => {
    const { buildSessionSyncEvents } = await load("ok");
    const events = await buildSessionSyncEvents(session, result);
    const end = events[events.length - 1] as { event_type: string; metadata: { technique_states?: Record<string, TechniqueState> } };
    expect(end.event_type).toBe("session_end");
    expect(end.metadata.technique_states?.Fractions.totalAttempts).toBe(5);
    const attempts = events.filter((e) => e.event_type === "problem_attempt") as Array<{ client_timestamp: number }>;
    expect(attempts[0].client_timestamp).toBeLessThan(attempts[1].client_timestamp); // real, ordered times
  });

  it("attaches nothing when the persisted history cannot be read (it is never replaced by a blank rebuild)", async () => {
    const { buildSessionSyncEvents } = await load("fail");
    const events = await buildSessionSyncEvents(session, result);
    const end = events[events.length - 1] as { metadata: Record<string, unknown> };
    expect(end.metadata.technique_states).toBeUndefined();
    expect(events.filter((e) => e.event_type === "problem_attempt")).toHaveLength(2); // the attempts themselves still sync
  });
});

describe("attempt times: actual first, a labelled fallback, never out of order", () => {
  const base = (id: string, extra: Partial<SprintAnswer> = {}): SprintAnswer => ({ questionId: id, selectedIndex: 0, correct: true, timeSpent: 4, ...extra });
  const END = NOW;

  it("uses the time captured at submission and labels it actual", async () => {
    const { resolveAttemptTimes } = await import("./learner-state");
    const t = resolveAttemptTimes([base("a", { answeredAt: END - 20_000 }), base("b", { answeredAt: END - 9_000 })], END);
    expect([...t.values()]).toEqual([{ at: END - 20_000, source: "actual" }, { at: END - 9_000, source: "actual" }]);
  });

  it("falls back to a reconstructed time only for an answer without a usable one, and says so", async () => {
    const { resolveAttemptTimes } = await import("./learner-state");
    const t = resolveAttemptTimes(
      [base("a", { answeredAt: END - 20_000 }), base("legacy"), base("clock1970", { answeredAt: 5 }), base("future", { answeredAt: END + 30 * DAY })],
      END,
    );
    expect(t.get("a")?.source).toBe("actual");
    for (const id of ["legacy", "clock1970", "future"]) {
      expect(t.get(id)?.source).toBe("reconstructed");
      expect(t.get(id)!.at).toBeLessThanOrEqual(END);
      expect(t.get(id)!.at).toBeGreaterThan(END - 60_000);
    }
  });

  it("orders by when answers happened (a learner may jump between questions) and times never decrease", async () => {
    const { resolveAttemptTimes } = await import("./learner-state");
    const t = resolveAttemptTimes([base("q1", { answeredAt: END - 5_000 }), base("q2", { answeredAt: END - 15_000 })], END);
    expect([...t.keys()]).toEqual(["q2", "q1"]);
    // a clock that stepped back mid-session cannot reorder: the later answer is held at the previous time at the earliest
    const stepped = resolveAttemptTimes([base("a", { answeredAt: END - 10_000 }), base("b", { answeredAt: END - 10_000 - 3_600_000 })], END);
    const times = [...stepped.values()].map((x) => x.at);
    expect(times[1]).toBeGreaterThanOrEqual(times[0]);
  });

  it("BKT replay, IRT order and event stamps all follow the same resolved order", async () => {
    const { buildSessionLog } = await import("./learner-state");
    const { applyAbility } = await import("./ability");
    const { freshThetaState } = await import("@vmsg/psychometrics");
    const qs = [q("q1", { difficulty: 3 }), q("q2", { difficulty: 3 })];
    const answers = [base("q1", { answeredAt: END - 5_000 }), base("q2", { answeredAt: END - 15_000 })];
    const log = buildSessionLog(qs, answers, { endedAt: END });
    expect(log.map((l) => l.attempt.problemId)).toEqual(["q2", "q1"]);
    const theta = applyAbility(freshThetaState("quant"), qs, answers, { endedAt: END });
    expect(theta.responses.map((r) => r.problemId)).toEqual(["q2", "q1"]);
  });

  it("forgetting decay counts from the real last-practice time", () => {
    const old = practised("Fractions", [true, true, true, true, true, true], NOW - 10 * DAY);
    const fresh = hydrateLearner({ technique_states: { Fractions: old }, as_of: NOW }, NOW - 10 * DAY + 60_000).Fractions;
    const decayed = hydrateLearner({ technique_states: { Fractions: old }, as_of: NOW }, NOW).Fractions;
    expect(decayed.pLearned).toBeLessThan(fresh.pLearned);
    expect(decayed.decayedFrom).toBeDefined();
  });
});
