/**
 * IRT 2PL-lite: one ability θ per subject, refit after every scored attempt.
 * Phase-1 LIVE, client-side (owner decision 2026-10-08, "IRT 2PL-lite (§7.2,
 * item b/a + θ refit)"), plus the 3PL computed in SHADOW only.
 *
 * Spec of record, docs/reference/VMSG_TECHNICAL_ARCHITECTURE.md:
 *   :300  "P(X=1|θ) = c + (1−c)/[1+e^(−a(θ−b))] (IRT-06). θ∈[−3,3]; a∈[0.5,2.5];
 *          c default 0.25. θ refit by Newton-Raphson MLE, stop at |Δθ|<1e-4 or
 *          50 iters (IRT-07/09); SE(θ)=1/√I(θ)."
 *   :328  "IRT 2PL-lite (single θ/subject) | Live"   → c = 0 here.
 *   :329  "IRT 3PL / PFA | Shadow (compute+log)"     → refitTheta3pl, logged only.
 *
 * Everything the spec leaves open is marked [REC] below. Those choices come from
 * the engine-tranche design of 2026-10-09 (§3 I-1, §5 Q26-Q30, Q36, Q37), and
 * the evidence for each one is given beside it.
 *
 * θ is deliberately independent of BKT. It reads no P(L) and writes none, so the
 * BKT simulations and the fluid gate are unaffected by anything in this file.
 * This module imports nothing from bkt.ts or runtime.ts, and a test pins that.
 *
 * PARITY. `packages/psychometrics/fixtures/parity/irt.json` holds inputs and
 * expected outputs for every exported function. The Python port
 * (services/api/app/psychometrics/irt.py, design W1-9) must reproduce them, which
 * means reproducing the numerics as well as the formulas: the branch-stable
 * logistic and softplus, the step rule in `newton`, the 3PL mode grid and run
 * selection in `refit`, and `floor(x + 0.5)` rather than Python's
 * round-half-to-even.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** θ domain (VMSG:300). It is enforced as a hard clamp inside every Newton step;
 *  the spec gives the range but does not say where it is enforced. */
export const THETA_MIN = -3;
export const THETA_MAX = 3;

/** Discrimination domain (VMSG:300). The spec gives only the range, with no seed. */
export const A_MIN = 0.5;
export const A_MAX = 2.5;

/** 3PL pseudo-guessing default (VMSG:300). This is the shadow model only; the live
 *  2PL-lite has c = 0 (VMSG:328). */
export const C_3PL_DEFAULT = 0.25;

/** Newton-Raphson stopping rule (VMSG:300, IRT-07/09). */
export const NEWTON_TOLERANCE = 1e-4;
export const NEWTON_MAX_ITERATIONS = 50;

/** [REC] Q28: MAP with an N(0, 1) prior instead of the spec's MLE.
 *  The MLE of an all-correct or all-wrong pattern is ±∞, and the spec does not
 *  say how to handle that. With a clamp, ONE correct answer sends MLE θ to +3,
 *  which is a duel seed of 1000 + 400·3 = 2200. Over 20,000 random patterns, MLE
 *  plus a clamp hit the 50-iteration cap on 47 of them; MAP needed at most 7
 *  (engine-tranche design calibration, 2026-10-09). The only regulariser in the
 *  corpus is the DI pseudocode's "+0.1 ridge" (vedic_speed_gym_backend.md:2162-2163).
 *  A prior is the principled form of the same thing. Prior mean 0 = the DB default
 *  `user_cognitive_profiles.theta DEFAULT 0.0` (db/postgres/10_create_core.sql:371). */
export const THETA_PRIOR_SD = 1;

/** [REC] Q27: seed discrimination. The spec gives only a ∈ [0.5, 2.5] (VMSG:300).
 *  1.0 is the Rasch-equivalent value inside that range. Calibration (design I-2)
 *  replaces it once an item has ≥ 200 responses. */
export const SEED_A = 1;

