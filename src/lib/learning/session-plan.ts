import {
  buildPools,
  composeSession,
  effectiveState,
  type CatalogSkill,
  type ComposedSession,
  type TechniquePools,
} from "@vmsg/psychometrics";
import type { Bucket } from "@vmsg/shared-types";
import type { LearnerStates } from "./learner-state";
import { orderPoolsForReview, reviewQueue, weightsFor, withDecayEntries, type SinkingBook } from "./review";

/** One request slot of POST /practice/session ({ skill, bucket, n, p_learned? }). */
export type PracticeSlot = { skill: string; bucket: Bucket; n: number; p_learned?: number };

export type AdaptivePlan = {
  pools: TechniquePools;
  composed: ComposedSession;
  slots: PracticeSlot[];
  /** Set when the learner chose a technique: the plan was built around it instead of the pools. */
  focus: { skill: string; bucket: Bucket } | null;
};

export type PlanInput = {
  states: LearnerStates;
  catalog: ReadonlyArray<CatalogSkill>;
  age: number;
  /** Any positive number of questions: the allocation (60/20/20 by default, persona/cluster adjusted) is the engine's. */
  size: number;
  now: number;
  persona?: string;
  cluster?: string;
  /** A technique the learner picked in Explorer/Learn. */
  focusSkill?: string | null;
  /** The learner's review book and exam countdown: when given, the scheduler decides which techniques the engine's pools serve first. */
  review?: { book: SinkingBook; daysRemaining?: number };
};

/** The pool a skill sits in for this learner, which decides the bucket its questions are requested under. */
export function bucketFor(skill: string, pools: TechniquePools): Bucket {
  if (pools.fluid.includes(skill)) return "primary";
  if (pools.fragile.includes(skill)) return "sinking";
  return "frontier";
}

/**
 * The adaptive session for this learner, from the engine's own buildPools + composeSession (allocation, persona/cluster
 * adjustment, prerequisite eligibility, empty-pool redistribution). Nothing is re-derived here.
 *
 * With `focusSkill` the learner's explicit choice wins every slot (their selected technique is never swapped for another
 * topic's questions), while the broader mastery context still decides which bucket the request is labelled with, so the
 * server serves the right difficulty window for that skill.
 */
export function planAdaptiveSession(input: PlanInput): AdaptivePlan {
  const size = Math.max(1, Math.floor(input.size));
  let pools = buildPools(input.states, input.catalog, input.now);
  if (input.review) {
    const servable = new Set([...pools.fluid, ...pools.fragile, ...pools.frontier]);
    const queue = reviewQueue(withDecayEntries(input.review.book, input.states, input.now), servable);
    const weights = weightsFor(input.states, queue, input.now, { daysRemaining: input.review.daysRemaining });
    pools = orderPoolsForReview(pools, queue, weights);
  }
  const composed = composeSession({ persona: input.persona, cluster: input.cluster, age: input.age, sessionSize: size }, pools);

  const pLearned = (skill: string) => {
    const s = input.states[skill];
    return s ? effectiveState(s, input.now).pLearned : undefined;
  };

  if (input.focusSkill) {
    const bucket = bucketFor(input.focusSkill, pools);
    const p = pLearned(input.focusSkill);
    return { pools, composed, slots: [{ skill: input.focusSkill, bucket, n: size, ...(p !== undefined ? { p_learned: p } : {}) }], focus: { skill: input.focusSkill, bucket } };
  }

  const grouped = new Map<string, PracticeSlot>();
  for (const p of composed.problems) {
    const key = `${p.techniqueId}|${p.bucket}`;
    const existing = grouped.get(key);
    if (existing) existing.n += 1;
    else {
      const pl = pLearned(p.techniqueId);
      grouped.set(key, { skill: p.techniqueId, bucket: p.bucket, n: 1, ...(pl !== undefined ? { p_learned: pl } : {}) });
    }
  }
  return { pools, composed, slots: [...grouped.values()], focus: null };
}
