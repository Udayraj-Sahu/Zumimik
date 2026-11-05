import {
  freshThetaState,
  refitTheta,
  recordResponse,
  seedItemParams,
  targetDifficulty,
  THETA_MAX,
  THETA_MIN,
  type IrtResponse,
  type IrtSubject,
  type ThetaState,
} from "@vmsg/psychometrics";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";
import { attemptEligibility, resolveAttemptTimes } from "./learner-state";

/**
 * Ability (IRT 2PL-lite, the live model) on top of the vendored engine. θ is one number per subject and is deliberately
 * independent of every technique's BKT state. Nothing here fits or scores: `recordResponse` (first scored attempt per
 * problem, SANDBOX/ungraded ignored, MAP refit clamped to [-3, 3]) and `refitTheta` do that. The 3PL shadow model is not used.
 *
 * Subject: the server gives no way to tell a Data-Insights item from a Quant one on the practice endpoints, so every practice item
 * is "quant" (the server's flat `theta` column is θ_quant too). A "di" estimate is out of reach until items carry a subject.
 */
export const PRACTICE_SUBJECT: IrtSubject = "quant";

export type AbilityByDomain = Partial<Record<IrtSubject, ThetaState>>;

/** The item's parameters: the server's (calibrated or its seed) when present, otherwise the engine's own seed from difficulty. */
export function itemParams(question: Pick<Question, "irt" | "difficulty">): { a: number; b: number } | null {
  if (question.irt && Number.isFinite(question.irt.a) && question.irt.a > 0 && Number.isFinite(question.irt.b)) {
    return { a: question.irt.a, b: question.irt.b };
  }
  if (typeof question.difficulty === "number" && Number.isFinite(question.difficulty)) {
    const seed = seedItemParams(question.difficulty);
    return { a: seed.a, b: seed.b };
  }
  return null; // an unknown item is not treated as an average one
}

/** Validates a stored state and recomputes θ/SE/n from its responses, so a hand-edited or old record can never carry a stale θ. */
export function restoreTheta(raw: unknown, subject: IrtSubject = PRACTICE_SUBJECT): ThetaState {
  if (!raw || typeof raw !== "object") return freshThetaState(subject);
  const r = raw as { responses?: unknown };
  if (!Array.isArray(r.responses)) return freshThetaState(subject);
  const responses: IrtResponse[] = [];
  const seen = new Set<string>();
  for (const x of r.responses) {
    const o = x as Partial<IrtResponse> | null;
    if (!o || typeof o.problemId !== "string" || !o.problemId || seen.has(o.problemId)) continue;
    if (typeof o.a !== "number" || !(o.a > 0) || typeof o.b !== "number" || !Number.isFinite(o.b) || typeof o.correct !== "boolean") continue;
    seen.add(o.problemId);
    responses.push({ problemId: o.problemId, a: o.a, b: o.b, correct: o.correct });
  }
  if (responses.length === 0) return freshThetaState(subject);
  const fit = refitTheta(responses);
  return { subject, theta: fit.theta, se: fit.se, n: fit.n, responses };
}

/**
 * θ after a finished question list: every eligible answer (same rules as BKT) is recorded in question order. Returns the SAME
 * object when nothing counted, so callers can test `next === state`.
 */
export function applyAbility(
  state: ThetaState,
  questions: ReadonlyArray<Pick<Question, "id" | "skillId" | "feedsMastery" | "trustStatus" | "irt" | "difficulty" | "sourceId">>,
  answers: ReadonlyArray<SprintAnswer>,
  opts: { endedAt?: number; now?: number } = {},
): ThetaState {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answerById = new Map<string, SprintAnswer>();
  for (const a of answers) if (!answerById.has(a.questionId)) answerById.set(a.questionId, a);
  // Recorded in the order the answers happened (the same resolved times BKT and the event timestamps use).
  const order = [...resolveAttemptTimes(answers, opts.endedAt ?? Date.now(), opts.now).keys()];
  let next = state;
  for (const id of order) {
    const answer = answerById.get(id) as SprintAnswer;
    const question = byId.get(id);
    if (attemptEligibility(question, answer) !== null || !question) continue;
    const params = itemParams(question);
    if (!params) continue;
    next = recordResponse(next, {
      problemId: question.sourceId ?? question.id,
      a: params.a,
      b: params.b,
      correct: answer.correct,
      feedsMastery: question.feedsMastery,
    });
  }
  return next;
}

/** The θ to send with the next session request: undefined until something has been scored (the server then uses its cold start). */
export function thetaForRequest(state: ThetaState | null | undefined): number | undefined {
  if (!state || state.n === 0) return undefined;
  return Math.min(THETA_MAX, Math.max(THETA_MIN, Math.round(state.theta * 1000) / 1000));
}

/** The difficulty level (1-5) this ability aims at (P(correct) = 0.7), for display and tests. */
export function targetLevel(state: ThetaState | null | undefined): number | null {
  return state && state.n > 0 ? targetDifficulty(state.theta) : null;
}
