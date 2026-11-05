import {
  ageGroup,
  hydrateStates,
  rebuildStates,
  targetTimeSeconds,
  type MasterySnapshot,
  type SessionLogEntry,
  type TechniqueState,
} from "@vmsg/psychometrics";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

/**
 * The glue between a finished question list and the vendored psychometrics engine (src/vendor/psychometrics).
 * No BKT, state-machine or decay rule lives here: this file only decides WHICH attempts may reach the engine and
 * hands them over in order with their real times. The engine (processAttempt via rebuildStates) does the rest.
 */

export type LearnerStates = Record<string, TechniqueState>;

/** Used when the learner's age is unknown: an adult's target time (the engine's own table decides the number). */
export const DEFAULT_AGE = 18;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Whole years from the onboarding date of birth ({day, month name, year}); undefined if it is unusable. */
export function ageFromDob(dob: { day: number; month: string; year: number } | null | undefined, now = Date.now()): number | undefined {
  if (!dob) return undefined;
  const month = MONTHS.indexOf(String(dob.month).toLowerCase());
  if (month < 0 || !Number.isFinite(dob.year) || !Number.isFinite(dob.day)) return undefined;
  const today = new Date(now);
  let age = today.getFullYear() - dob.year;
  if (today.getMonth() < month || (today.getMonth() === month && today.getDate() < dob.day)) age -= 1;
  return age >= 3 && age <= 110 ? age : undefined;
}

export { ageGroup };

/**
 * Why an answer is, or is not, evidence of a technique. Order matters only for the reported reason.
 *   - unanswered / deferred (a server-graded item: `correct === null`) is not scored, so it cannot move mastery;
 *   - the item must carry the canonical :Skill id the server sent (`skillId`; never a topic or technique label, which are different vocabularies);
 *   - sandbox content is playable but must not move mastery (`feeds_mastery: false` / trustStatus "sandbox").
 */
export type IneligibleReason = "unanswered" | "deferred" | "no_skill" | "no_mastery" | "sandbox" | "duplicate";

export function attemptEligibility(
  question: Pick<Question, "id" | "skillId" | "feedsMastery" | "trustStatus"> | undefined,
  answer: Pick<SprintAnswer, "selectedIndex" | "answerText" | "correct">,
): IneligibleReason | null {
  if (answer.selectedIndex === -1 && answer.answerText === undefined) return "unanswered";
  if (answer.correct === null) return "deferred";
  if (!question?.skillId) return "no_skill";
  if (question.trustStatus === "sandbox") return "sandbox";
  if (question.feedsMastery === false) return "no_mastery";
  return null;
}

// ── attempt time ────────────────────────────────────────────────────────────

/** Before this a device clock is plainly wrong (a reset clock reads 1970). */
export const MIN_VALID_TIMESTAMP = Date.UTC(2020, 0, 1);
/** An answer may be stamped slightly ahead of the check (clock drift), but not by more than this. */
export const MAX_FUTURE_SKEW_MS = 5 * 60_000;

export type AttemptTime = { at: number; source: "actual" | "reconstructed" };

export function isUsableTimestamp(ts: unknown, now: number): ts is number {
  return typeof ts === "number" && Number.isFinite(ts) && ts >= MIN_VALID_TIMESTAMP && ts <= now + MAX_FUTURE_SKEW_MS;
}

/**
 * When each answered question was answered, keyed by question id, in the order the attempts happened.
 *  - "actual": the device time captured at the moment of submission (`answeredAt`).
 *  - "reconstructed": the documented FALLBACK for an answer with no usable `answeredAt` (older saved sessions, or a clock that
 *    reads before 2020 or beyond the allowed skew): the session end minus the answer durations still to come. It is never used
 *    when an actual time exists, and it is labelled so nothing downstream mistakes it for a measured time.
 * The order is by time (a learner may jump between questions); a clock that stepped backwards cannot reorder attempts because
 * times never decrease, and nothing is later than `now`. The same list drives BKT replay, forgetting decay, IRT ordering and
 * the event timestamps, so they all agree.
 */
