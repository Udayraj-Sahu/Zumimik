/**
 * Canonical Decision-Engine constants.
 * BKT priors are RFP v7.2 BKT-01..05 (the RFP wins over the older v5.2
 * SHARED_REFERENCE values); the allocation / guard / persona tables are
 * SHARED_REFERENCE.md §2/§6/§9/§11; the state-machine thresholds are
 * SHARED_REFERENCE.md:234-236.
 */
import type { WrongAnswerGuards } from "@vmsg/shared-types";

export interface BktParams {
  pInit: number;    // P(L0)
  pTransit: number; // P(T)
  pSlip: number;    // P(S)
  pGuess: number;   // P(G)
  pForget: number;  // P(F) per day
}

/** VMSG_TECHNICAL_ARCHITECTURE.md:290 (BKT-01..05). P(T)=0.14 applies to EVERY
 *  attempt; P(F)=0.007 is per whole day (owner-decisions-2026-10-08:12-13). */
export const RFP_BKT_PARAMS: BktParams = {
  pInit: 0.35,
  pTransit: 0.14,
  pSlip: 0.1,
  pGuess: 0.2,
  pForget: 0.007,
};

// `LEARN_RATE_BY_DIFFICULTY` (L1=0.40 … L5=0.15, SHARED_REFERENCE.md:176) was
// deleted on 2026-10-09. It overrode the RFP's P(T)=0.14 on every attempt that
// carried a difficulty — i.e. every attempt the practice page made — so the
// displayed mastery ran 29-46% hot (TEST_REPORT_2026-10-05_wave1.md:37). The RFP
// wins (VMSG:13) and the owner confirmed P(T)=0.14. The pre-loss build used the
// table: its demo "0.35 + one correct L1 answer = 0.8247" is that table's number,
// not the RFP's (0.7488).

/** P(L) is held inside [P_L_FLOOR, P_L_CEIL] after every update, decay and
 *  hydration. No source specifies a clamp; without one P(L) reaches float 1.0
 *  after ~23 corrects and then no wrong answer can lower it, because the wrong
 *  posterior's (1−P(L)) term is 0 (TEST_REPORT_2026-10-05_wave1.md:36). At the
 *  ceiling three consecutive wrongs fall below the fluid gate
 *  (0.999 → 0.993168 → 0.955140 → 0.765120), the same count that makes a
 *  technique fractured (SHARED_REFERENCE.md:236). */
export const P_L_FLOOR = 0.001;
export const P_L_CEIL = 0.999;

/** One day in ms. Decay counts WHOLE days since the last scored attempt. */
export const DAY_MS = 86_400_000;

/** BKT-10 / ROU-02. Read by `isFluid`, which `classifyState` / `nextState`
 *  call — one of five conditions for entering "fluid", and the condition for
 *  staying there. See runtime.ts.
 *  (`PROFICIENT_GATE = 0.6` stood here unread by anything; deleted with the
 *  rest of `classifyBkt` on 2026-09-18.) */
export const FLUID_GATE = 0.85;

// ── Technique state machine (SHARED_REFERENCE.md:234-236; DES spec :49-51) ────

/** Entering fluid needs a streak this long (SHARED_REFERENCE.md:234). */
export const FLUID_STREAK = 5;
/** …and a mastery score at least this high (SHARED_REFERENCE.md:234). */
export const FLUID_MASTERY_SCORE = 80;
/** Below this mastery score a technique is fractured (SHARED_REFERENCE.md:236). */
export const FRACTURED_MASTERY_SCORE = 50;
/** This many consecutive wrongs make a technique fractured (SHARED_REFERENCE.md:236). */
export const FRACTURED_ERRORS = 3;
/** Leaving fractured takes this many consecutive corrects (SHARED_REFERENCE.md:236). */
export const FRACTURED_EXIT_STREAK = 2;

/** The mastery score's accuracy input is the last N scored attempts, not
 *  lifetime accuracy. The formula is unchanged (DES spec :38-41); only its input
 *  is windowed. Under lifetime accuracy a learner who guessed 200 times and
 *  then answers at 90% almost never reaches fluid in the next 200 attempts;
 *  windowed, the median is 14 (engine-tranche design 2026-10-09, Q5). */
