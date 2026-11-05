/**
 * Bayesian Knowledge Tracing — RFP-exact (BKT-01..11).
 * Update = Bayesian posterior on the observation, then the learn step with the
 * flat P(T)=0.14 (VMSG_TECHNICAL_ARCHITECTURE.md:290-293), then the clamp.
 * P(L)=0.35 + one correct answer → 0.748764; two → 0.9403.
 *
 * The pre-loss build's demo read 0.8247 after one correct answer: that was the
 * deleted difficulty-scaled learn rate (L1=0.40), not the RFP. See constants.ts.
 */
import { BktParams, RFP_BKT_PARAMS, FLUID_GATE, P_L_FLOOR, P_L_CEIL } from "./constants";

export function validateParams(params: BktParams): void {
  if (params.pSlip + params.pGuess >= 1) {
    throw new Error(`BKT identifiability violated: P(S)+P(G) must be < 1 (BKT-06), got ${params.pSlip + params.pGuess}`);
  }
}

/** P(L | observation) — BKT-07/08. */
export function posterior(pL: number, correct: boolean, params: BktParams = RFP_BKT_PARAMS): number {
  validateParams(params);
  const { pSlip, pGuess } = params;
  if (correct) {
    const num = pL * (1 - pSlip);
    return num / (num + (1 - pL) * pGuess);
  }
  const num = pL * pSlip;
  return num / (num + (1 - pL) * (1 - pGuess));
}

/** Hold P(L) inside [P_L_FLOOR, P_L_CEIL]. Without it P(L) reaches float 1.0
 *  and a wrong answer can no longer lower it (constants.ts, P_L_CEIL). A NaN is
 *  passed through rather than turned into a plausible number: callers validate
 *  at the boundary (hydration), and NaN on screen is loud where 0.1% is not. */
export function clampPL(p: number): number {
  return Math.min(P_L_CEIL, Math.max(P_L_FLOOR, p));
}

/** Learn step after each attempt, correct or wrong (VMSG:293):
 *  P(L)' = P(L|obs) + (1 − P(L|obs))·P(T), with P(T) = params.pTransit = 0.14
 *  ALWAYS. Item difficulty no longer reaches BKT; it is kept on the attempt for
 *  IRT seeding and logging only. */
export function learnStep(pPosterior: number, params: BktParams = RFP_BKT_PARAMS): number {
  return pPosterior + (1 - pPosterior) * params.pTransit;
}

/** Full BKT update: posterior, then learn, then clamp. The input is clamped
 *  too, so a saturated 1.0 from an older snapshot still drops on a wrong
 *  answer instead of sitting at 1.0 forever. */
export function updateBkt(pL: number, correct: boolean, params: BktParams = RFP_BKT_PARAMS): number {
  return clampPL(learnStep(posterior(clampPL(pL), correct, params), params));
}

/** Inter-session decay: P(L)·(1 − P(F))^days, days = WHOLE days since the last
 *  scored attempt. This is the owner's per-day reading
 *  (owner-decisions-2026-10-08:12-13), replacing BKT-09's (1−P(F))^(d/45)
 *  (VMSG:294). The architecture's own decision row supports it: "0.02/day
 *  rejected (2.24% residual at 180d)" (architecture/INDEX.md:320) is only the
 *  same order as 0.98^180 = 2.6%, never 0.98^(180/45) = 92%.
 *  0.95 after 14 days → 0.861020 (the d/45 reading gave 0.947926).
 *  Pure: decay is always computed from the stored value, never on top of an
 *  already-decayed one — runtime.ts `effectiveState` holds that invariant. */
export function decayMastery(pL: number, days: number, params: BktParams = RFP_BKT_PARAMS): number {
  if (days <= 0) return pL;
  return clampPL(pL * Math.pow(1 - params.pForget, days));
}

/** Fluid gate (BKT-10, ROU-02): P(L) ≥ 0.85. */
export function isFluid(pL: number): boolean {
  return pL >= FLUID_GATE;
}

/** BKT probability → 0–100 mastery score (SHARED_REFERENCE §5.2). */
export function bktToMastery(pLearned: number): number {
  return pLearned * 100;
}

// `classifyBkt` was deleted on 2026-09-18. It classified on P(L) alone, on a
// scale ("fluid" / "proficient" / "learning") that nothing else used, and no
// production path ever called it — a second classifier whose shared vocabulary
// hid the fact that the documented P(L) gate was unwired. `nextState` in
// runtime.ts is THE transition (`classifyState` its memoryless entry test);
// `isFluid` is the posterior condition of both.
//
// Its remnants went the same day, once the limits sweep learned to read
// gate-shaped names: the `BktState` union, its docstring ("0.85 / 0.60", naming
// a function that no longer existed) and `PROFICIENT_GATE = 0.6` in
// constants.ts, which no code had ever read. A dead band left in the vocabulary
// is an invitation to classify against it.

/** Empirical-Bayes shrinkage of the prior once n ≥ 20 attempts exist (BKT-11):
 *  blend the fixed prior toward the observed correct-rate, weight n/(n+n0). */
export function shrinkPrior(prior: number, observedRate: number, n: number, n0 = 20): number {
  if (n < 20) return prior;
  return (n0 * prior + n * observedRate) / (n0 + n);
}
