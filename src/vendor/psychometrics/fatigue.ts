/**
 * Fatigue index (COG-06) and its checkpoint (COG-08) — DFV §7.6, live in
 * Phase 1 by owner decision (MEM/owner-decisions-2026-10-08.md:10-11; VMSG:332).
 *
 * The composite `0.40·F_latency + 0.35·F_accuracy + 0.25·F_entropy` is VMSG:313;
 * VMSG never defines the three terms, so they are `computeFatigueIndex` from
 * ARCH/architecture_review.md:444-466 verbatim (the W3 function named by
 * ARCH/complete_coder_spec.md:497), including its POPULATION standard deviation
 * (÷5, AR:459) — design fixture B (2.046904) only reproduces with ÷5.
 *
 * This module never sees a `TechniqueState`: it takes the state NAME only, so it
 * cannot write P(L), the BKT state or θ (design §2: "DFV never writes P(L)").
 *
 * Code names follow design Q22: `fatigueIndex`, never a bare "dfv" — the acronym
 * has three expansions across the sources. Only the wire fields keep `dfv_score`.
 */
import type { TechniqueStateName } from "@vmsg/shared-types";
import { ansBaselineMs } from "./calibration";

// ── constants (each with its source) ─────────────────────────────────────────

/** COG-06 weights, VMSG:313. NOT `user_cognitive_profiles.dfv_weights`
 *  (10_create_core.sql:394-396), which holds unrelated weights — design Q23. */
export const FATIGUE_WEIGHTS = { latency: 0.4, accuracy: 0.35, entropy: 0.25 } as const;

/** Coordinator default Q4 (2026-10-09, recorded as a default, reversible): the
 *  weights above are PROVISIONAL. They are VMSG:313's literals, never fitted to
 *  this composite (Q13: the mature gate catches 7.2% of a drifting cohort). No
 *  refit now; every raw term is logged and every `fatigue_index_computed`
 *  payload carries `provisional: true` so a later refit can tell these rows
 *  apart. Flip to false only together with fitted weights. */
export const FATIGUE_WEIGHTS_PROVISIONAL = true;

/** AR:445-446: the accuracy term reads the last 10 attempts, latency and entropy the last 5. */
export const FATIGUE_ACCURACY_WINDOW = 10;
export const FATIGUE_LATENCY_WINDOW = 5;

/** AR:454: accuracy below 70% starts to count as decay. */
export const FATIGUE_ACCURACY_FLOOR = 0.7;

/** AR:461: "population average CoV for fluent math". */
export const FATIGUE_BASELINE_COV = 0.15;

/** Checkpoint cadence: every 5 problems (ARCH/telemetry_architecture.md:1182;
 *  ARCH/decision_engine/INDEX.md:152). */
export const FATIGUE_CHECKPOINT_EVERY = 5;

/** [REC] At least the formula's own window of scored attempts before the index is
 *  computed. AR divides by a fixed 10 (AR:453), so fewer attempts would read as
 *  missed answers and inflate the accuracy term. */
export const FATIGUE_MIN_SCORED = FATIGUE_ACCURACY_WINDOW;

/** AR:479: `sessionElapsed > 20 * 60` seconds. */
export const FATIGUE_ELAPSED_GATE_S = 20 * 60;

/** [REC, Q15] Under-13s: the gate is min(20 min, cap/2). The kids cap is 10 min,
 *  parent maximum 20 (services/api/app/social/policy.py:21-22), so a strict
 *  `> 20 min` gate could never fire for a child. This is the cap used when the
 *  caller does not pass the learner's own cap. */
export const KIDS_DEFAULT_SESSION_CAP_MIN = 10;

/** [REC, Q17] When the warm-up baseline is absent: the median of the first 5
 *  scored attempts this session, flagged `baseline_source: "session"`. */
export const SESSION_BASELINE_N = 5;