/** [REC] Q26: b = difficulty − 3 maps the graph's 1-5 difficulty onto θ's logit
 *  scale, giving b ∈ {−2, …, 2}. RUNTIME_SAFETY_SYSTEM.md:286,299 sets β to the
 *  raw 1-5 value, which against θ ∈ [−3, 3] leaves a θ = 3 learner at P ≤ 0.88
 *  and an average (θ = 0) learner at P ≤ 0.27 even on the easiest item. */
export const DIFFICULTY_CENTRE = 3;
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 5;

/** [REC] Q37 / design I-1: at most this many responses per subject. It bounds the
 *  snapshot, which persists `responses`. When full, the oldest response is
 *  dropped, so θ tracks the learner's recent ability (the same sliding-window
 *  policy as runtime.ts MAX_TRACKED_IDS). */
export const MAX_THETA_RESPONSES = 200;

/** [REC] Q36: the target success probability for difficulty selection.
 *  `_calculate_target_difficulty` is named in vedic_speed_gym_backend.md:1400 but
 *  its body is absent. */
export const TARGET_P_CORRECT = 0.7;

/** Backtracking budget inside one Newton step (see `refit`). It halves the step,
 *  so 30 halvings shrink it below 6·2⁻³⁰ ≈ 6e-9, far under NEWTON_TOLERANCE. */
export const MAX_STEP_HALVINGS = 30;

/** [REC] 3PL mode search (review of 2026-10-09). The 3PL posterior can have two
 *  modes, and a Newton run finds the mode whose basin holds its start. From
 *  θ = 0 alone it returned a local MINIMUM on one pattern, the lower of two
 *  modes on another (−0.7740 against a MAP of 2.0388), and crept for the whole
 *  50 iterations across a convex stretch on a third. So for c > 0 the
 *  log-posterior is first evaluated on MODE_GRID_INTERVALS + 1 points spanning
 *  [THETA_MIN, THETA_MAX], 0.1 apart, at θₖ = THETA_MIN + (k·(THETA_MAX −
 *  THETA_MIN))/MODE_GRID_INTERVALS. Each grid point at least as high as both
 *  of its neighbours starts a further Newton run (only the first of a run of
 *  adjacent such points). The 2PL posterior is log-concave, so it has one mode,
 *  and the 2PL keeps its single run from θ₀. */
export const MODE_GRID_INTERVALS = 60;

/** [REC] A later Newton run replaces the incumbent only when its log-posterior is
 *  higher by more than this. Two runs that end in the same mode differ by
 *  rounding (about 1e-15), so the margin keeps the earlier run's θ instead of
 *  letting the last ulp of exp/log1p choose between two equivalent answers (the
 *  parity concern described in `newton`). Two distinct modes whose heights
 *  differ by less than this are a tie, and the earlier run is kept. */
export const MODE_TIE_MARGIN = 1e-9;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One θ per subject (VMSG:328, "single θ/subject"). Quant is the subject the
 *  practice loop drives; DI is 2PL by definition (VMSG:300, "2PL for DI (c=0)"). */
export type IrtSubject = "quant" | "di";

export interface ItemParams {
  /** Discrimination, a > 0 (spec domain [0.5, 2.5]). */
  a: number;
  /** Difficulty on θ's logit scale. */
  b: number;
  /** Pseudo-guessing, 0 ≤ c < 1. Omitted = 0 = the live 2PL-lite. */
  c?: number;
}

/** What `seedItemParams` returns. It has the same shape as the session item's
 *  `irt` field (design I-2), so a client can fall back to it when an item
 *  arrives without one. */
export interface SeededItemParams {
  a: number;
  b: number;
  source: "seed";
}

/** A scored response as θ sees it. Stored in `ThetaState.responses`. */
export interface IrtResponse {
  problemId: string;
  a: number;
  b: number;
  correct: boolean;
}

/** Persisted in the snapshot under `theta`, one per subject (design I-1).
 *  `theta`, `se` and `n` are always the refit of `responses`, never a partial
 *  update. `recordResponse` returns them together. */
export interface ThetaState {
  subject: IrtSubject;
  theta: number;
  se: number;
  n: number;
  responses: IrtResponse[];
}

