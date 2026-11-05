/**
 * Practice runtime — the technique state machine (processAttempt / nextState),
 * decay-aware hydration (effectiveState / hydrateStates / rebuildStates), and
 * the client-side prescription builder (buildPools / composeSession, ~50 ms
 * budget).
 *
 * Everything that computes P(L), a state or a pool lives here so the practice
 * page never re-implements it: a page that hydrates by hand dropped
 * `distinctCorrectIds` and let a history-less fresh state overwrite the
 * snapshot (TEST_REPORT_2026-10-05_wave1.md:28,31).
 */
import type { Bucket, PrescribedProblem, SessionAllocation, SessionPrescription, TechniqueStateName } from "@vmsg/shared-types";
import { clampPL, decayMastery, isFluid, updateBkt } from "./bkt";
import { composeAllocation, targetTimeSeconds, ComposeAllocationOptions } from "./allocator";
import { needsReview } from "./scheduler";
import {
  ACCURACY_WINDOW,
  DAY_MS,
  ENGINE_VERSION,
  FLUID_EVIDENCE_NATS,
  FLUID_MASTERY_SCORE,
  FLUID_STREAK,
  FRACTURED_ERRORS,
  FRACTURED_EXIT_STREAK,
  FRACTURED_MASTERY_SCORE,
  GUESS_CEILING,
  RFP_BKT_PARAMS,
  WRONG_ANSWER_GUARDS,
} from "./constants";

/** The stored values at `lastPracticedAt` that a decayed view was computed from. */
export interface DecayBase {
  pLearned: number;
  state: TechniqueStateName;
}

export interface TechniqueState {
  techniqueId: string;
  /** Set by `nextState`. With hysteresis it depends on the PATH, not only on the
   *  numbers below, so it is persisted and restored, never recomputed. */
  state: TechniqueStateName;
  masteryScore: number;
  /** Lifetime accuracy, %, kept for display. The mastery score reads `recent`. */
  accuracyScore: number;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  totalAttempts: number;
  totalCorrect: number;
  /** P(L), always inside [P_L_FLOOR, P_L_CEIL]. On a view from `effectiveState`
   *  it is the decayed value and `decayedFrom` holds the stored one. */
  pLearned: number;
  /** Distinct problem ids this learner has answered correctly on this technique.
   *  Identity never reaches `updateBkt` — P(L) is a function of correctness alone,
   *  which is correct BKT — so the evidence is counted here instead. Bounded, because
   *  this state is persisted in the session_end snapshot. */
  distinctCorrectIds: string[];
  /** Correctness of the last ACCURACY_WINDOW scored attempts, oldest first. */
  recent: boolean[];
  /** CUSUM evidence for "knows" against "guesses", in [0, FLUID_EVIDENCE_NATS]. */
  evidenceNats: number;
  /** Epoch ms of the latest scored attempt; null when no attempt carried a time.
   *  Decay is counted from here in whole days. */
  lastPracticedAt: number | null;
  /** Present only on a view `effectiveState` decayed: the stored P(L) and state
   *  at `lastPracticedAt`. Every later decay is recomputed from these, so a view
   *  that is decayed, serialised, hydrated and decayed again is never decayed
   *  twice. Persist it with the rest of the state. */
  decayedFrom?: DecayBase;
  engineVersion: typeof ENGINE_VERSION;
}

/** Correct answers on this many DISTINCT problems before a key may read "fluid".
 *  Two answers on one repeated item is recall of that item, not mastery of a skill. */
export const DISTINCT_EVIDENCE_REQUIRED = 3;
const MAX_TRACKED_IDS = 50;

/** A technique nobody has attempted. Its state is the entry classification of
 *  its numbers: fractured at the default prior 0.35 (mastery 35 < 50), fragile
 *  for a warm-up prior of 0.50 or more, which already showed some competence. */