/** [REC] The smallest usable ANS baseline, warm-up or session: one clock tick.
 *  Response times are millisecond differences, so a median below 1 ms is not a
 *  reaction-time measurement; such a baseline (a subnormal 5e-324, say) would
 *  turn an ordinary latency into Infinity. Below it the warm-up value is treated
 *  as absent (→ the session fallback) and a session median as no baseline. */
export const MIN_BASELINE_MS = 1;

/** Band names follow ARCH/telemetry_architecture.md:713 (5 bands; Q21). */
export type FatigueAgeGroup =
  | "kids_8_12"
  | "teens_13_17"
  | "young_adult_18_25"
  | "professional_26_40"
  | "mature_40_plus";

/** COG-08 thresholds, VMSG:313 (kids 1.50 / teens 1.80 / pros 2.00 / mature 2.50),
 *  split into AR:469-475's five bands, which put young_adult and professional
 *  both at 2.00. Q13: these are called z-scores but the composite is a ratio sum
 *  — they are implemented literally and are uncalibrated (the mature gate catches
 *  7.2% of a +5%/problem drifting cohort); every term is logged for a refit. */
export const FATIGUE_THRESHOLDS: Readonly<Record<FatigueAgeGroup, number>> = {
  kids_8_12: 1.5,
  teens_13_17: 1.8,
  young_adult_18_25: 2.0,
  professional_26_40: 2.0,
  mature_40_plus: 2.5,
};

// ── age ──────────────────────────────────────────────────────────────────────

/**
 * [REC, Q21] ≤ 12 kids, 13–17 teens, 18–25 young adult, 26–40 professional,
 * ≥ 41 mature. Age 40 is claimed by both AR:314 ("26–40") and AR:315 ("40+");
 * it goes to professional. Fractional ages floor (12.9 years old is 12).
 *
 * Unknown age returns `null`, NOT a band: null gets the kids threshold
 * (`fatigueThreshold`) AND the kids elapsed gate (`fatigueElapsedGateS`), while
 * the event still says the age was unknown instead of claiming the learner is a
 * child (coordinator default Q3, 2026-10-09 — see the note below).
 */
export function ageGroup(age: number | null | undefined): FatigueAgeGroup | null {
  if (age === null || age === undefined || !Number.isFinite(age) || age < 0) return null;
  const years = Math.floor(age);
  if (years <= 12) return "kids_8_12";
  if (years <= 17) return "teens_13_17";
  if (years <= 25) return "young_adult_18_25";
  if (years <= 40) return "professional_26_40";
  return "mature_40_plus";
}

// UNKNOWN AGE — coordinator default Q3 (2026-10-09, recorded as a default,
// reversible): until the client sends an age, an unknown age is treated as a
// child for fatigue — the kids THRESHOLD (1.50) AND the kids GATE
// (min(20 min, cap/2): 300 s with the default 10-minute cap). COPPA-conservative,
// after the house rule that unknown is not adult
// (services/api/app/routers/internal.py:202-204).
// This deliberately overrides the Phase-A review's defect 2, which proposed the
// 20-minute gate for unknown age because the server's `policy.is_kid(None)` is
// False (so no 10-minute cap applies to it): the default chose the protective
// reading for both halves. The client sends no age today (design W1-7), so in
// practice every learner currently gets the 1.50 threshold and the 300 s gate.

/** The trigger threshold; unknown age gets the kids (most protective) value (Q21, default Q3). */
export function fatigueThreshold(group: FatigueAgeGroup | null): number {
  return FATIGUE_THRESHOLDS[group ?? "kids_8_12"];
}

/** Seconds of session that must have elapsed (strictly) before the index is
 *  evaluated: AR:479's 20 min, or min(20 min, cap/2) for a child [REC, Q15] —
 *  and for an unknown age (coordinator default Q3, 2026-10-09, above). A
 *  missing or unusable cap means the kids default of 10 minutes. */