/** Input to `recordResponse`. `correct: null` is an ungraded verdict. */
export interface ResponseInput {
  problemId: string;
  a: number;
  b: number;
  correct: boolean | null;
  /** `false` for SANDBOX items (`feeds_mastery: false`). They feed neither BKT nor
   *  θ (design §4.4). Omitted = feeds. */
  feedsMastery?: boolean;
}

export interface RefitOptions {
  /** SD of the N(0, prior²) prior on θ. Must be > 0 (MAP; see THETA_PRIOR_SD). */
  prior?: number;
  /** Newton start. Clamped into [THETA_MIN, THETA_MAX]. For the 3PL it is one
   *  start among the mode-grid starts, tried last (see `refit`). */
  theta0?: number;
  /** Iteration cap for each Newton run, an integer in 1..NEWTON_MAX_ITERATIONS.
   *  Default NEWTON_MAX_ITERATIONS, the spec's 50 (VMSG:300); it can be lowered
   *  to bound the work, never raised past the spec. A fit cut off by the cap
   *  reports `converged: false`. */
  maxIterations?: number;
}

export interface Refit3plOptions extends RefitOptions {
  /** Pseudo-guessing for every item. Default C_3PL_DEFAULT. */
  c?: number;
}

export interface RefitResult {
  theta: number;
  /** Posterior SE, 1/√(I(θ̂) + 1/prior²). */
  se: number;
  /** Newton steps taken by the run that produced θ, 1..NEWTON_MAX_ITERATIONS.
   *  For the 3PL that may be a run started from the mode grid, not from θ₀. */
  iterations: number;
  /** True when that run's last step moved θ by less than NEWTON_TOLERANCE. False
   *  when it hit the iteration cap, or stopped at a stationary point that is not a
   *  maximum (observed information ≤ 0 inside the domain). */
  converged: boolean;
  n: number;
}

/** The `shadow_model_computed` psychometric event payload (design I-4).
 *  `converged` and `iterations` are carried so that a fit which did not converge
 *  is never logged as a valid shadow estimate: this log is the evidence for the
 *  future `irt_3pl_live` decision, and an analysis must be able to exclude such
 *  a row. */
export interface Shadow3plPayload {
  model: "irt_3pl";
  theta: number;
  se: number;
  n: number;
  converged: boolean;
  iterations: number;
}

// ---------------------------------------------------------------------------
// Numerics
// ---------------------------------------------------------------------------

/** Logistic σ(z), evaluated on the branch that cannot overflow. For z < 0,
 *  1/(1+e^(−z)) is evaluated as e^z/(1+e^z). JavaScript would only return 0 on
 *  overflow, but Python's math.exp raises OverflowError, and the port mirrors
 *  this branch. */