export function freshState(techniqueId: string, pInit: number = RFP_BKT_PARAMS.pInit): TechniqueState {
  const pLearned = clampPL(pInit);
  const masteryScore = Math.round(pLearned * 100);
  return {
    techniqueId,
    state: classifyState({ masteryScore, consecutiveCorrect: 0, consecutiveErrors: 0, pLearned }),
    masteryScore,
    accuracyScore: 0,
    consecutiveCorrect: 0,
    consecutiveErrors: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    pLearned,
    distinctCorrectIds: [],
    recent: [],
    evidenceNats: 0,
    lastPracticedAt: null,
    engineVersion: ENGINE_VERSION,
  };
}

// ── The evidence test ────────────────────────────────────────────────────────

/** Log-likelihood ratio of one scored attempt under "knows" (correct at
 *  1−P(S) = 0.90, VMSG:290) against "guesses" (correct at GUESS_CEILING). */
const LLR_CORRECT = Math.log((1 - RFP_BKT_PARAMS.pSlip) / GUESS_CEILING); // +1.280934
const LLR_WRONG = Math.log(RFP_BKT_PARAMS.pSlip / (1 - GUESS_CEILING)); //   −2.014903

/** One CUSUM step: E ← min(H, max(0, E + ℓ)). The floor at 0 is what makes it a
 *  CUSUM (a long run of guessing cannot bank negative evidence that a learner
 *  must later repay); the cap at H keeps the statistic recent, so a former
 *  knower who starts guessing loses it within a few wrongs. */
export function updateEvidence(evidenceNats: number, correct: boolean): number {
  return Math.min(FLUID_EVIDENCE_NATS, Math.max(0, evidenceNats + (correct ? LLR_CORRECT : LLR_WRONG)));
}

// ── Classification and transitions ───────────────────────────────────────────

/** The numbers a classification reads. Every field after the first three is
 *  optional so a caller holding only the legacy three still compiles — and,
 *  with no posterior, no distinct evidence and no evidence nats, never reads fluid. */
export interface GateInputs {
  masteryScore: number;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  pLearned?: number;
  distinctCorrectIds?: readonly string[];
  evidenceNats?: number;
}

function isFracturedNow(s: GateInputs): boolean {
  return s.masteryScore < FRACTURED_MASTERY_SCORE || s.consecutiveErrors >= FRACTURED_ERRORS;
}

/**
 * Entering fluid takes all five, each catching what the others miss:
 * - P(L) ≥ 0.85 is the documented posterior (BKT-10, ROU-02; VMSG:295, :251).
 * - the 5-correct streak and the mastery score ≥ 80 are SHARED_REFERENCE.md:234.
 * - 3 DISTINCT correct problems: two answers on ONE repeated item is recall of
 *   that item (coordinator decision 2026-09-18, fluid-gate-unwired).
 * - E ≥ FLUID_EVIDENCE_NATS: a lucky streak is not evidence. The other four
 *   together still let 0.39% of 25% guessers read fluid on day 0
 *   (TEST_REPORT_2026-10-05_wave1.md:32); with this test none of 100,000 do.
 */
function meetsFluidEntry(s: GateInputs): boolean {
  return (
    isFluid(s.pLearned ?? 0) &&
    s.consecutiveCorrect >= FLUID_STREAK &&
    s.masteryScore >= FLUID_MASTERY_SCORE &&
    (s.distinctCorrectIds ?? []).length >= DISTINCT_EVIDENCE_REQUIRED &&
    (s.evidenceNats ?? 0) >= FLUID_EVIDENCE_NATS
  );
}

/**
 * The ENTRY classification of a set of numbers, with no history: fractured,
 * else fluid only if all five entry conditions hold, else fragile. Kept for
 * callers that have numbers but no previous state (and for backward
 * compatibility: every field past the legacy three is optional).
 *
 * The live path is `nextState`, which `processAttempt` uses. History matters
 * there: once fluid, a slow answer or a dip in the mastery score no longer
 * demotes (TEST_REPORT_2026-10-05_wave1.md:45), and leaving fractured takes 2
 * consecutive corrects (SHARED_REFERENCE.md:236).
 *
 * Until 2026-09-18 three things were called the fluid gate and the documented
 * P(L) one had no production caller. This function and `nextState` share one
 * entry test, `meetsFluidEntry`, so there is still exactly one definition.
 */
