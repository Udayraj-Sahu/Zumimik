import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshThetaState, refitTheta, targetDifficulty, THETA_MAX, THETA_MIN, type ThetaState } from "@vmsg/psychometrics";
import { applyAbility, itemParams, restoreTheta, targetLevel, thetaForRequest } from "./ability";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

const q = (id: string, extra: Partial<Question> = {}): Question => ({
  id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId: "Fractions", feedsMastery: true, trustStatus: "trusted", difficulty: 3, ...extra,
});
const a = (questionId: string, correct: boolean | null): SprintAnswer => ({ questionId, selectedIndex: 0, correct, timeSpent: 5 });
const fresh = () => freshThetaState("quant");

describe("ability (IRT 2PL-lite)", () => {
  it("starts at theta 0 with SE 1 and sends nothing until something is scored", () => {
    const s = fresh();
    expect(s).toMatchObject({ theta: 0, se: 1, n: 0 });
    expect(thetaForRequest(s)).toBeUndefined();
    expect(targetLevel(s)).toBeNull();
  });

  it("a correct answer raises theta and an incorrect one lowers it", () => {
    const up = applyAbility(fresh(), [q("1")], [a("1", true)]);
    const down = applyAbility(fresh(), [q("1")], [a("1", false)]);
    expect(up.theta).toBeGreaterThan(0);
    expect(down.theta).toBeLessThan(0);
    expect(up.n).toBe(1);
  });

  it("matches the engine's published fixture: 3 correct at b = 0 gives 0.8797 / 0.7853", () => {
    const qs = [q("1", { irt: { a: 1, b: 0, source: "seed" } }), q("2", { irt: { a: 1, b: 0, source: "seed" } }), q("3", { irt: { a: 1, b: 0, source: "seed" } })];
    const s = applyAbility(fresh(), qs, qs.map((x) => a(x.id, true)));
    expect(s.theta).toBeCloseTo(0.8797, 3);
    expect(s.se).toBeCloseTo(0.7853, 3);
  });

  it("uses the server's calibrated parameters when present and the engine's seed when they are missing", () => {
    expect(itemParams(q("1", { irt: { a: 1.8, b: 0.4, source: "calibrated" } }))).toEqual({ a: 1.8, b: 0.4 });
    expect(itemParams(q("1", { irt: undefined, difficulty: 5 }))).toEqual({ a: 1, b: 2 }); // seed: b = difficulty - 3
    expect(itemParams(q("1", { irt: { a: -1, b: 0, source: "x" }, difficulty: 1 }))).toEqual({ a: 1, b: -2 }); // an unusable a falls back to the seed
    expect(itemParams(q("1", { irt: undefined, difficulty: undefined }))).toBeNull(); // an unknown item is not treated as average
    const none = fresh();
    expect(applyAbility(none, [q("1", { irt: undefined, difficulty: undefined })], [a("1", true)])).toBe(none);
  });

  it("only the first scored attempt per problem counts", () => {
    const once = applyAbility(fresh(), [q("1")], [a("1", true)]);
    const again = applyAbility(once, [q("1")], [a("1", true)]);
    expect(again).toBe(once);
    expect(applyAbility(fresh(), [q("1"), q("1")], [a("1", true), a("1", true)]).n).toBe(1);
  });

  it("deferred, unanswered, sandbox and no-mastery items never move theta", () => {
    const s = fresh();
    const qs = [q("d"), q("u"), q("s", { trustStatus: "sandbox" }), q("f", { feedsMastery: false }), q("n", { skillId: undefined })];
    const answers: SprintAnswer[] = [a("d", null), { questionId: "u", selectedIndex: -1, correct: false, timeSpent: 1 }, a("s", true), a("f", true), a("n", true)];
    expect(applyAbility(s, qs, answers)).toBe(s);
  });

  it("keeps theta inside [-3, 3] however long the streak", () => {
    const qs = Array.from({ length: 40 }, (_, i) => q(`w${i}`, { irt: { a: 2.5, b: 3, source: "seed" } }));
    const low = applyAbility(fresh(), qs, qs.map((x) => a(x.id, false)));
    const hiQs = Array.from({ length: 40 }, (_, i) => q(`h${i}`, { irt: { a: 2.5, b: -3, source: "seed" } }));
    const high = applyAbility(fresh(), hiQs, hiQs.map((x) => a(x.id, true)));
    expect(low.theta).toBeGreaterThanOrEqual(THETA_MIN);
    expect(high.theta).toBeLessThanOrEqual(THETA_MAX);
    expect(thetaForRequest(high)).toBeLessThanOrEqual(THETA_MAX);
  });

  it("aims difficulty at P(correct) = 0.7 and a stronger learner is aimed higher", () => {
    expect(targetDifficulty(0)).toBe(2); // d* = round(3 + 0 - ln(7/3))
    const strong = applyAbility(fresh(), [q("1"), q("2"), q("3")], [a("1", true), a("2", true), a("3", true)]);
    const weak = applyAbility(fresh(), [q("1"), q("2"), q("3")], [a("1", false), a("2", false), a("3", false)]);
    expect(targetLevel(strong)!).toBeGreaterThanOrEqual(targetLevel(weak)!);
  });

  it("is rebuilt from the stored responses, so a stale or tampered theta cannot survive a restore", () => {
    const real = applyAbility(fresh(), [q("1"), q("2")], [a("1", true), a("2", false)]);
    const tampered = { ...real, theta: 2.9, se: 0.01, n: 99 };
    const restored = restoreTheta(JSON.parse(JSON.stringify(tampered)));
    expect(restored.theta).toBeCloseTo(refitTheta(real.responses).theta, 10);
    expect(restored.n).toBe(2);
    expect(restoreTheta(null)).toEqual(fresh());
    expect(restoreTheta({ responses: [{ problemId: "x", a: -1, b: 0, correct: true }, { nope: 1 }] })).toEqual(fresh());
  });
});