export function resolveAttemptTimes(
  answers: ReadonlyArray<Pick<SprintAnswer, "questionId" | "timeSpent" | "selectedIndex" | "answerText" | "answeredAt">>,
  endedAt: number,
  now: number = endedAt,
): Map<string, AttemptTime> {
  const answered = answers.filter((a) => a.selectedIndex !== -1 || a.answerText !== undefined);
  const unique = answered.filter((a, i) => answered.findIndex((b) => b.questionId === a.questionId) === i);
  let cursor = endedAt - unique.reduce((sum, a) => sum + Math.max(0, a.timeSpent) * 1000, 0);
  const raw = unique.map((a, index) => {
    cursor += Math.max(0, a.timeSpent) * 1000;
    return isUsableTimestamp(a.answeredAt, now)
      ? { id: a.questionId, index, at: a.answeredAt, source: "actual" as const }
      : { id: a.questionId, index, at: Math.round(cursor), source: "reconstructed" as const };
  });
  raw.sort((x, y) => x.at - y.at || x.index - y.index);
  const out = new Map<string, AttemptTime>();
  let previous = 0;
  for (const r of raw) {
    const at = Math.max(previous, Math.min(r.at, now));
    previous = at;
    out.set(r.id, { at, source: r.source });
  }
  return out;
}

/** Back-compat view of `resolveAttemptTimes`: just the times. */
export function attemptTimes(
  answers: ReadonlyArray<Pick<SprintAnswer, "questionId" | "timeSpent" | "selectedIndex" | "answerText" | "answeredAt">>,
  endedAt: number,
  now: number = endedAt,
): Map<string, number> {
  return new Map([...resolveAttemptTimes(answers, endedAt, now)].map(([id, t]) => [id, t.at]));
}

/**
 * The engine's session log for a finished question list: every eligible answer with its attempt time, ordered by that time.
 * The same problem answered twice in one list counts once (a repeat is not new evidence), and the engine itself never counts a
 * repeated id twice towards the distinct-item rule.
 */
export function buildSessionLog(
  questions: ReadonlyArray<Pick<Question, "id" | "skillId" | "feedsMastery" | "trustStatus" | "difficulty" | "sourceId">>,
  answers: ReadonlyArray<SprintAnswer>,
  opts: { endedAt: number; age?: number; now?: number },
): SessionLogEntry[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answerById = new Map<string, SprintAnswer>();
  for (const a of answers) if (!answerById.has(a.questionId)) answerById.set(a.questionId, a);
  const target = targetTimeSeconds(opts.age ?? DEFAULT_AGE);
  const log: SessionLogEntry[] = [];
  for (const [id, time] of resolveAttemptTimes(answers, opts.endedAt, opts.now)) {
    const answer = answerById.get(id) as SprintAnswer;
    const question = byId.get(id);
    if (attemptEligibility(question, answer) !== null) continue;
    log.push({
      skill: question?.skillId as string,
      attempt: {
        correct: answer.correct === true,
        timeSpentSeconds: Math.max(0, answer.timeSpent),
        targetTimeSeconds: target,
        ...(question?.difficulty !== undefined ? { difficulty: question.difficulty } : {}),
        problemId: question?.sourceId ?? id,
        at: time.at,
      },
    });
  }
  return log;
}

/** The persisted snapshot -> engine states as of `now`, through the engine's own hydrate (every field, decay included). */
export function hydrateLearner(snapshot: MasterySnapshot | null | undefined, now: number): LearnerStates {
  return hydrateStates(snapshot, now);
}

/**
 * The learner's states after this session: the hydrated history with the session's eligible attempts folded in by the
 * engine's replay. Returns null when there is no hydrated base: a returning learner is never rebuilt from a blank state just
 * because the snapshot was unavailable (the caller then leaves the stored snapshot alone).
 */
export function applySession(
  base: LearnerStates | null,
  log: ReadonlyArray<SessionLogEntry>,
  now: number,
  /** Warm-up priors: used by the engine only for a skill with no state yet; an established skill is never overwritten. */
  priors?: ReadonlyMap<string, number>,
): LearnerStates | null {
  if (base === null) return null;
  if (log.length === 0) return base;
  return rebuildStates(base, log, now, priors);
}
