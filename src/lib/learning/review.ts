import {
  bktToMastery,
  bumpSinking,
  createSinking,
  dailyWeights,
  effectiveState,
  needsReview,
  sinkingReviewQueue,
  wholeDaysSince,
  type SessionLogEntry,
  type SinkingSkill,
  type SinkingTrigger,
  type TechniquePools,
  type TechniqueState,
  type WeightItem,
} from "@vmsg/psychometrics";
import type { LearnerStates } from "./learner-state";

/**
 * Spaced repetition on top of the vendored scheduler. createSinking / bumpSinking / resolveSinking, the 0.7 queue threshold, the
 * 7-day cliff and the daily-weight formula are the engine's. This file only feeds them the learner's real outcomes and then uses the
 * queue and the weights to ORDER the engine's pools, so the engine's own round-robin draw (fillAllocation) picks the techniques that
 * most need review first. Nothing here chooses a number.
 */

/** One entry per technique the learner is being asked to revisit. Persisted per learner on the device. */
export type SinkingBook = Record<string, SinkingSkill>;

/**
 * Fold a finished session into the book, in the order the answers happened:
 *   - a wrong answer creates the entry (trigger "session_wrong") or raises it (bumpSinking: +0.1, capped at 0.95);
 *   - after the session, a technique the engine now calls fluid has recovered: resolveSinking, and the entry is dropped.
 * With no states (history unknown) recovery cannot be judged, so entries are only added or raised, never resolved.
 */
export function applySessionToSinking(book: SinkingBook, log: ReadonlyArray<SessionLogEntry>, nextStates: LearnerStates | null): SinkingBook {
  const out: SinkingBook = { ...book };
  for (const { skill, attempt } of log) {
    if (attempt.correct) continue;
    out[skill] = out[skill] ? bumpSinking(out[skill]) : createSinking(skill, "session_wrong");
  }
  if (nextStates) {
    for (const skill of Object.keys(out)) {
      if (nextStates[skill]?.state === "fluid") delete out[skill]; // recovered: the engine's resolveSinking would only zero the priority, so the entry is dropped
    }
  }
  return out;
}

/** A mock exam deferred these weak skills: queue them (trigger "mock_wrong_answer"), raising an entry that already exists. */
export function addMockSinking(book: SinkingBook, skills: ReadonlyArray<string>): SinkingBook {
  const out: SinkingBook = { ...book };
  for (const skill of new Set(skills)) {
    if (!skill || skill === "unclassified") continue;
    out[skill] = out[skill] ? bumpSinking(out[skill]) : createSinking(skill, "mock_wrong_answer");
  }
  return out;
}

/**
 * The book plus the techniques the 7-day cliff has demoted. A fluid technique idle past the cliff reads as fragile (effectiveState
 * keeps decayedFrom), and the engine's needsReview says it is due: it enters the queue (trigger "decay") unless it already has an
 * entry. The entry is derived, not stored: practising it again moves lastPracticedAt and it leaves on its own.
 */
export function withDecayEntries(book: SinkingBook, states: LearnerStates, now: number): SinkingBook {
  const out: SinkingBook = { ...book };
  for (const [skill, raw] of Object.entries(states)) {
    if (out[skill]) continue;
    const eff = effectiveState(raw, now);
    if (eff.decayedFrom && needsReview(wholeDaysSince(raw.lastPracticedAt, now))) out[skill] = createSinking(skill, "decay" satisfies SinkingTrigger);
  }
  return out;
}

/** The engine's queue (priority above 0.7, at most five), restricted to techniques the app can actually serve. */
export function reviewQueue(book: SinkingBook, servable: ReadonlySet<string>, limit = 5): SinkingSkill[] {
  return sinkingReviewQueue(Object.values(book).filter((s) => servable.has(s.techniqueId)), limit);
}

export type ReviewReason = "decay" | "needs_another_go";
export type ReviewItem = { skill: string; reason: ReviewReason; daysIdle: number; priority: number };

/** Why each queued technique is up for review, in plain terms for the learner. */
export function reviewItems(queue: ReadonlyArray<SinkingSkill>, states: LearnerStates, now: number): ReviewItem[] {
  return queue.map((q) => ({
    skill: q.techniqueId,
    reason: q.triggeredBy === "decay" ? "decay" : "needs_another_go",
    daysIdle: wholeDaysSince(states[q.techniqueId]?.lastPracticedAt ?? null, now),
    priority: q.decayPriority,
  }));
}

export type DailyWeightOptions = {
  /** Only when the learner set a valid, future exam date; otherwise undefined and the formula applies no urgency. */
  daysRemaining?: number;
};

/** Normalised weights (they sum to 1) across the learner's techniques, from the engine's dailyWeights. */
export function weightsFor(states: LearnerStates, queue: ReadonlyArray<SinkingSkill>, now: number, opts: DailyWeightOptions = {}): Map<string, number> {
  const weak = new Set(queue.map((q) => q.techniqueId));
  const items: WeightItem[] = Object.entries(states).map(([skill, raw]) => {
    const eff: TechniqueState = effectiveState(raw, now);
    return {
      techniqueId: skill,
      mastery: bktToMastery(eff.pLearned),
      decayDays: wholeDaysSince(raw.lastPracticedAt, now),
      isWeakArea: weak.has(skill),
    };
  });
  return dailyWeights(items, { daysRemaining: opts.daysRemaining });
}

/**
 * The engine's pools, re-ordered so its round-robin draw serves the techniques that most need review first.
 *   - A technique in the review queue moves into the sinking pool (ahead of the engine's own fragile skills, queue order = priority
 *     order) and out of the other pools, so it is neither duplicated nor offered as new material at the same time.
 *   - Every pool is then ordered by daily weight, highest first (a stable sort: ties keep the catalog order).
 * Skills never attempted have no weight and keep their place after the weighted ones.
 */
export function orderPoolsForReview(pools: TechniquePools, queue: ReadonlyArray<SinkingSkill>, weights: ReadonlyMap<string, number>): TechniquePools {
  const queued = queue.map((q) => q.techniqueId);
  const inQueue = new Set(queued);
  const rank = (ids: string[]) => [...ids].sort((a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0));
  const known = new Set([...pools.fluid, ...pools.fragile, ...pools.frontier]);
  const fragileRest = pools.fragile.filter((s) => !inQueue.has(s));
  return {
    fluid: rank(pools.fluid.filter((s) => !inQueue.has(s))),
    // queue entries first, in the engine's priority order; only ones the pools know about (so a skill with no servable items is never drawn)
    fragile: [...queued.filter((s) => known.has(s)), ...rank(fragileRest)],
    frontier: rank(pools.frontier.filter((s) => !inQueue.has(s))),
  };
}