export function classifyState(s: GateInputs): TechniqueStateName {
  if (isFracturedNow(s)) return "fractured";
  return meetsFluidEntry(s) ? "fluid" : "fragile";
}

export interface TransitionContext {
  /** Whole days since the previous scored attempt. More than DECAY_CLIFF_DAYS
   *  demotes fluid to fragile BEFORE this attempt is judged (SHARED_REFERENCE.md:234). */
  gapDays?: number;
}

/**
 * The state machine (SHARED_REFERENCE.md:234-236, plus one P(L) exit):
 *
 * | from      | to        | when                                                         |
 * |-----------|-----------|--------------------------------------------------------------|
 * | any       | fractured | mastery score < 50, or ≥ 3 consecutive wrongs                 |
 * | fractured | fragile   | ≥ 2 consecutive corrects                                      |
 * | fragile   | fluid     | all five entry conditions (`meetsFluidEntry`)                 |
 * | fluid     | fragile   | a gap of more than 7 days, or P(L) < 0.85 (the gate is the exit) |
 * | fluid     | fluid     | otherwise — a slow answer or a lower mastery score does not demote |
 *
 * Transitions chain within one call (fractured → fragile → fluid), which is
 * harmless: fluid needs a streak of 5, so the fractured exit is already met.
 *
 * A gap of more than 7 days also restarts the streak (`processAttempt` does
 * it, coordinator default Q2 2026-10-09), so the demoted skill has to earn 5 in
 * a row again before it can re-enter; its CUSUM evidence and distinct-item
 * evidence are kept. Without the restart, the first correct answer after any
 * break put it straight back to fluid.
 */
export function nextState(
  prev: TechniqueStateName,
  s: GateInputs,
  ctx: TransitionContext = {},
): TechniqueStateName {
  if (isFracturedNow(s)) return "fractured";
  let from = prev;
  if (from === "fluid" && ctx.gapDays !== undefined && needsReview(ctx.gapDays)) from = "fragile";
  if (from === "fluid") return isFluid(s.pLearned ?? 0) ? "fluid" : "fragile";
  if (from === "fractured" && s.consecutiveCorrect < FRACTURED_EXIT_STREAK) return "fractured";
  return meetsFluidEntry(s) ? "fluid" : "fragile";
}

/** Why a state is not fluid yet, for a client that wants to say so honestly. */
export function evidenceFor(s: TechniqueState): {
  distinctCorrect: number;
  required: number;
  underEvidenced: boolean;
  evidenceNats: number;
  evidenceRequired: number;
} {
  const distinctCorrect = s.distinctCorrectIds.length;
  return {
    distinctCorrect,
    required: DISTINCT_EVIDENCE_REQUIRED,
    underEvidenced: distinctCorrect < DISTINCT_EVIDENCE_REQUIRED,
    evidenceNats: s.evidenceNats,
    evidenceRequired: FLUID_EVIDENCE_NATS,
  };
}

// ── Attempts ─────────────────────────────────────────────────────────────────

export interface AttemptInput {
  correct: boolean;
  timeSpentSeconds: number;
  targetTimeSeconds: number;
  /** Kept on the attempt for IRT seeding and logging. BKT ignores it: P(T) is
   *  0.14 on every attempt (constants.ts). */
  difficulty?: number;
  /** Which problem this was. Carried on the attempt, never passed to updateBkt. */
  problemId?: string;
  /** Epoch ms of the answer. With it, decay since the last attempt is applied
   *  before the update; without it no decay is applied and `lastPracticedAt`
   *  becomes null (hydration then falls back to the snapshot's `as_of`). A
   *  non-finite value (NaN, ±Infinity) is treated as absent: stored, Infinity
   *  would win every later max() and stop decay and the 7-day cliff for good. */
  at?: number;
}