function logistic(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** softplus(z) = ln(1 + e^z), stable for large |z|. Then ln σ(z) = −softplus(−z)
 *  and ln(1 − σ(z)) = −softplus(z). */
function softplus(z: number): number {
  return Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
}

function assertFinite(name: string, x: number): void {
  if (typeof x !== "number" || !Number.isFinite(x)) {
    throw new RangeError(`IRT: ${name} must be a finite number, got ${x}`);
  }
}

function assertItem(a: number, b: number): void {
  assertFinite("a", a);
  assertFinite("b", b);
  if (a <= 0) throw new RangeError(`IRT: discrimination a must be > 0, got ${a}`);
}

function assertGuessing(c: number): void {
  assertFinite("c", c);
  if (c < 0 || c >= 1) throw new RangeError(`IRT: guessing c must be in [0, 1), got ${c}`);
}

function clampTheta(theta: number): number {
  return Math.min(THETA_MAX, Math.max(THETA_MIN, theta));
}

/** a into the spec domain [A_MIN, A_MAX] (VMSG:300). `recordResponse` stores the
 *  clamped value and `refit` fits with it, so the same event gives the same θ
 *  through either entry point. */
function clampDiscrimination(a: number): number {
  return Math.min(A_MAX, Math.max(A_MIN, a));
}

/** Per-item quantities at θ. P is never formed as 1 − L, which would lose
 *  precision near 1. L = σ(z) and Lc = σ(−z) = 1 − L are each computed directly.
 *
 *  With P = c + (1−c)L, P' = (1−c)·a·L·Lc and P'' = (1−c)·a²·L·Lc·(Lc − L):
 *    score     ℓ' = u ? P'/P : −P'/(1−P)
 *    observed  J  = −ℓ''
 *    expected  I  = P'²/(P(1−P))   [= a²((1−P)/P)((P−c)/(1−c))², the design's form]
 *  Simplified per case, so no 0/0 can arise:
 *    c = 0:          ℓ' = a(u − L),  J = I = a²·L·Lc
 *    c > 0, wrong:   ℓ' = −a·L,      J = a²·L·Lc
 *    c > 0, correct: ℓ' = (1−c)·a·L·Lc/P,  J = ℓ'² − (1−c)·a²·L·Lc·(Lc − L)/P
 *    c > 0, I = (1−c)·a²·L²·Lc/P
 */
function itemTerms(
  theta: number,
  a: number,
  b: number,
  c: number,
  correct: boolean,
): { score: number; observed: number; expected: number; logLik: number } {
  const z = a * (theta - b);
  const L = logistic(z);
  const Lc = logistic(-z);
  if (c === 0) {
    const info = a * a * L * Lc;
    return correct
      ? { score: a * Lc, observed: info, expected: info, logLik: -softplus(-z) }
      : { score: -a * L, observed: info, expected: info, logLik: -softplus(z) };
  }
  const p = c + (1 - c) * L;
  const expected = ((1 - c) * a * a * L * L * Lc) / p;
  if (!correct) {
    return { score: -a * L, observed: a * a * L * Lc, expected, logLik: Math.log(1 - c) - softplus(z) };
  }
  const score = ((1 - c) * a * L * Lc) / p;
  const observed = score * score - ((1 - c) * a * a * L * Lc * (Lc - L)) / p;
  return { score, observed, expected, logLik: Math.log(p) };
}

type ScoredResponse = Pick<IrtResponse, "a" | "b" | "correct">;

function logPosterior(theta: number, responses: ReadonlyArray<ScoredResponse>, c: number, priorVar: number): number {
  let lp = -(theta * theta) / (2 * priorVar);
  for (const r of responses) lp += itemTerms(theta, r.a, r.b, c, r.correct).logLik;
  return lp;
}

interface NewtonRun {
  theta: number;
  logPosterior: number;
  iterations: number;
  converged: boolean;
}

/**
 * One Newton-Raphson run for the MAP θ (VMSG:300), with a θ clamp and a monotone
 * safeguard, from `start` (already inside [THETA_MIN, THETA_MAX]).
 *
 * Each iteration:
 *   1. g = Σℓ'ᵢ − θ/σ²;  J = ΣJᵢ + 1/σ² (observed);  I = ΣIᵢ + 1/σ² (expected).
 *   2. H = J if J > 0, else I.  For c = 0, J = I > 0 always, so this is exact
 *      Newton. For the 3PL the posterior can be locally convex, and there the
 *      expected information keeps the step an ascent direction.
 *   3. t = θ + g/H and d = clamp(t) − θ. If |d| < NEWTON_TOLERANCE:
 *      - when J ≤ 0 and t lies inside [THETA_MIN, THETA_MAX], θ is a stationary
 *        point that is not a maximum (a local minimum or a flat inflection of a
 *        3PL posterior). The run stops there NOT converged; `refit` discards it
 *        in favour of a run that reaches a mode.
 *      - otherwise take the step: it is the converging step, at a mode (J > 0)
 *        or at a boundary where the clamp cut the step because the gradient
 *        points out of the domain.
 *      Otherwise try θ + d, θ + d/2, θ + d/4, … (at most MAX_STEP_HALVINGS
 *      halvings). Accept the first candidate whose log-posterior is ≥ the
 *      current one. If none qualifies, stay put (Δθ = 0): no ascent is
 *      measurable along an ascent direction, so the run ends converged.
 *   4. Stop when |Δθ| < NEWTON_TOLERANCE (converged) or after `maxIterations`
 *      steps, by default NEWTON_MAX_ITERATIONS (not converged).
 *
 * Why observed information rather than Fisher scoring: for the 3PL, Fisher
 * scoring converges only linearly where J ≪ I. In a 20,000-pattern sweep it
 * hit the 50-iteration cap on 3 patterns, and on others it stopped early
 * because the step was small rather than because θ was close (it stopped
 * 8e-4 short of the mode). The halving keeps the log-posterior non-decreasing,
 * so a run cannot oscillate between two modes. It also cannot leave the basin
 * it starts in, which is why `refit` starts the 3PL from more than one point.
 */
function newton(
  items: ReadonlyArray<ScoredResponse>,
  c: number,
  priorVar: number,
  start: number,
  maxIterations: number,
): NewtonRun {
  let theta = start;
  let iterations = 0;
  let converged = false;
  let current = logPosterior(theta, items, c, priorVar);
  while (iterations < maxIterations) {
    iterations += 1;
    let g = -theta / priorVar;
    let observed = 1 / priorVar;
    let expected = 1 / priorVar;
    for (const r of items) {
      const t = itemTerms(theta, r.a, r.b, c, r.correct);
      g += t.score;
      observed += t.observed;
      expected += t.expected;
    }
    const h = observed > 0 ? observed : expected;
    const target = theta + g / h;
    const full = clampTheta(target) - theta;

    let next = theta;
    let nextLp = current;
    if (Math.abs(full) < NEWTON_TOLERANCE) {
      if (observed <= 0 && target >= THETA_MIN && target <= THETA_MAX) {
        // g ≈ 0 with non-positive curvature: not a maximum. Accepting the tiny
        // step here reported a local minimum of a 3PL posterior as converged.
        break;
      }
      // The converging step is taken without the ascent test. At this size the
      // two log-posteriors differ by about ½·J·d², which falls to rounding noise
      // (≈1e-15) at the end of the iteration. Comparing them would let the last
      // ulp of exp/log1p decide between d and d/2. TS and Python then disagreed
      // by 1.1e-8 on 50 correct answers at a = 2.5, which is outside the parity
      // tolerance. Either result is inside the spec's 1e-4 stopping rule.
      next = theta + full;
      nextLp = logPosterior(next, items, c, priorVar);
    } else {
      let step = full;
      for (let k = 0; k <= MAX_STEP_HALVINGS; k++) {
        const candidate = theta + step;
        const lp = logPosterior(candidate, items, c, priorVar);
        if (lp >= current) {
          next = candidate;
          nextLp = lp;
          break;
        }
        step /= 2;
      }
    }

    const delta = Math.abs(next - theta);
    theta = next;
    current = nextLp;
    if (delta < NEWTON_TOLERANCE) {
      converged = true;
      break;
    }
  }
  return { theta, logPosterior: current, iterations, converged };
}

/** The extra 3PL starts: every point of the MODE_GRID_INTERVALS grid whose
 *  log-posterior is ≥ both neighbours' (an end point has one neighbour), keeping
 *  only the first of adjacent such points, in ascending θ. */
function modeGridStarts(
  items: ReadonlyArray<ScoredResponse>,
  c: number,
  priorVar: number,
): number[] {
  const grid: number[] = [];
  const lps: number[] = [];
  for (let k = 0; k <= MODE_GRID_INTERVALS; k++) {
    const theta = THETA_MIN + (k * (THETA_MAX - THETA_MIN)) / MODE_GRID_INTERVALS;
    grid.push(theta);
    lps.push(logPosterior(theta, items, c, priorVar));
  }
  const starts: number[] = [];
  let previousWasPeak = false;
  for (let k = 0; k <= MODE_GRID_INTERVALS; k++) {
    const peak =
      (k === 0 || lps[k] >= lps[k - 1]) && (k === MODE_GRID_INTERVALS || lps[k] >= lps[k + 1]);
    if (peak && !previousWasPeak) starts.push(grid[k]);
    previousWasPeak = peak;
  }
  return starts;
}

/**
 * MAP θ (VMSG:300). Validates the responses and clamps each a into
 * [A_MIN, A_MAX], exactly as `recordResponse` stores it.
 *
 * Starts: for c = 0, clamp(θ₀) alone (the 2PL posterior has one mode). For
 * c > 0, every `modeGridStarts` point in ascending θ, then clamp(θ₀) last. The
 * grid starts sit near the modes, so the chosen run is normally a short one; θ₀
 * last means the result is never worse than the single run from θ₀.
 *
 * `newton` runs from each start in order. The first run is the incumbent. A
 * later run replaces it when its log-posterior is higher by more than
 * MODE_TIE_MARGIN, or when it converged, the incumbent did not, and the two are
 * within MODE_TIE_MARGIN. The result is the incumbent's θ, iterations and
 * converged, with the SE evaluated at that θ on the same clamped items.
 *
 * Before the grid, the review of 2026-10-09 swept k wrong / m correct patterns
 * at a ∈ {1.5, 2, 2.5} and found 152 where the single run from 0 returned a
 * local minimum, the lower mode, or a run cut off at 50 iterations. The
 * 756-pattern sweep in irt.test.ts finds 43 such patterns for the single run,
 * and none for this refit.
 */
function refit(
  responses: ReadonlyArray<ScoredResponse>,
  c: number,
  options: RefitOptions,
): RefitResult {
  const prior = options.prior ?? THETA_PRIOR_SD;
  assertFinite("prior", prior);
  if (prior <= 0) throw new RangeError(`IRT: prior SD must be > 0 (MAP, design Q28), got ${prior}`);
  const theta0 = options.theta0 ?? 0;
  assertFinite("theta0", theta0);
  const maxIterations = options.maxIterations ?? NEWTON_MAX_ITERATIONS;
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > NEWTON_MAX_ITERATIONS) {
    throw new RangeError(
      `IRT: maxIterations must be an integer in 1..${NEWTON_MAX_ITERATIONS} (VMSG:300), got ${maxIterations}`,
    );
  }
  assertGuessing(c);
  for (const r of responses) {
    assertItem(r.a, r.b);
    if (typeof r.correct !== "boolean") {
      throw new TypeError(`IRT: response.correct must be boolean, got ${r.correct}`);
    }
  }
  const priorVar = prior * prior;
  const items: ScoredResponse[] = responses.map((r) => ({
    a: clampDiscrimination(r.a),
    b: r.b,
    correct: r.correct,
  }));

  const start0 = clampTheta(theta0);
  const starts = c > 0 ? [...modeGridStarts(items, c, priorVar), start0] : [start0];
  let best = newton(items, c, priorVar, starts[0], maxIterations);
  for (const start of starts.slice(1)) {
    const run = newton(items, c, priorVar, start, maxIterations);
    const higher = run.logPosterior > best.logPosterior + MODE_TIE_MARGIN;
    const tiedButConverged =
      run.converged && !best.converged && run.logPosterior >= best.logPosterior - MODE_TIE_MARGIN;
    if (higher || tiedButConverged) best = run;
  }

  return {
    theta: best.theta,
    se: 1 / Math.sqrt(fisherInformation(best.theta, items, c) + 1 / priorVar),
    iterations: best.iterations,
    converged: best.converged,
    n: items.length,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** P(X=1 | θ) = c + (1−c)/[1+e^(−a(θ−b))] (VMSG:300, IRT-06). c defaults to 0, the
 *  live 2PL-lite. At θ = b this is (1 + c)/2: 0.5 for the 2PL and 0.625 for the
 *  3PL shadow. */
export function irtProbability(theta: number, item: ItemParams): number {
  const c = item.c ?? 0;
  assertFinite("theta", theta);
  assertItem(item.a, item.b);
  assertGuessing(c);
  return c + (1 - c) * logistic(item.a * (theta - item.b));
}

/** Test information I(θ) = Σ Iᵢ(θ). The spec gives SE = 1/√I(θ) (VMSG:300) but
 *  does not define I for 2PL-lite.
 *  - 2PL ([REC] Q29): Iᵢ = aᵢ²·Pᵢ(1−Pᵢ).
 *  - 3PL shadow (design I-4): Iᵢ = aᵢ²·((1−Pᵢ)/Pᵢ)·((Pᵢ−c)/(1−c))².
 *  The 3PL form reduces to the 2PL form at c = 0. Information is additive and
 *  strictly positive, so at a fixed θ every added item strictly lowers the SE.
 *
 *  Each item's own `c` is used when it has one, as `irtProbability` does;
 *  the `c` argument is the value for items without one. An `ItemParams[]` that
 *  carries c (item_irt_params has a c column, design I-2) therefore gets the 3PL
 *  information it describes, not the 2PL value. Like `irtProbability`, this
 *  evaluates the model at the a it is given; it does not clamp a. */
export function fisherInformation(
  theta: number,
  items: ReadonlyArray<ItemParams>,
  c = 0,
): number {
  assertFinite("theta", theta);
  assertGuessing(c);
  let info = 0;
  for (const it of items) {
    assertItem(it.a, it.b);
    const itemC = it.c ?? c;
    assertGuessing(itemC);
    // `correct` does not enter the expected information; `true` is arbitrary.
    info += itemTerms(theta, it.a, it.b, itemC, true).expected;
  }
  return info;
}

/**
 * The live θ refit: 2PL-lite (c = 0), MAP under N(0, prior²), clamped to
 * [−3, 3], stopping at |Δθ| < 1e-4 or after 50 iterations (VMSG:300). The SE is
 * the posterior SE 1/√(I + 1/prior²) ([REC] Q28). With prior = 1, 0 responses
 * give θ = 0, SE = 1, which matches the DB defaults (10_create_core.sql:371-372).
 * Each response's a is clamped into [0.5, 2.5] (VMSG:300) before the fit, as
 * `recordResponse` stores it, so both entry points give the same θ for the same
 * events.
 *
 * The result is a pure function of the response list. It starts at `theta0`,
 * not at the previous θ, so the server replay (design W1-9) reproduces it
 * exactly from raw events.
 *
 * Design fixtures (a = 1): 3 correct at b = 0 give θ 0.8797, SE 0.7853. 5 wrong
 * at b = 0 give −1.1775. 2 of 4 at b {−1, 0, 1, 0} give 0.
 */
export function refitTheta(
  responses: ReadonlyArray<ScoredResponse>,
  options: RefitOptions = {},
): RefitResult {
  return refit(responses, 0, options);
}

/**
 * 3PL SHADOW refit, c = 0.25 by default (VMSG:300). It is computed at
 * `session_end` and logged as `shadow_model_computed` (design I-4). It never
 * routes a learner: `irt_3pl_live` stays FALSE (db/postgres/60_fixes.sql:32)
 * until ≥ 200 responses per item (VMSG:329). It uses the same items' a and b,
 * which were seeded or calibrated for the 2PL.
 *
 * The 3PL posterior can have two modes, so this searches the mode grid as well as
 * running from θ₀ (see MODE_GRID_INTERVALS and `refit`), and returns the highest
 * mode found. A single θ (and SE, iterations, converged) is the result.
 */
export function refitTheta3pl(
  responses: ReadonlyArray<ScoredResponse>,
  options: Refit3plOptions = {},
): RefitResult {
  return refit(responses, options.c ?? C_3PL_DEFAULT, options);
}

/** [REC] Q26/Q27: cold-start item parameters from the graph's 1-5 difficulty:
 *  a = 1.0, b = difficulty − 3. A difficulty outside [1, 5] is clamped into it.
 *  A fractional difficulty, such as RUNTIME_SAFETY_SYSTEM.md:286's continuous
 *  `difficulty_observed`, maps linearly. A missing difficulty throws instead of
 *  defaulting to the centre, so an unknown item is never silently treated as an
 *  average one. */
export function seedItemParams(difficulty: number): SeededItemParams {
  assertFinite("difficulty", difficulty);
  const d = Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, difficulty));
  return { a: SEED_A, b: d - DIFFICULTY_CENTRE, source: "seed" };
}

