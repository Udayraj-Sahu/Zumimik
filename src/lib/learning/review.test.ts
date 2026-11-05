import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSinking, freshState, processAttempt, type SessionLogEntry, type TechniqueState } from "@vmsg/psychometrics";
import { addMockSinking, applySessionToSinking, orderPoolsForReview, reviewItems, reviewQueue, weightsFor, withDecayEntries } from "./review";
import { planAdaptiveSession } from "./session-plan";
import { reviewReason } from "@/components/adaptive/adaptive-engine-section";

const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const DAY = 86_400_000;

function practised(skill: string, results: boolean[], lastAt: number): TechniqueState {
  let s = freshState(skill);
  const start = lastAt - results.length * 1000;
  results.forEach((correct, i) => {
    s = processAttempt(s, { correct, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}-${i}`, at: start + i * 1000 });
  });
  return s;
}
const entry = (skill: string, correct: boolean): SessionLogEntry => ({ skill, attempt: { correct, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}-${Math.random()}`, at: NOW } });

describe("review entries follow the learner's real outcomes", () => {
  it("a wrong answer creates an entry at the engine's start priority, a repeat raises it to the cap", () => {
    let book = applySessionToSinking({}, [entry("A", false)], {});
    expect(book.A).toMatchObject({ decayPriority: 0.8, triggeredBy: "session_wrong", consecutiveErrors: 1 });
    book = applySessionToSinking(book, [entry("A", false)], {});
    expect(book.A.decayPriority).toBeCloseTo(0.9, 10);
    book = applySessionToSinking(book, [entry("A", false), entry("A", false)], {});
    expect(book.A.decayPriority).toBeCloseTo(0.95, 10); // capped
    expect(book.A.totalErrors).toBe(4);
  });

  it("correct answers add nothing; the input book is not mutated", () => {
    const book = { A: createSinking("A", "session_wrong") };
    const next = applySessionToSinking(book, [entry("A", true), entry("B", true)], {});
    expect(next).toEqual(book);
    expect(next).not.toBe(book);
    expect(Object.keys(applySessionToSinking({}, [entry("B", true)], {}))).toEqual([]);
  });

  it("a technique the engine now calls fluid has recovered and leaves; one that is not fluid stays", () => {
    const fluid = practised("A", Array(30).fill(true), NOW);
    expect(fluid.state).toBe("fluid");
    const book = { A: createSinking("A", "session_wrong"), B: createSinking("B", "session_wrong") };
    const next = applySessionToSinking(book, [], { A: fluid, B: practised("B", [false, false, false, false], NOW) });
    expect(Object.keys(next)).toEqual(["B"]);
  });

  it("with no states (history unknown) nothing is resolved", () => {
    const book = { A: createSinking("A", "session_wrong") };
    expect(applySessionToSinking(book, [], null)).toEqual(book);
  });

  it("a mock's deferred weak skills are queued, 'unclassified' is ignored, an existing entry is raised", () => {
    const book = addMockSinking({ A: createSinking("A", "session_wrong") }, ["A", "B", "unclassified", "B"]);
    expect(book.A.decayPriority).toBeCloseTo(0.9, 10);
    expect(book.B).toMatchObject({ decayPriority: 0.8, triggeredBy: "mock_wrong_answer" });
    expect(book.unclassified).toBeUndefined();
  });
});

describe("the seven-day cliff and the queue", () => {
  it("a fluid technique idle past 7 days is queued as 'decay'; a recent one is not", () => {
    const states = { Old: practised("Old", Array(30).fill(true), NOW - 10 * DAY), Recent: practised("Recent", Array(30).fill(true), NOW - 3 * DAY) };
    const book = withDecayEntries({}, states, NOW);
    expect(book.Old).toMatchObject({ triggeredBy: "decay", decayPriority: 0.8 });
    expect(book.Recent).toBeUndefined();
    const kept = withDecayEntries({ Old: createSinking("Old", "session_wrong") }, states, NOW);
    expect(kept.Old.triggeredBy).toBe("session_wrong"); // an existing entry wins
  });

  it("the queue is the engine's: priority above 0.7, highest first, at most five, only servable skills", () => {
    const book = Object.fromEntries(["a", "b", "c", "d", "e", "f", "g"].map((s, i) => [s, { ...createSinking(s, "session_wrong"), decayPriority: 0.71 + i * 0.03 }]));
    book.low = { ...createSinking("low", "session_wrong"), decayPriority: 0.7 };
    const q = reviewQueue(book, new Set(["a", "b", "c", "d", "e", "f", "low"]));
    expect(q.map((x) => x.techniqueId)).toEqual(["f", "e", "d", "c", "b"]); // g is not servable, low is not above 0.7
  });

  it("explains each item in plain terms", () => {
    const states = { Old: practised("Old", Array(30).fill(true), NOW - 10 * DAY) };
    const items = reviewItems([createSinking("Old", "decay"), createSinking("X", "session_wrong")], states, NOW);
    expect(items[0]).toMatchObject({ skill: "Old", reason: "decay", daysIdle: 10 });
    expect(reviewReason(items[0])).toBe("Not practised for 10 days");
    expect(reviewReason(items[1])).toBe("Worth another go");
  });
});

describe("daily weights", () => {
  it("are normalised to 1, and a weak or lapsed technique outweighs a mastered one", () => {
    const states = { Strong: practised("Strong", Array(30).fill(true), NOW), Weak: practised("Weak", [false, false, true, false], NOW), Lapsed: practised("Lapsed", Array(30).fill(true), NOW - 12 * DAY) };
    const w = weightsFor(states, [createSinking("Weak", "session_wrong")], NOW);
    expect([...w.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w.get("Weak")!).toBeGreaterThan(w.get("Strong")!);
    expect(w.get("Lapsed")!).toBeGreaterThan(w.get("Strong")!);
  });
});

describe("the scheduler decides which techniques are served first", () => {
  const catalog = ["A", "F1", "F2", "W", "N"].map((skill) => ({ skill, parents: [] as string[], servable: 5 }));
  const states = () => ({
    A: practised("A", Array(30).fill(true), NOW - DAY),                    // fluid
    F1: practised("F1", [true, true, true, true, true, true], NOW - DAY),    // fragile
    F2: practised("F2", [true, true, true, true, true, true], NOW - DAY),    // fragile
    W: practised("W", [false, false, false, false], NOW - DAY),              // failing (the engine places it in the frontier pool)
  });

  it("orders the pools: queued techniques lead the sinking pool and leave the others", () => {
    const pools = { fluid: ["A"], fragile: ["F1", "F2"], frontier: ["W", "N"] };
    const out = orderPoolsForReview(pools, [createSinking("W", "session_wrong")], new Map([["F2", 0.5], ["F1", 0.1]]));
    expect(out.fragile).toEqual(["W", "F2", "F1"]); // queue first, then the rest by weight
    expect(out.frontier).toEqual(["N"]);
    expect(orderPoolsForReview(pools, [createSinking("ghost", "manual")], new Map()).fragile).toEqual(["F1", "F2"]); // a skill no pool knows is never drawn
  });

  it("changes the real plan: the failing technique is drawn for the review slots", () => {
    const base = planAdaptiveSession({ states: states(), catalog, age: 20, size: 10, now: NOW });
    expect(base.slots.filter((s) => s.bucket === "sinking").map((s) => s.skill)).not.toContain("W");

    const withReview = planAdaptiveSession({ states: states(), catalog, age: 20, size: 10, now: NOW, review: { book: { W: createSinking("W", "session_wrong") } } });
    const sinking = withReview.slots.filter((s) => s.bucket === "sinking");
    expect(sinking[0].skill).toBe("W"); // the engine's own round-robin now starts at the queued technique
    expect(withReview.slots.reduce((n, s) => n + s.n, 0)).toBe(10); // the engine's allocation is unchanged
    expect(withReview.composed.allocation).toEqual(base.composed.allocation);
    expect(withReview.slots.filter((s) => s.skill === "W").every((s) => s.bucket === "sinking")).toBe(true); // not also offered as new material
  });

  it("a decayed technique is pulled in without any stored entry", () => {
    const s = { ...states(), Old: practised("Old", Array(30).fill(true), NOW - 12 * DAY) };
    const cat = [...catalog, { skill: "Old", parents: [] as string[], servable: 5 }];
    const plan = planAdaptiveSession({ states: s, catalog: cat, age: 20, size: 10, now: NOW, review: { book: {} } });
    expect(plan.pools.fragile[0]).toBe("Old");
  });
});

describe("a finished session updates the stored book and the next request uses it", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  async function setup() {
    vi.doMock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage }));
    const snapshot = { technique_states: { Fractions: practised("Fractions", [true, true, true, true, true, true], NOW - DAY), Decimals: practised("Decimals", [true, true, true, true, true, true], NOW - DAY) }, as_of: NOW - DAY };
    const apiGet = vi.fn(async (path: string) => {
      if (path === "/practice/mastery") return snapshot;
      if (path === "/practice/catalog") return { skills: ["Fractions", "Decimals"].map((skill) => ({ skill, parents: [], servable: 9 })) };
      throw new Error("unexpected " + path);
    });
    const dupes = [1, 1, 2].map((n) => ({ source: "tier1_static", template_id: `t${n}`, question_text: "q", difficulty: 2, skill: "Fractions", technique: null, topic: null, sub_topic: null, trust: "trusted", feeds_mastery: true, answer_check: "client_extract", expected_answer: 1 }));
    const apiPost = vi.fn(async () => ({ items: dupes, summary: { requested: 10, served: 3 } }));
    vi.doMock("@/services/api", () => ({ apiGet, apiPost }));
    const telemetry = await import("@/services/telemetry");
    const practice = await import("@/services/practice");
    const learner = await import("@/services/learner");
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1" } as never });
    return { telemetry, practice, learner, apiPost };
  }

  const q = (id: string) => ({ id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId: "Fractions", feedsMastery: true, trustStatus: "trusted" as const, difficulty: 3 });
  const wrong = (id: string, at: number) => ({ questionId: id, selectedIndex: 0, correct: false as const, timeSpent: 4, answeredAt: at });

  it("wrong answers raise the entry session after session, and the next plan reviews it", async () => {
    const { telemetry, practice, learner, apiPost } = await setup();
    const session = { topic: "Fractions", questions: [q("n1"), q("n2")] };
    const result = (ids: string[]) => ({ answers: ids.map((id, i) => wrong(id, Date.now() - 20_000 + i * 1000)), score: 0, total: ids.length, accuracy: 0, totalTimeSpent: 8, xpEarned: 0 });
    await telemetry.buildSessionSyncEvents(session, result(["n1", "n2"]));
    expect(learner.loadSinkingBook("u1").Fractions.decayPriority).toBeCloseTo(0.8 + 0.1, 5); // two wrong answers in one session: created, then raised
    await telemetry.buildSessionSyncEvents({ topic: "Fractions", questions: [q("n3")] }, result(["n3"]));
    expect(learner.loadSinkingBook("u1").Fractions.decayPriority).toBeGreaterThanOrEqual(0.95 - 1e-9);

    await practice.getPracticeSession(practice.ADAPTIVE_MIX_TOPIC, 10, "Adaptive");
    const slots = (apiPost.mock.calls[0] as unknown as [string, { slots: Array<{ skill: string; bucket: string }> }])[1].slots;
    expect(slots[0]).toMatchObject({ skill: "Fractions" }); // an engine-placed slot, ordered by the review queue
  });

  it("the same question is never served twice in one session", async () => {
    const { practice } = await setup();
    const session = await practice.getPracticeSession("Fractions", 10, "Adaptive");
    const ids = session.questions.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(practice.uniqueItems([{ template_id: "a" }, { template_id: "a" }, { template_id: "b" }]).map((x) => x.template_id)).toEqual(["a", "b"]);
  });

  it("urgency only comes from a reliable exam date", async () => {
    const { practice } = await setup();
    expect(practice.daysToExam(undefined, NOW)).toBeUndefined();
    expect(practice.daysToExam("not a date", NOW)).toBeUndefined();
    expect(practice.daysToExam("2026-11-01", NOW)).toBeUndefined(); // already past
    expect(practice.daysToExam("2026-11-16", NOW)).toBe(10);
  });
});
