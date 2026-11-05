import { buildPools, type CatalogSkill } from "@vmsg/psychometrics";
import type { TechniqueStateName } from "@vmsg/shared-types";
import type { LearnerStates } from "./learner-state";
import { orderPoolsForReview, reviewQueue, weightsFor, withDecayEntries, type SinkingBook } from "./review";

/** The three mastery labels the learner sees. The state is the engine's, as hydrated from their history (decay included). */
export const STATE_LABEL: Record<TechniqueStateName, string> = { fractured: "Fractured", fragile: "Fragile", fluid: "Fluid" };

/** A technique's mastery label, or undefined when the learner has no history with it (never guessed). */
export function stateOf(states: LearnerStates | null | undefined, skill: string): TechniqueStateName | undefined {
  return states?.[skill]?.state;
}

export type NextStep = { skill: string; kind: "review" | "continue" | "new" };

/**
 * What to practise next, from the engine's own pools and the scheduler: the technique a session would start with.
 *   review   - the most urgent entry of the review queue;
 *   continue - a technique the learner has started and has not settled (fractured, or fragile);
 *   new      - the first technique whose prerequisites are mastered that they have not tried yet.
 * Prerequisites are enforced by buildPools (a technique stays out until its parents reach the mastery bar). Null when there is
 * nothing to recommend (every technique is fluid, or the catalog is empty).
 */
export function recommendSteps(states: LearnerStates, catalog: ReadonlyArray<CatalogSkill>, book: SinkingBook, now: number, daysRemaining?: number, limit = 3): NextStep[] {
  const pools = buildPools(states, catalog, now);
  const servable = new Set([...pools.fluid, ...pools.fragile, ...pools.frontier]);
  const queue = reviewQueue(withDecayEntries(book, states, now), servable);
  const ordered = orderPoolsForReview(pools, queue, weightsFor(states, queue, now, { daysRemaining }));
  const attempted = (s: string) => (states[s]?.totalAttempts ?? 0) > 0;
  const out: NextStep[] = [];
  const seen = new Set<string>();
  const add = (skill: string, kind: NextStep["kind"]) => {
    if (!seen.has(skill)) {
      seen.add(skill);
      out.push({ skill, kind });
    }
  };
  // The queued techniques lead the review pool (orderPoolsForReview), so they come first, in the scheduler's priority order.
  if (queue.length > 0) for (const s of ordered.fragile.slice(0, queue.length)) add(s, "review");
  for (const s of [...ordered.frontier, ...ordered.fragile]) if (attempted(s)) add(s, "continue");
  for (const s of ordered.frontier) if (!attempted(s)) add(s, "new");
  return out.slice(0, limit);
}

/** The single most useful next step: the first of recommendSteps. */
export function recommendNext(states: LearnerStates, catalog: ReadonlyArray<CatalogSkill>, book: SinkingBook, now: number, daysRemaining?: number): NextStep | null {
  return recommendSteps(states, catalog, book, now, daysRemaining, 1)[0] ?? null;
}