export function fatigueElapsedGateS(group: FatigueAgeGroup | null, sessionCapMin?: number | null): number {
  if (group !== null && group !== "kids_8_12") return FATIGUE_ELAPSED_GATE_S;
  const cap =
    sessionCapMin !== null && sessionCapMin !== undefined && Number.isFinite(sessionCapMin) && sessionCapMin > 0
      ? sessionCapMin
      : KIDS_DEFAULT_SESSION_CAP_MIN;
  return Math.min(FATIGUE_ELAPSED_GATE_S, (cap * 60) / 2);
}

// ── the index ────────────────────────────────────────────────────────────────

/** One scored attempt (a known correct/wrong verdict), in milliseconds. */
export interface FatigueAttempt {
  timeSpentMs: number;
  correct: boolean;
}

export interface FatigueIndex {
  /** The weighted composite. */
  fi: number;
  /** Raw (unweighted) terms, logged for the quarterly refit (Q13). */
  latency: number;
  accuracy: number;
  entropy: number;
}

function isValidTime(t: number): boolean {
  return Number.isFinite(t) && t >= 0;
}

/** The AR:444-466 arithmetic itself, unchecked. A finite but absurd input (a
 *  time near 3.6e307 ms, whose five-sum overflows; spreads past ~1e154 ms, whose
 *  squared deviations overflow; a subnormal baseline) yields Infinity or NaN
 *  here — callers must check `isFiniteIndex`. */
function indexTerms(baselineMs: number, attempts: readonly FatigueAttempt[]): FatigueIndex {
  const recent = attempts.slice(-FATIGUE_ACCURACY_WINDOW);
  const times = attempts.slice(-FATIGUE_LATENCY_WINDOW).map((a) => a.timeSpentMs);

  // Term 1, latency degradation (AR:449-450).
  const mean = times.reduce((s, t) => s + t, 0) / FATIGUE_LATENCY_WINDOW;
  const latency = mean / baselineMs;

  // Term 2, accuracy decay (AR:453-454).
  const rollingAccuracy = recent.filter((a) => a.correct).length / FATIGUE_ACCURACY_WINDOW;
  const accuracy = Math.max(0, (FATIGUE_ACCURACY_FLOOR - rollingAccuracy) / FATIGUE_ACCURACY_FLOOR);

  // Term 3, response entropy = coefficient of variation over the population sd
  // (AR:457-462). All-zero times have no spread, so the term is 0, not 0/0.
  const variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / FATIGUE_LATENCY_WINDOW;
  const entropy = mean > 0 ? Math.sqrt(variance) / mean / FATIGUE_BASELINE_COV : 0;

  const fi =
    FATIGUE_WEIGHTS.latency * latency + FATIGUE_WEIGHTS.accuracy * accuracy + FATIGUE_WEIGHTS.entropy * entropy;
  return { fi, latency, accuracy, entropy };
}

function isFiniteIndex(ix: FatigueIndex): boolean {
  return Number.isFinite(ix.fi) && Number.isFinite(ix.latency) && Number.isFinite(ix.accuracy) && Number.isFinite(ix.entropy);
}

/**
 * AR:444-466 verbatim. Requires a positive baseline and at least 10 attempts with
 * finite, non-negative times, and the result must be finite; anything else is a
 * caller error and THROWS, because a silently-zero or NaN term would read as
 * "not fatigued" (the plausible-failure pattern: `NaN > threshold` is false).
 * `fatigueCheckpoint` never throws on such inputs — it skips with a reason.
 *
 * Monotonicity, as it really is (the design's "non-decreasing in each latency"
 * is false — see tests/fatigue.test.ts): the latency TERM rises with every time;
 * the composite rises under a uniform slowdown and when the slowest time rises
 * (Bhatia–Davis: sd² ≤ (max−mean)(mean−min) ≤ (max−mean)·mean for times ≥ 0),
 * but raising a time that sits below the mean lowers the entropy term and can
 * lower the composite.
 */