/** `attempt.at` when it is a usable time, else undefined. */
function attemptTime(attempt: AttemptInput): number | undefined {
  return typeof attempt.at === "number" && Number.isFinite(attempt.at) ? attempt.at : undefined;
}

/** mastery = min(100, accuracy·0.6 + (under-target ? 40 : 20)) — DES spec :38-41.
 *  `processAttempt` passes the accuracy of the last ACCURACY_WINDOW attempts. */
export function masteryScore(accuracyPct: number, underTarget: boolean): number {
  return Math.min(100, Math.round(accuracyPct * 0.6 + (underTarget ? 40 : 20)));
}

function windowAccuracyPct(recent: readonly boolean[]): number {
  if (recent.length === 0) return 0;
  return (recent.filter(Boolean).length / recent.length) * 100;
}

/** Whole days from `from` to `now`, never negative; 0 when `from` is unknown. */
export function wholeDaysSince(from: number | null, now: number): number {
  if (from === null || !Number.isFinite(from) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - from) / DAY_MS));
}

/**
 * One scored attempt. Decay since the last attempt is applied first (when the
 * attempt carries `at`), so the answer updates the value the learner actually
 * has — 0.861020 after a 14-day break from 0.95, not 0.95.
 *
 * A gap of more than 7 whole days (`needsReview`) restarts the correct streak
 * before this answer is counted (coordinator default Q2, 2026-10-09): the
 * learner re-earns 5 in a row. The CUSUM evidence and the distinct-item
 * evidence are KEPT. The restart lives here, not in `effectiveState`, so a
 * decayed view stays a function of P(L) and state alone and remains idempotent.
 */
export function processAttempt(state: TechniqueState, attempt: AttemptInput): TechniqueState {
  const at = attemptTime(attempt);
  const gapDays = at === undefined ? 0 : wholeDaysSince(state.lastPracticedAt, at);
  const base = at === undefined ? state : effectiveState(state, at);
  // The decayed view's stored values are consumed by this update: the new
  // P(L) is the stored value from now on.
  const { decayedFrom: _consumed, ...carried } = base;
  const streakBefore = needsReview(gapDays) ? 0 : base.consecutiveCorrect;
  const clockBefore = base.lastPracticedAt;

  const correct = attempt.correct;
  const totalAttempts = base.totalAttempts + 1;
  const totalCorrect = base.totalCorrect + (correct ? 1 : 0);
  const distinctCorrectIds =
    correct && attempt.problemId && !base.distinctCorrectIds.includes(attempt.problemId)
      ? [...base.distinctCorrectIds, attempt.problemId].slice(-MAX_TRACKED_IDS)
      : base.distinctCorrectIds;
  const recent = [...base.recent, correct].slice(-ACCURACY_WINDOW);

  const next: TechniqueState = {
    ...carried,
    totalAttempts,
    totalCorrect,
    accuracyScore: (totalCorrect / totalAttempts) * 100,
    consecutiveCorrect: correct ? streakBefore + 1 : 0,
    consecutiveErrors: correct ? 0 : base.consecutiveErrors + 1,
    masteryScore: masteryScore(windowAccuracyPct(recent), attempt.timeSpentSeconds < attempt.targetTimeSeconds),
    pLearned: updateBkt(base.pLearned, correct),
    distinctCorrectIds,
    recent,
    evidenceNats: updateEvidence(base.evidenceNats, correct),
    // max(): an attempt applied late (a server verdict) never moves the clock back,
    // which would decay the new value by a gap it did not sit through. A stored
    // clock that is not a finite time is replaced, never carried through max().
    lastPracticedAt:
      at === undefined ? null : clockBefore !== null && Number.isFinite(clockBefore) ? Math.max(clockBefore, at) : at,
    engineVersion: ENGINE_VERSION,
  };
  next.state = nextState(base.state, next, { gapDays });
  return next;
}

// ── Decay and hydration ──────────────────────────────────────────────────────