/** A subject's θ before any scored response: θ₀ = 0 ([REC] Q30, the DB default)
 *  and SE = 1. These are what `refitTheta([])` returns under the N(0, 1) prior. */
export function freshThetaState(subject: IrtSubject): ThetaState {
  return { subject, theta: 0, se: 1, n: 0, responses: [] };
}

/**
 * Record one attempt and refit. Returns the SAME state object, unchanged, when
 * the attempt does not count. Callers may test `next === state`.
 *
 * It does not count when:
 *  - the verdict is null (ungraded). A null verdict never moves an estimate
 *    (design §4.4).
 *  - `feedsMastery === false`. SANDBOX items feed neither BKT nor θ (design §4.4).
 *  - this problem id already has a scored response in the window. Only the FIRST
 *    scored attempt per problem counts ([REC] Q37). A repeat is recall of that
 *    item, which breaks IRT's local independence.
 *
 * Otherwise the response is stored with a clamped into [0.5, 2.5] (VMSG:300), so
 * a snapshot never carries an out-of-domain item. The window keeps the latest
 * MAX_THETA_RESPONSES responses, and θ, SE and n are refit together from it.
 *
 * Window edge, deliberate: once a problem has been pushed out of the window by
 * 200 newer scored responses, it counts again if it reappears. Keeping every id
 * ever seen would make the persisted snapshot unbounded. A 200-response gap is
 * the closest available to independence.
 */
