import { freshThetaState, MAX_THETA_RESPONSES, type IrtResponse, type IrtSubject, type ThetaState } from "@vmsg/psychometrics";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";
import { applyAbility, restoreTheta, thetaForRequest } from "./ability";

/**
 * Ability per subject, on top of ability.ts (which does the IRT through the vendored engine for ONE state).
 *
 * A learner has an independent estimate for each subject the backend names (quant, di). A practice item that carries no subject, which
 * is every item the current backend serves, is not Quant: it feeds a separate estimate, "unclassified". That estimate is kept on the
 * device only: it steers practice difficulty (so sessions keep adapting) but is never sent to the server as a subject and never
 * merged into Quant or DI. When the backend starts naming a subject, those items start feeding the real subject estimates.
 */

export type AbilitySubject = IrtSubject | "unclassified";
export type AbilityBook = Partial<Record<AbilitySubject, ThetaState>>;

const SUBJECTS: readonly IrtSubject[] = ["quant", "di"];

export function isIrtSubject(v: unknown): v is IrtSubject {
  return v === "quant" || v === "di";
}

/** The subject an item belongs to, exactly as the backend named it. Missing or unrecognised means unclassified, never a guess. */
export function subjectOfItem(subject: unknown): AbilitySubject {
  return isIrtSubject(subject) ? subject : "unclassified";
}

const fresh = (subject: AbilitySubject): ThetaState => freshThetaState(subject === "unclassified" ? "quant" : subject);

/**
 * Record a finished question list into the book: each eligible answer goes to the estimate of its own subject (ability.ts applies
 * the engine's rules: first scored attempt per problem, ungraded and sandbox answers ignored). Returns the SAME object when
 * nothing counted.
 */
export function applyAbilityBook(
  book: AbilityBook,
  questions: ReadonlyArray<Pick<Question, "id" | "skillId" | "feedsMastery" | "trustStatus" | "irt" | "difficulty" | "sourceId"> & { subject?: unknown }>,
  answers: ReadonlyArray<SprintAnswer>,
  opts: { endedAt?: number; now?: number } = {},
): AbilityBook {
  const bySubject = new Map<AbilitySubject, typeof questions[number][]>();
  for (const q of questions) {
    const s = subjectOfItem(q.subject);
    bySubject.set(s, [...(bySubject.get(s) ?? []), q]);
  }
  let next = book;
  for (const [subject, qs] of bySubject) {
    const ids = new Set(qs.map((q) => q.id));
    const state = book[subject] ?? fresh(subject);
    const updated = applyAbility(state, qs, answers.filter((a) => ids.has(a.questionId)), opts);
    if (updated !== state) next = { ...next, [subject]: updated };
  }
  return next;
}

/** What may be sent to the server: only the subjects it knows, each stamped with its own subject. Never the unclassified estimate. */
export function sendableAbility(book: AbilityBook): Partial<Record<IrtSubject, ThetaState>> {
  const out: Partial<Record<IrtSubject, ThetaState>> = {};
  for (const subject of SUBJECTS) {
    const state = book[subject];
    if (state && state.n > 0) out[subject] = { ...state, subject };
  }
  return out;
}

/**
 * The book from what is stored on the device. The earlier format was one bare ThetaState recorded before items carried a subject, so
 * it is read as the unclassified estimate (it was never Quant). Every state is rebuilt from its responses.
 */
export function restoreBook(raw: unknown): AbilityBook {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.responses)) {
    const legacy = restoreTheta(r);
    return legacy.n > 0 ? { unclassified: legacy } : {};
  }
  const out: AbilityBook = {};
  for (const subject of ["quant", "di", "unclassified"] as const) {
    if (r[subject] === undefined) continue;
    const state = restoreTheta(r[subject], subject === "unclassified" ? "quant" : subject);
    if (state.n > 0) out[subject] = state;
  }
  return out;
}

/**
 * Combine two estimates of the SAME subject (this device's and the server's, which carries other devices' evidence). Evidence is
 * combined, never the estimates averaged: the union of responses by problem id (the first attempt of a problem counts, as the engine
 * requires), the older source first, the latest MAX_THETA_RESPONSES kept, then theta is refit from those responses by the engine.
 * Order is fixed (server, then local), so the result does not depend on when or where it runs.
 */
export function mergeThetaStates(server: ThetaState | undefined, local: ThetaState | undefined, subject: AbilitySubject): ThetaState | undefined {
  if (!server && !local) return undefined;
  const seen = new Set<string>();
  const responses: IrtResponse[] = [];
  for (const state of [server, local]) {
    for (const r of state?.responses ?? []) {
      if (seen.has(r.problemId)) continue;
      seen.add(r.problemId);
      responses.push(r);
    }
  }
  const merged = restoreTheta({ responses: responses.slice(-MAX_THETA_RESPONSES) }, subject === "unclassified" ? "quant" : subject);
  return merged.n > 0 ? merged : undefined;
}

/**
 * INTEGRATION BOUNDARY (backend contract pending, see BACKEND_TEAM_HANDOFF.md): the abilities the server returned in the mastery
 * response, as { quant?: ThetaState-shaped, di?: ThetaState-shaped }. Anything else (no field, another shape, an unknown subject,
 * states that fail validation) is ignored, so the app behaves exactly as before until the backend sends the agreed shape. Each state
 * is rebuilt from its responses, so a server theta/se is informational only.
 */
export function remoteAbilityOf(snapshot: unknown): AbilityBook {
  const theta = (snapshot as { theta?: unknown } | null | undefined)?.theta;
  if (!theta || typeof theta !== "object" || Array.isArray(theta)) return {};
  const out: AbilityBook = {};
  for (const subject of SUBJECTS) {
    const raw = (theta as Record<string, unknown>)[subject];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const state = restoreTheta(raw, subject);
    if (state.n > 0) out[subject] = state;
  }
  return out;
}

/** The local book with the server's evidence merged in, per subject. The unclassified estimate is local by definition. */
export function mergeBook(local: AbilityBook, remote: AbilityBook): AbilityBook {
  const out: AbilityBook = { ...local };
  for (const subject of SUBJECTS) {
    const merged = mergeThetaStates(remote[subject], local[subject], subject);
    if (merged) out[subject] = merged;
  }
  return out;
}

/**
 * The theta to send with a session request, for the subjects of the techniques being requested.
 *   - every technique is of the same named subject -> that subject's estimate;
 *   - none has a named subject -> the unclassified estimate (the current backend: sessions keep adapting);
 *   - a mix of subjects, or of named and unnamed -> none: one number cannot stand for several abilities, so the server's cold start
 *     applies rather than a guessed value.
 * undefined until something has been scored for it.
 */
export function abilityForRequest(book: AbilityBook, subjectsOfSkills: ReadonlyArray<AbilitySubject>): number | undefined {
  const distinct = new Set(subjectsOfSkills);
  if (distinct.size !== 1) return distinct.size === 0 ? thetaForRequest(book.unclassified) : undefined;
  const [subject] = [...distinct];
  return thetaForRequest(book[subject]);
}