export function computeFatigueIndex(baselineMs: number, attempts: readonly FatigueAttempt[]): FatigueIndex {
  if (!Number.isFinite(baselineMs) || baselineMs <= 0) {
    throw new RangeError(`fatigue index needs a positive ans baseline, got ${baselineMs}`);
  }
  if (attempts.length < FATIGUE_ACCURACY_WINDOW) {
    throw new RangeError(
      `fatigue index needs ${FATIGUE_ACCURACY_WINDOW} scored attempts (AR:453 divides by 10), got ${attempts.length}`,
    );
  }
  const times = attempts.slice(-FATIGUE_LATENCY_WINDOW).map((a) => a.timeSpentMs);
  if (!times.every(isValidTime)) {
    throw new RangeError(`fatigue index needs finite non-negative times, got [${times.join(", ")}]`);
  }
  const index = indexTerms(baselineMs, attempts);
  if (!isFiniteIndex(index)) {
    throw new RangeError(
      `fatigue index is not finite for times [${times.join(", ")}] against baseline ${baselineMs} ms (overflow)`,
    );
  }
  return index;
}

// ── the checkpoint ───────────────────────────────────────────────────────────

export type FatigueSkipReason =
  /** Not a multiple of 5 scored attempts: no checkpoint, no event. */
  | "not_checkpoint"
  /** Fewer than 10 scored attempts this session [REC]. */
  | "too_few_attempts"
  /** AR:479: evaluated only while the current technique is fluid ("not learning curves", Q16). */
  | "not_fluid"
  /** AR:479 / Q15: session not yet past the elapsed gate. */
  | "elapsed_gate"
  /** A time in the window is negative or not a number, or so large (though
   *  finite) that the index overflows to Infinity/NaN. */
  | "invalid_attempts"
  /** No warm-up baseline and no session fallback (Q17). */
  | "no_baseline";

export type BaselineSource = "warmup" | "session";

/** `fatigue_index_computed`, psychometric, never sampled (services/api/app/telemetry.py:80).
 *  The fields of design §4.3 (after AR:808-825 and
 *  ARCH/telemetry_architecture.md:1325) plus `provisional` (coordinator default
 *  Q4, 2026-10-09): true while `FATIGUE_WEIGHTS_PROVISIONAL`, on every event. */
export interface FatigueIndexComputedPayload {
  evaluated: boolean;
  skip_reason: FatigueSkipReason | null;
  dfv_score: number | null;
  latency_term: number | null;
  accuracy_term: number | null;
  entropy_term: number | null;
  age_group: FatigueAgeGroup | null;
  age_threshold: number;
  exceeded: boolean;
  technique_state: TechniqueStateName | null;
  window_n: number;
  ans_baseline_ms: number | null;
  baseline_source: BaselineSource | null;
  session_elapsed_ms: number;
  /** The weights that produced `dfv_score` are unfitted (default Q4). */
  provisional: boolean;
}

export const FATIGUE_INDEX_COMPUTED_EVENT = "fatigue_index_computed" as const;

function assertFiniteOrNull(name: string, v: number | null): void {
  if (v !== null && !Number.isFinite(v)) throw new RangeError(`${name} must be finite or null, got ${v}`);
}

/** Builds the payload with exactly the §4.3 keys plus `provisional`. Numbers must
 *  be finite: a NaN would serialise to `null` and be indistinguishable from "not
 *  computed". `provisional` is not an input: it is `FATIGUE_WEIGHTS_PROVISIONAL`. */