export function recordResponse(state: ThetaState, input: ResponseInput): ThetaState {
  if (input.correct === null) return state;
  if (input.feedsMastery === false) return state;
  if (typeof input.problemId !== "string" || input.problemId.length === 0) {
    throw new TypeError("IRT: recordResponse needs a problemId (first-attempt-per-problem rule, Q37)");
  }
  if (typeof input.correct !== "boolean") {
    throw new TypeError(`IRT: correct must be boolean or null, got ${input.correct}`);
  }
  assertItem(input.a, input.b);
  if (state.responses.some((r) => r.problemId === input.problemId)) return state;

  const response: IrtResponse = {
    problemId: input.problemId,
    a: clampDiscrimination(input.a),
    b: input.b,
    correct: input.correct,
  };
  const responses = [...state.responses, response].slice(-MAX_THETA_RESPONSES);
  const fit = refitTheta(responses);
  return { ...state, theta: fit.theta, se: fit.se, n: fit.n, responses };
}

/**
 * [REC] Q36: the difficulty level (1-5) at which this learner's P(correct) is
 * nearest P* = 0.70 under the seed mapping b = d − 3:
 *   d* = clamp(floor(3 + θ − ln(P* / (1 − P*)) / a + 0.5), 1, 5)
 * The design aims at P* = 0.70 and selects within ±1 of d*. Selection belongs to
 * the session composer, not to this function.
 *
 * Rounding is floor(x + 0.5), so halves round up. Python's round() rounds half
 * to even and would disagree on exact halves; the parity fixture has a tie case.
 */