/**
 * The state as of `now`: P(L) decayed by the whole days since `lastPracticedAt`,
 * and fluid demoted to fragile after a gap of more than 7 days
 * (SHARED_REFERENCE.md:234) or when decay takes P(L) under the gate.
 *
 * Always computed from the STORED value (`decayedFrom` when the input is itself
 * a decayed view), never from an already-decayed one. So it is idempotent, and
 * a view decayed at a later time and then asked about an earlier one returns
 * the earlier answer — which is what makes `rebuildStates` independent of when
 * the hydration arrived.
 */
export function effectiveState(s: TechniqueState, now: number): TechniqueState {
  const { decayedFrom, ...rest } = s;
  const stored: DecayBase = decayedFrom ?? { pLearned: s.pLearned, state: s.state };
  const days = wholeDaysSince(s.lastPracticedAt, now);
  if (days <= 0) return { ...rest, pLearned: stored.pLearned, state: stored.state };
  const pLearned = decayMastery(stored.pLearned, days);
  const lapsed = stored.state === "fluid" && (needsReview(days) || !isFluid(pLearned));
  return { ...rest, pLearned, state: lapsed ? "fragile" : stored.state, decayedFrom: stored };
}

/** What `/practice/mastery` returns: the snapshot's per-technique states and
 *  when the snapshot was taken (epoch ms or ISO-8601). */
export interface MasterySnapshot {
  technique_states?: Record<string, unknown> | null;
  as_of?: number | string | null;
}

const STATE_NAMES: readonly TechniqueStateName[] = ["fluid", "fragile", "fractured"];

function isStateName(v: unknown): v is TechniqueStateName {
  return typeof v === "string" && (STATE_NAMES as readonly string[]).includes(v);
}

function finiteOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function countOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;
}

function toEpochMs(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function restoreState(id: string, raw: unknown, asOf: number | null): TechniqueState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const base = freshState(id);

  const pLearned = clampPL(finiteOr(r.pLearned, base.pLearned));
  const totalAttempts = countOr(r.totalAttempts, 0);
  const totalCorrect = Math.min(countOr(r.totalCorrect, 0), totalAttempts);
  const ids = Array.isArray(r.distinctCorrectIds)
    ? r.distinctCorrectIds.filter((x): x is string => typeof x === "string")
    : [];
  const distinctCorrectIds = [...new Set(ids)].slice(-MAX_TRACKED_IDS);
  const restored: TechniqueState = {
    ...base,
    pLearned,
    masteryScore: finiteOr(r.masteryScore, Math.round(pLearned * 100)),
    accuracyScore: finiteOr(r.accuracyScore, totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0),
    consecutiveCorrect: countOr(r.consecutiveCorrect, 0),
    consecutiveErrors: countOr(r.consecutiveErrors, 0),
    totalAttempts,
    totalCorrect,
    distinctCorrectIds,
  };

  const current = typeof r.engineVersion === "number" && r.engineVersion >= ENGINE_VERSION;
  if (!current) {
    // A row from the engine that had no evidence test, window or practice time.
    // Its practice time is taken as the snapshot's; its evidence starts at 0, so
    // a legacy "fluid" is rebuilt as fragile (it cannot show the evidence the
    // gate now asks for) and has to earn fluid again.
    restored.lastPracticedAt = asOf;
    restored.state = classifyState(restored);
    return restored;
  }

  restored.recent = Array.isArray(r.recent)
    ? r.recent.filter((x): x is boolean => typeof x === "boolean").slice(-ACCURACY_WINDOW)
    : [];
  restored.evidenceNats = Math.min(FLUID_EVIDENCE_NATS, Math.max(0, finiteOr(r.evidenceNats, 0)));
  restored.lastPracticedAt = toEpochMs(r.lastPracticedAt) ?? asOf;
  // A v2 state is path-dependent: restore it, never re-derive it.
  restored.state = isStateName(r.state) ? r.state : classifyState(restored);
  const from = r.decayedFrom as Record<string, unknown> | null | undefined;
  if (from && typeof from === "object" && isStateName(from.state) && typeof from.pLearned === "number" && Number.isFinite(from.pLearned)) {
    restored.decayedFrom = { pLearned: clampPL(from.pLearned), state: from.state };
  }
  return restored;
}