export function fatigueIndexComputedPayload(p: {
  evaluated: boolean;
  skipReason: FatigueSkipReason | null;
  index: FatigueIndex | null;
  ageGroup: FatigueAgeGroup | null;
  ageThreshold: number;
  exceeded: boolean;
  techniqueState: TechniqueStateName | null;
  windowN: number;
  ansBaselineMs: number | null;
  baselineSource: BaselineSource | null;
  sessionElapsedMs: number;
}): FatigueIndexComputedPayload {
  const payload: FatigueIndexComputedPayload = {
    evaluated: p.evaluated,
    skip_reason: p.skipReason,
    dfv_score: p.index?.fi ?? null,
    latency_term: p.index?.latency ?? null,
    accuracy_term: p.index?.accuracy ?? null,
    entropy_term: p.index?.entropy ?? null,
    age_group: p.ageGroup,
    age_threshold: p.ageThreshold,
    exceeded: p.exceeded,
    technique_state: p.techniqueState,
    window_n: p.windowN,
    ans_baseline_ms: p.ansBaselineMs,
    baseline_source: p.baselineSource,
    session_elapsed_ms: p.sessionElapsedMs,
    provisional: FATIGUE_WEIGHTS_PROVISIONAL,
  };
  for (const k of ["dfv_score", "latency_term", "accuracy_term", "entropy_term", "ans_baseline_ms"] as const) {
    assertFiniteOrNull(k, payload[k]);
  }
  for (const k of ["age_threshold", "window_n", "session_elapsed_ms"] as const) {
    if (!Number.isFinite(payload[k])) throw new RangeError(`${k} must be finite, got ${payload[k]}`);
  }
  if (p.exceeded && !p.evaluated) throw new RangeError("exceeded requires evaluated: only an evaluated index triggers");
  return payload;
}

export interface FatigueCheckpointContext {
  /** This session's scored attempts, oldest first. The last 10 feed the index;
   *  the first 5 feed the session baseline fallback, so pass the whole session
   *  when there is no warm-up baseline. Attempts with no verdict are not scored. */
  attempts: readonly FatigueAttempt[];
  /** Warm-up ANS baseline (calibration.ts `ansBaselineMs`); absent, not finite
   *  or below `MIN_BASELINE_MS` (0 included) → the session fallback. */
  baselineMs?: number | null;
  /** `ageGroup(age)`; null = unknown age → kids threshold AND kids gate
   *  (coordinator default Q3, 2026-10-09). */
  ageGroup: FatigueAgeGroup | null;
  /** The CURRENT technique's state name — never the state object. */
  techniqueState: TechniqueStateName | null;
  /** Seconds since session_start. Must be finite, also once in milliseconds
   *  (the event carries `session_elapsed_ms`): the page's own clock, so a value
   *  that is not is a caller error and throws, like NaN. */
  sessionElapsedS: number;
  /** The learner's session cap in minutes (kids and unknown age only;
   *  policy.py:21-22). Absent → the kids default of 10. */
  sessionCapMin?: number | null;
  /** Scored attempts this session — the checkpoint counter. Defaults to
   *  `attempts.length`; larger means `attempts` is a trailing window, and then
   *  the session baseline fallback cannot be computed. */
  scoredCount?: number;
}

export interface FatigueCheckpoint {
  /** The checkpoint's identity, used by `stepClr` to stay idempotent. */
  scoredCount: number;
  /** True only when every gate passed and the index was compared to the threshold. */
  evaluated: boolean;
  skipReason?: FatigueSkipReason;
  /** The index, present only when evaluated. */
  fi?: number;
  threshold: number;
  /** `fi > threshold` (strict, AR:485; Q12), and only when evaluated. The ONLY trigger signal. */
  exceeded: boolean;
  /** Emit at every checkpoint (every 5 scored attempts); null off a checkpoint. */
  event: FatigueIndexComputedPayload | null;
}

function resolveBaseline(
  ctx: FatigueCheckpointContext,
  scoredCount: number,
): { ms: number; source: BaselineSource } | null {
  const warm = ctx.baselineMs;
  if (warm !== null && warm !== undefined && Number.isFinite(warm) && warm >= MIN_BASELINE_MS) {
    return { ms: warm, source: "warmup" };
  }
  // The fallback needs the session's FIRST 5 attempts; a trailing window does not have them.
  if (ctx.attempts.length !== scoredCount || ctx.attempts.length < SESSION_BASELINE_N) return null;
  const first = ctx.attempts.slice(0, SESSION_BASELINE_N).map((a) => a.timeSpentMs);
  if (!first.every(isValidTime)) return null;
  const median = ansBaselineMs(first);
  return median >= MIN_BASELINE_MS ? { ms: median, source: "session" } : null;
}