describe("ability is persisted and steers the next session", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  async function setup() {
    vi.doMock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage }));
    const apiGet = vi.fn(async (path: string) => {
      if (path === "/practice/mastery") return { technique_states: {}, as_of: null };
      if (path === "/practice/catalog") return { skills: [{ skill: "Fractions", parents: [], servable: 9 }] };
      throw new Error("unexpected " + path);
    });
    const apiPost = vi.fn(async () => ({ items: [], summary: { requested: 5, served: 0 } }));
    vi.doMock("@/services/api", () => ({ apiGet, apiPost }));
    const telemetry = await import("@/services/telemetry");
    const practice = await import("@/services/practice");
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1" } as never });
    return { telemetry, practice, apiPost };
  }

  const session = { topic: "Fractions", questions: [q("n1"), q("n2"), q("n3")] };
  const result = { answers: [a("n1", true), a("n2", true), a("n3", true)], score: 3, total: 3, accuracy: 100, totalTimeSpent: 15, xpEarned: 0 };

  it("sends theta on session_end, keeps it across a restart, and uses it in the next request", async () => {
    const { telemetry, practice, apiPost } = await setup();
    // First request: nothing scored yet, so no theta is sent.
    await practice.getPracticeSession("Fractions", 5, "Adaptive");
    expect((apiPost.mock.calls[0] as unknown[])[1]).not.toHaveProperty("theta");

    const events = await telemetry.buildSessionSyncEvents(session, result);
    const end = events[events.length - 1] as { metadata: { theta?: { quant: ThetaState } } };
    expect(end.metadata.theta?.quant.n).toBe(3);
    expect(end.metadata.theta?.quant.theta).toBeGreaterThan(0);

    // "Restart": a fresh module graph reads the stored estimate back.
    vi.resetModules();
    const again = await setup();
    await again.practice.getPracticeSession("Fractions", 5, "Adaptive");
    const body = (again.apiPost.mock.calls[0] as unknown[])[1] as { theta?: number };
    expect(body.theta).toBeCloseTo(end.metadata.theta!.quant.theta, 3);
  });

  it("an explicit level wins over the learner's own estimate", async () => {
    const { telemetry, practice, apiPost } = await setup();
    await telemetry.buildSessionSyncEvents(session, result);
    await practice.getPracticeSession("Fractions", 5, "Beginner", undefined, 2);
    const body = (apiPost.mock.calls[0] as unknown[])[1] as { theta?: number };
    expect(body.theta).toBe(practice.levelToTheta(2));
  });

  it("theta is still recorded when the mastery snapshot cannot be read", async () => {
    vi.doMock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage }));
    vi.doMock("@/services/api", () => ({ apiGet: vi.fn(async () => { throw new Error("offline"); }), apiPost: vi.fn() }));
    const telemetry = await import("@/services/telemetry");
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.setState({ user: { id: "u1" } as never });
    const events = await telemetry.buildSessionSyncEvents(session, result);
    const end = events[events.length - 1] as { metadata: Record<string, unknown> };
    expect(end.metadata.technique_states).toBeUndefined(); // history unknown: not overwritten
    expect(end.metadata.theta).toBeDefined(); // ability does not depend on it
  });
});