/**
 * Rebuild every technique state from a `/practice/mastery` snapshot, as of `now`.
 * Restores EVERY field (distinctCorrectIds, recent, evidenceNats,
 * lastPracticedAt, decayedFrom), clamps P(L) (a saturated 1.0 becomes 0.999),
 * and returns `effectiveState(…, now)` for each. Hydrating its own serialised
 * output again gives the same states: decay is recomputed from `decayedFrom`.
 */
export function hydrateStates(
  snapshot: MasterySnapshot | null | undefined,
  now: number,
): Record<string, TechniqueState> {
  const out: Record<string, TechniqueState> = {};
  const rows = snapshot?.technique_states;
  if (!rows || typeof rows !== "object" || Array.isArray(rows)) return out;
  const asOf = toEpochMs(snapshot?.as_of);
  for (const [id, raw] of Object.entries(rows)) {
    const restored = restoreState(id, raw, asOf);
    if (restored) out[id] = effectiveState(restored, now);
  }
  return out;
}

export interface SessionLogEntry {
  skill: string;
  /** `at` is REQUIRED here. Without a time, `processAttempt` updates whatever
   *  decayed view it is handed, and that view depends on when the hydration
   *  happened — so the replay would no longer be independent of it. */
  attempt: AttemptInput & { at: number };
}

/**
 * The states for this session: this session's attempts, in order, folded over
 * the hydrated base, then brought to `now`. A skill with no hydrated state
 * starts from `freshState` (with its warm-up prior when `priors` has one).
 *
 * This replaces merging a per-session map over the snapshot, where a state
 * created from `freshState` before the snapshot arrived won and erased that
 * skill's history (TEST_REPORT_2026-10-05_wave1.md:31). Because every entry
 * carries its time, replaying the log gives the same states whether the
 * hydration arrived before or after the answers. An entry without a finite
 * `at` throws a TypeError rather than return a hydration-dependent answer
 * that looks like a correct one.
 */
export function rebuildStates(
  hydrated: Readonly<Record<string, TechniqueState>>,
  sessionLog: ReadonlyArray<SessionLogEntry>,
  now: number,
  priors?: ReadonlyMap<string, number>,
): Record<string, TechniqueState> {
  sessionLog.forEach(({ skill, attempt }, i) => {
    if (attemptTime(attempt) === undefined) {
      throw new TypeError(`rebuildStates: log entry ${i} (${skill}) has no finite \`at\`; every replayed attempt needs its time`);
    }
  });
  const out: Record<string, TechniqueState> = { ...hydrated };
  for (const { skill, attempt } of sessionLog) {
    out[skill] = processAttempt(out[skill] ?? freshState(skill, priors?.get(skill)), attempt);
  }
  for (const id of Object.keys(out)) out[id] = effectiveState(out[id], now);
  return out;
}

// ── Prescription ─────────────────────────────────────────────────────────────

export interface SessionProfile {
  persona?: string;
  cluster?: string;
  age: number;
  sessionSize?: number;
}

export interface TechniquePools {
  fluid: string[];
  fragile: string[];
  frontier: string[];
}

/** One skill as `GET /practice/catalog` lists it. */
export interface CatalogSkill {
  skill: string;
  /** Its prerequisite skills: the `:Skill` targets of `(X)-[:REQUIRES]->(p:Skill)`,
   *  where REQUIRES points dependent → prerequisite. NOT `PREREQUISITE_OF`: in
   *  the live graph that is the bipartite Skill→Problem Q-matrix (memory
   *  neo4j-live-graph-schema, SETTLED; scripts/verify_seed.py contracts it
   *  against problem_requirements), so reading it here finds no skill parents
   *  and silently opens every skill at once. The server builds this list in
   *  services/api/app/routers/prescription.py (`_requires`,
   *  `practisable_prerequisites`).
   *  List only parents a learner can practise: a parent that can never reach
   *  P(L) ≥ 0.85 keeps this skill off the frontier for good (ROU-02). */
  parents?: readonly string[];
  /** Servable items. 0 keeps the skill out of every pool, since a slot on it
   *  could not be filled; absent means unknown and is treated as servable. */
  servable?: number;
}