export const ACCURACY_WINDOW = 10;

/** Chance accuracy of the guesser the evidence test must reject: a 4-option
 *  MCQ. Used ONLY by the evidence test; BKT keeps P(G)=0.20 (design Q39). */
export const GUESS_CEILING = 0.25;

/** Fluid needs this much CUSUM log-likelihood evidence (nats) for "knows" (rate
 *  1−P(S)=0.90) against "guesses" (rate GUESS_CEILING). Each correct adds
 *  ln(0.90/0.25)=+1.280934, each wrong adds ln(0.10/0.75)=−2.014903, and the sum
 *  is held in [0, FLUID_EVIDENCE_NATS]. From zero it takes 12 consecutive
 *  corrects (11·1.280934 = 14.09 < 15 ≤ 15.37 = 12·1.280934). By Ville's
 *  inequality a 25% guesser crosses within n attempts with probability at most
 *  n·e^−15 = n·3.06e-7. The 5-correct streak alone let 0.39% of day-0 guessers
 *  read fluid (TEST_REPORT_2026-10-05_wave1.md:32). Owner-tunable (design Q3):
 *  13.82 is ~2 guessers per 100,000; 18 is stricter at ~2.4 more attempts. */
export const FLUID_EVIDENCE_NATS = 15;

/** `TechniqueState.engineVersion`. A snapshot row without it was written by the
 *  engine that had no evidence, window or practice time; hydration rebuilds it. */
export const ENGINE_VERSION = 2;

export const WARMUP_PRIORS = {
  correct_first_try: 0.8,
  hint_or_slow: 0.5,
  wrong: 0.2,
} as const;

export type AllocationPercentages = { primary: number; sinking: number; frontier: number };

export const BASE_ALLOCATION: AllocationPercentages = { primary: 0.6, sinking: 0.2, frontier: 0.2 };

export const PERSONA_ALLOCATIONS: Record<string, AllocationPercentages> = {
  SpeedDemon: { primary: 0.7, sinking: 0.15, frontier: 0.15 },
  BrainTrainer: { primary: 0.5, sinking: 0.3, frontier: 0.2 },
  SchoolSupport: { primary: 0.6, sinking: 0.2, frontier: 0.2 },
};

export const CLUSTER_ALLOCATIONS: Record<string, AllocationPercentages> = {
  sprinter: { primary: 0.7, sinking: 0.15, frontier: 0.15 },
  deliberate: { primary: 0.6, sinking: 0.2, frontier: 0.2 },
  perfectionist: { primary: 0.6, sinking: 0.2, frontier: 0.2 },
  balanced: { primary: 0.6, sinking: 0.2, frontier: 0.2 },
  rebuilder: { primary: 0.5, sinking: 0.3, frontier: 0.2 },
  wanderer: { primary: 0.4, sinking: 0.3, frontier: 0.3 },
};

/** Age-based time multipliers, base 30 s/problem (SHARED_REFERENCE §2). */
export const AGE_TIME_MULTIPLIERS: Array<{ min: number; max: number; multiplier: number }> = [
  { min: 8, max: 10, multiplier: 2.5 },
  { min: 11, max: 13, multiplier: 2.0 },
  { min: 14, max: 17, multiplier: 1.5 },
  { min: 18, max: 25, multiplier: 1.0 },
  { min: 26, max: 40, multiplier: 1.2 },
  { min: 41, max: 60, multiplier: 1.5 },
  { min: 61, max: 200, multiplier: 2.0 },
];

export const BASE_TIME_SECONDS = 30;

export const WRONG_ANSWER_GUARDS: WrongAnswerGuards = {
  max_cycles_per_technique: 3,
  max_wrongs_per_session: 5,
  max_consecutive_wrongs: 4,
  pingpong_max_toggles: 3,
  pingpong_window: 10,
};

// Scheduler (sinking-skill queue)
export const SINKING_CREATE_PRIORITY = 0.8;
export const SINKING_BUMP = 0.1;
export const SINKING_PRIORITY_CAP = 0.95;
/** Phase-1 binary cliff: a gap of MORE than this many whole days sends a skill
 *  to review and demotes fluid to fragile (SHARED_REFERENCE.md:234-235). */
export const DECAY_CLIFF_DAYS = 7;