/**
 * Called after every scored attempt (or only every 5th); does nothing off a
 * checkpoint. At a checkpoint it always returns an event — skipped checkpoints
 * included, so the refit sees how often the gates hold the index back.
 *
 * [REC] The raw terms are logged whenever they are computable, even when a gate
 * (not fluid, elapsed) skips the evaluation: Q13 asks for every term to be
 * logged so the uncalibrated thresholds can be refitted, and with the fluid-only
 * gate (Q16) almost every early checkpoint would otherwise log nothing.
 * `exceeded` stays false unless the index was evaluated — consumers trigger on
 * `exceeded`, never on `dfv_score`.
 */
export function fatigueCheckpoint(ctx: FatigueCheckpointContext): FatigueCheckpoint {
  const scoredCount = ctx.scoredCount ?? ctx.attempts.length;
  const threshold = fatigueThreshold(ctx.ageGroup);
  if (!Number.isInteger(scoredCount) || scoredCount <= 0 || scoredCount % FATIGUE_CHECKPOINT_EVERY !== 0) {
    return { scoredCount, evaluated: false, skipReason: "not_checkpoint", threshold, exceeded: false, event: null };
  }
  const sessionElapsedMs = Math.round(ctx.sessionElapsedS * 1000);
  if (!Number.isFinite(sessionElapsedMs)) {
    throw new RangeError(`sessionElapsedS must be finite in seconds and in milliseconds, got ${ctx.sessionElapsedS}`);
  }

  const windowN = Math.min(FATIGUE_ACCURACY_WINDOW, ctx.attempts.length);
  const enoughAttempts = scoredCount >= FATIGUE_MIN_SCORED && ctx.attempts.length >= FATIGUE_ACCURACY_WINDOW;
  const windowValid = ctx.attempts.slice(-FATIGUE_LATENCY_WINDOW).every((a) => isValidTime(a.timeSpentMs));
  const baseline = resolveBaseline(ctx, scoredCount);
  // Never `computeFatigueIndex` here: it throws on an overflowing (finite but
  // absurd) window, and a checkpoint skips instead.
  const raw = enoughAttempts && windowValid && baseline ? indexTerms(baseline.ms, ctx.attempts) : null;
  const overflow = raw !== null && !isFiniteIndex(raw);
  const index = raw !== null && !overflow ? raw : null;

  let skipReason: FatigueSkipReason | undefined;
  if (!enoughAttempts) skipReason = "too_few_attempts";
  else if (ctx.techniqueState !== "fluid") skipReason = "not_fluid";
  else if (!(ctx.sessionElapsedS > fatigueElapsedGateS(ctx.ageGroup, ctx.sessionCapMin))) skipReason = "elapsed_gate";
  else if (!windowValid || overflow) skipReason = "invalid_attempts";
  else if (!baseline) skipReason = "no_baseline";

  const evaluated = skipReason === undefined && index !== null;
  const exceeded = evaluated && index !== null && index.fi > threshold;
  const event = fatigueIndexComputedPayload({
    evaluated,
    skipReason: skipReason ?? null,
    index,
    ageGroup: ctx.ageGroup,
    ageThreshold: threshold,
    exceeded,
    techniqueState: ctx.techniqueState,
    windowN,
    ansBaselineMs: baseline?.ms ?? null,
    baselineSource: baseline?.source ?? null,
    sessionElapsedMs,
  });

  const out: FatigueCheckpoint = { scoredCount, evaluated, threshold, exceeded, event };
  if (skipReason !== undefined) out.skipReason = skipReason;
  if (evaluated && index !== null) out.fi = index.fi;
  return out;
}