/**
 * Strongly connected components of the prerequisite graph over `nodes`
 * (iterative Tarjan; a parent that is not a node is no edge). Returns each
 * node's component number.
 */
function prerequisiteComponents(
  nodes: readonly string[],
  parentsOf: ReadonlyMap<string, readonly string[]>,
): Map<string, number> {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const component = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let nextIndex = 0;
  let components = 0;
  const open = (v: string) => {
    index.set(v, nextIndex);
    low.set(v, nextIndex);
    nextIndex++;
    stack.push(v);
    onStack.add(v);
  };
  for (const root of nodes) {
    if (index.has(root)) continue;
    open(root);
    const work: Array<{ v: string; next: number }> = [{ v: root, next: 0 }];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const edges = parentsOf.get(frame.v) ?? [];
      if (frame.next < edges.length) {
        const w = edges[frame.next++];
        if (!parentsOf.has(w)) continue;
        if (!index.has(w)) {
          open(w);
          work.push({ v: w, next: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v) as number, index.get(w) as number));
        }
        continue;
      }
      work.pop();
      if (low.get(frame.v) === index.get(frame.v)) {
        let w: string;
        do {
          w = stack.pop() as string;
          onStack.delete(w);
          component.set(w, components);
        } while (w !== frame.v);
        components++;
      }
      if (work.length > 0) {
        const up = work[work.length - 1].v;
        low.set(up, Math.min(low.get(up) as number, low.get(frame.v) as number));
      }
    }
  }
  return component;
}

/**
 * The three pools composeSession draws from, as of `now`:
 * - fluid: effective state fluid.
 * - fragile: effective state fragile — which includes a fluid skill idle for
 *   more than 7 days, since `effectiveState` demotes it.
 * - frontier: attempted skills that are fractured, then unattempted skills
 *   whose REQUIRES parents (`CatalogSkill.parents`) all have P(L) ≥ 0.85
 *   (ROU-02, VMSG:251) or that have no parents. The test is P(L), not the
 *   state: a fragile parent at 0.9403 unlocks its child.
 * Prerequisite cycles do not lock skills out for good. The skills on a cycle
 * are treated as one unit: they open together once every parent from OUTSIDE
 * the cycle is mastered, and their dependents wait for them as usual. The live
 * REQUIRES graph has 0 cycles since the 2026-09-09 break, but had 3 before it,
 * and without this every skill on a cycle and downstream of it stayed locked
 * and the session underfilled with no other signal.
 * Order is catalog order, then skills known only from `states` by id, so the
 * draw is deterministic.
 */
export function buildPools(
  states: Readonly<Record<string, TechniqueState>>,
  catalog: ReadonlyArray<CatalogSkill>,
  now: number,
): TechniquePools {
  const effective = new Map<string, TechniqueState>();
  for (const [id, s] of Object.entries(states)) effective.set(id, effectiveState(s, now));

  const parentsOf = new Map<string, readonly string[]>();
  const order: string[] = [];
  const excluded = new Set<string>();
  for (const c of catalog) {
    if (parentsOf.has(c.skill) || excluded.has(c.skill)) continue;
    if (c.servable === 0) {
      excluded.add(c.skill);
      continue;
    }
    parentsOf.set(c.skill, c.parents ?? []);
    order.push(c.skill);
  }
  for (const id of [...effective.keys()].sort()) {
    if (!parentsOf.has(id) && !excluded.has(id)) {
      parentsOf.set(id, []);
      order.push(id);
    }
  }

  // A skill's gate is its component's parents from outside the component: on a
  // DAG that is exactly its own parents; on a cycle, the cycle's way in.
  const component = prerequisiteComponents(order, parentsOf);
  const gateOf = new Map<number, string[]>();
  for (const id of order) {
    const c = component.get(id) as number;
    const gate = gateOf.get(c) ?? [];
    for (const p of parentsOf.get(id) ?? []) if (component.get(p) !== c) gate.push(p);
    gateOf.set(c, gate);
  }

  const mastered = (id: string) => {
    const s = effective.get(id);
    return s !== undefined && isFluid(s.pLearned);
  };
  const pools: TechniquePools = { fluid: [], fragile: [], frontier: [] };
  const unattempted: string[] = [];
  for (const id of order) {
    const s = effective.get(id);
    if (s && s.totalAttempts > 0) {
      if (s.state === "fluid") pools.fluid.push(id);
      else if (s.state === "fragile") pools.fragile.push(id);
      else pools.frontier.push(id);
    } else if ((gateOf.get(component.get(id) as number) ?? []).every(mastered)) {
      unattempted.push(id);
    }
  }
  pools.frontier.push(...unattempted);
  return pools;
}

