import {
  ansBaselineMs,
  calibrationPriors,
  routePath,
  targetTimeSeconds,
  type ActivePath,
  type WarmupOutcome,
  type WarmupResult,
} from "@vmsg/psychometrics";
import { DEFAULT_AGE, type LearnerStates } from "./learner-state";

/**
 * Cold-start calibration on top of the vendored engine. The numbers (priors 0.80 / 0.50 / 0.20, the median response time, the three
 * learning paths) all come from calibrationPriors, ansBaselineMs and routePath; this file only turns what the learner did in the
 * warm-up into the engine's inputs, and decides whether a warm-up is needed at all.
 */

/** The warm-up is six problems (VMSG:297; ENGINE_TRANCHE_DESIGN W1-8). */
export const WARMUP_SIZE = 6;

export type WarmupAttempt = {
  /** The canonical :Skill id the problem exercises. */
  techniqueId: string;
  problemId: string;
  correct: boolean;
  /** The learner opened the hint before answering. */
  hinted: boolean;
  responseTimeMs: number;
};

/**
 * One warm-up answer as the engine's outcome:
 *   - wrong -> "wrong" (a hint does not turn a wrong answer into partial credit);
 *   - correct, but with the hint or slower than the engine's own target time for this age -> "hint_or_slow";
 *   - correct on the first try within the target time -> "correct_first_try".
 * "Slow" is the engine's targetTimeSeconds(age), not a number chosen here.
 */
export function warmupOutcome(attempt: Pick<WarmupAttempt, "correct" | "hinted" | "responseTimeMs">, age: number = DEFAULT_AGE): WarmupOutcome {
  if (!attempt.correct) return "wrong";
  if (attempt.hinted || attempt.responseTimeMs > targetTimeSeconds(age) * 1000) return "hint_or_slow";
  return "correct_first_try";
}

export type CalibrationStatus = "completed" | "partial" | "skipped";

/** What is stored on the device for this learner once a warm-up was completed, partly done or skipped. */
export type CalibrationRecord = {
  status: CalibrationStatus;
  updatedAt: number;
  /** Per-technique starting P(L), exactly as calibrationPriors returned them. Empty when skipped. */
  priors: Record<string, number>;
  /** Median warm-up response time (ansBaselineMs); 0 when there was nothing to measure. */
  ansBaselineMs: number;
  /** The learning path routePath chose, or null if it was not decided (skipped). */
  activePath: ActivePath | null;
  answered: number;
};

export type WarmupQuestion = {
  id: string;
  skillId: string;
  text: string;
  hint?: string;
  expectedAnswer: number | null;
  answerCheck: string;
  difficulty?: number;
};

export type WarmupDraft = {
  /** The six questions fixed at the start, so a restart resumes the same warm-up. */
  questions: WarmupQuestion[];
  attempts: WarmupAttempt[];
  startedAt: number;
};

/** Exams that give an unambiguous exam-preparation signal for routePath. The learner's goal text is never parsed for anything else. */
const EXAM_IDS = new Set(["cat", "gmat", "gre"]);

export function routeFor(targetExam: string | null | undefined): ActivePath {
  const exam = (targetExam ?? "").toLowerCase();
  return routePath({ targetExam: EXAM_IDS.has(exam) ? exam : null });
}

export function summarise(
  attempts: ReadonlyArray<WarmupAttempt>,
  targetExam: string | null | undefined,
  age: number = DEFAULT_AGE,
  status: CalibrationStatus = "completed",
  now = Date.now(),
): CalibrationRecord {
  const results: WarmupResult[] = attempts.map((a) => ({ techniqueId: a.techniqueId, outcome: warmupOutcome(a, age), responseTimeMs: a.responseTimeMs }));
  const priors = calibrationPriors(results);
  return {
    status,
    updatedAt: now,
    priors: Object.fromEntries(priors),
    ansBaselineMs: ansBaselineMs(attempts.map((a) => a.responseTimeMs)),
    activePath: attempts.length > 0 ? routeFor(targetExam) : null,
    answered: attempts.length,
  };
}

/**
 * Does this learner need a warm-up? Only a learner the server has NO history for: a known state for any technique means they are
 * not new, and an established learner's mastery is never overwritten by fresh priors (the engine also ignores a prior for a skill
 * that already has state). Unknown history (null) means we cannot tell, so no warm-up is offered.
 */
export function needsCalibration(record: CalibrationRecord | null, states: LearnerStates | null): boolean {
  if (record) return false;
  if (states === null) return false;
  return Object.keys(states).length === 0;
}
