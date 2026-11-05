import { describe, expect, it } from "vitest";
import { freshState, processAttempt, targetTimeSeconds } from "@vmsg/psychometrics";
import { needsCalibration, routeFor, summarise, warmupOutcome, WARMUP_SIZE, type CalibrationRecord, type WarmupAttempt } from "./calibration";
import { applySession, buildSessionLog } from "./learner-state";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const att = (techniqueId: string, over: Partial<WarmupAttempt> = {}): WarmupAttempt => ({ techniqueId, problemId: `${techniqueId}-p`, correct: true, hinted: false, responseTimeMs: 4000, ...over });

describe("warm-up outcomes use the engine's categories", () => {
  it("wrong stays wrong even with a hint", () => {
    expect(warmupOutcome({ correct: false, hinted: false, responseTimeMs: 1000 })).toBe("wrong");
    expect(warmupOutcome({ correct: false, hinted: true, responseTimeMs: 1000 })).toBe("wrong");
  });
  it("correct on the first try within the engine's target time", () => {
    expect(warmupOutcome({ correct: true, hinted: false, responseTimeMs: 5000 }, 20)).toBe("correct_first_try");
  });
  it("a hint, or being slower than the engine's own target time for the age, is hint_or_slow", () => {
    expect(warmupOutcome({ correct: true, hinted: true, responseTimeMs: 1000 })).toBe("hint_or_slow");
    const target = targetTimeSeconds(20) * 1000;
    expect(warmupOutcome({ correct: true, hinted: false, responseTimeMs: target }, 20)).toBe("correct_first_try"); // exactly at the target is on time
    expect(warmupOutcome({ correct: true, hinted: false, responseTimeMs: target + 1 }, 20)).toBe("hint_or_slow");
    expect(targetTimeSeconds(8)).toBeGreaterThan(targetTimeSeconds(20)); // a younger learner gets more time: the table is the engine's
  });
});

describe("summarising a warm-up", () => {
  it("six problems is the warm-up size", () => expect(WARMUP_SIZE).toBe(6));

  it("per-technique priors are the engine's means; the baseline is the median response time", () => {
    const rec = summarise(
      [att("A"), att("A", { correct: false }), att("B", { hinted: true }), att("C", { responseTimeMs: 2000 }), att("C", { responseTimeMs: 10_000 }), att("D", { responseTimeMs: 6000 })],
      "cat", 20, "completed", NOW,
    );
    expect(rec.priors.A).toBeCloseTo((0.8 + 0.2) / 2, 10);
    expect(rec.priors.B).toBeCloseTo(0.5, 10);
    expect(rec.priors.C).toBeCloseTo(0.8, 10);
    expect(rec.ansBaselineMs).toBe(4000); // median of 4000, 4000, 4000, 2000, 10000, 6000 = (4000 + 4000) / 2
    expect(rec).toMatchObject({ status: "completed", answered: 6, updatedAt: NOW });
  });

  it("chooses the learning path with the engine's routePath", () => {
    expect(routeFor("cat")).toBe("exam_prep");
    expect(routeFor("GMAT")).toBe("exam_prep");
    expect(routeFor("")).toBe("core_math_vedic");
    expect(routeFor(null)).toBe("core_math_vedic");
    // vedic-math is not an exam, and no familiarity is collected, so there is no signal for vedic_standalone
    expect(routeFor("vedic-math")).toBe("core_math_vedic");
  });

  it("a skipped warm-up has no priors and no path (the engine's defaults apply)", () => {
    const rec = summarise([], "cat", 20, "partial", NOW);
    expect(rec.priors).toEqual({});
    expect(rec.activePath).toBeNull();
    expect(rec.ansBaselineMs).toBe(0);
  });
});

describe("who needs a warm-up", () => {
  const done: CalibrationRecord = { status: "completed", updatedAt: NOW, priors: {}, ansBaselineMs: 0, activePath: null, answered: 6 };
  it("only a learner the server knows nothing about, who never finished or skipped it", () => {
    expect(needsCalibration(null, {})).toBe(true);
    expect(needsCalibration(done, {})).toBe(false);
    expect(needsCalibration({ ...done, status: "skipped" }, {})).toBe(false);
    expect(needsCalibration(null, { Fractions: freshState("Fractions") })).toBe(false); // an established learner
    expect(needsCalibration(null, null)).toBe(false); // history unknown: cannot tell, so do not offer
  });
});

describe("priors reach the engine only for skills without history", () => {
  const q = (id: string, skillId: string): Question => ({ id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId, feedsMastery: true, trustStatus: "trusted", difficulty: 3 });
  const ans = (questionId: string, correct: boolean): SprintAnswer => ({ questionId, selectedIndex: 0, correct, timeSpent: 4, answeredAt: NOW - 10_000 });

  it("seeds a new skill with its prior and leaves an established skill alone", () => {
    let established = freshState("Old");
    for (let i = 0; i < 8; i++) established = processAttempt(established, { correct: true, timeSpentSeconds: 3, targetTimeSeconds: 10, problemId: `o${i}`, at: NOW - 86_400_000 + i });
    const base = { Old: established };
    const log = buildSessionLog([q("a", "Old"), q("b", "New")], [ans("a", true), ans("b", true)], { endedAt: NOW });
    const priors = new Map([["Old", 0.2], ["New", 0.8]]);
    const withPriors = applySession(base, log, NOW, priors)!;
    const without = applySession(base, log, NOW)!;
    expect(withPriors.Old.pLearned).toBeCloseTo(without.Old.pLearned, 12); // not overwritten by fresh calibration
    expect(withPriors.Old.totalAttempts).toBe(9);
    const seeded = processAttempt(freshState("New", 0.8), { correct: true, timeSpentSeconds: 4, targetTimeSeconds: 30, problemId: "b", at: log[1].attempt.at });
    expect(withPriors.New.pLearned).toBeCloseTo(seeded.pLearned, 10);
    expect(withPriors.New.pLearned).toBeGreaterThan(without.New.pLearned); // a strong warm-up starts higher than the default prior
  });
});