const POOL_BY_BUCKET: Record<Bucket, keyof TechniquePools> = {
  primary: "fluid",
  sinking: "fragile",
  frontier: "frontier",
};

const BUCKETS: readonly Bucket[] = ["primary", "sinking", "frontier"];
/** Where an unfilled slot is refilled from: new material first, then review,
 *  then consolidation. */
const BACKFILL_ORDER: readonly Bucket[] = ["frontier", "sinking", "primary"];

export interface ComposedSession extends SessionPrescription {
  /** Slots no pool could fill. 0 whenever any pool has a skill in it. */
  underfilled: number;
}

/**
 * The deterministic draw behind `composeSession`: each bucket's slots from its
 * own pool, round-robin in pool order, then any slot whose pool was empty
 * backfilled frontier → sinking → primary (design W1-6). Each problem is
 * labelled with the bucket whose pool supplied it.
 *
 * The backfill is a GUARD. Through `composeSession` it never fires today:
 * `composeAllocation` gives an empty pool no slots, so every slot has a pool
 * (allocator.test.ts checks that for every persona × cluster × pool mask × size
 * 0-40). It is exported so the guard's order can be tested directly, and it
 * fills the session if an allocation table ever leaks a slot onto an empty pool.
 */
export function fillAllocation(
  allocation: SessionAllocation,
  pools: TechniquePools,
): PrescribedProblem[] {
  const problems: PrescribedProblem[] = [];
  const drawn: Record<Bucket, number> = { primary: 0, sinking: 0, frontier: 0 };
  const draw = (bucket: Bucket): boolean => {
    const pool = pools[POOL_BY_BUCKET[bucket]];
    if (pool.length === 0) return false;
    problems.push({ techniqueId: pool[drawn[bucket]++ % pool.length], bucket });
    return true;
  };

  let unfilled = 0;
  for (const bucket of BUCKETS) {
    for (let i = 0; i < allocation[bucket]; i++) if (!draw(bucket)) unfilled++;
  }
  for (; unfilled > 0; unfilled--) if (!BACKFILL_ORDER.some(draw)) break;
  return problems;
}

/** Client-side composeSession — allocation + deterministic pool draw + guards.
 *  No slot is ever drawn from an empty pool, and whenever any pool has a skill
 *  the session is full (`fillAllocation`). `underfilled` is non-zero only when
 *  every pool is empty. */
export function composeSession(profile: SessionProfile, pools: TechniquePools): ComposedSession {
  const sessionSize = profile.sessionSize ?? 20;
  const opts: ComposeAllocationOptions = {
    persona: profile.persona,
    cluster: profile.cluster,
    hasFluid: pools.fluid.length > 0,
    hasFragile: pools.fragile.length > 0,
    hasFrontier: pools.frontier.length > 0,
  };
  const allocation = composeAllocation(sessionSize, opts);
  const problems = fillAllocation(allocation, pools);

  return {
    allocation,
    problems,
    targetTimeSeconds: targetTimeSeconds(profile.age),
    guards: { ...WRONG_ANSWER_GUARDS },
    underfilled: sessionSize - problems.length,
  };
}