export function targetDifficulty(theta: number, a = SEED_A, pTarget = TARGET_P_CORRECT): number {
  assertFinite("theta", theta);
  assertFinite("a", a);
  assertFinite("pTarget", pTarget);
  if (a <= 0) throw new RangeError(`IRT: discrimination a must be > 0, got ${a}`);
  if (pTarget <= 0 || pTarget >= 1) throw new RangeError(`IRT: pTarget must be in (0, 1), got ${pTarget}`);
  const x = DIFFICULTY_CENTRE + theta - Math.log(pTarget / (1 - pTarget)) / a;
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, Math.floor(x + 0.5)));
}

/**
 * The `shadow_model_computed` payload for this subject's 3PL shadow (design I-4),
 * or null for DI. The 3PL is specified for Quant only; DI is "2PL (c=0)" by
 * definition (VMSG:300), so a DI 3PL shadow would log a model the spec does not
 * contain.
 *
 * `converged` and `iterations` travel with the estimate. A fit that did not
 * converge is still logged, so the shadow evidence is not silently thinned, but
 * it is marked, so the `irt_3pl_live` analysis can exclude or inspect it.
 */
export function shadow3plPayload(state: ThetaState): Shadow3plPayload | null {
  if (state.subject !== "quant") return null;
  const fit = refitTheta3pl(state.responses);
  return {
    model: "irt_3pl",
    theta: fit.theta,
    se: fit.se,
    n: fit.n,
    converged: fit.converged,
    iterations: fit.iterations,
  };
}
