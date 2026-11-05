import { effectiveState, wholeDaysSince } from "@vmsg/psychometrics";
import type { TechniqueStateName } from "@vmsg/shared-types";
import type { LearnerStates } from "./learner-state";

export type ProgressView = {
  /** Techniques the learner has actually attempted. */
  practised: number;
  counts: Record<TechniqueStateName, number>;
  /** Most recently practised first. */
  strong: string[];
  weak: string[];
  recent: Array<{ skill: string; state: TechniqueStateName; daysAgo: number }>;
};

/**
 * Overall progress and strong / weak areas, read straight from the engine's states (decay included). It is a count of techniques by
 * mastery label, not a percentage built from XP, streaks or the number of questions answered: those say how much the learner did,
 * not how well they know it.
 */
export function summariseProgress(states: LearnerStates | null | undefined, now: number, limit = 3): ProgressView | null {
  if (!states) return null;
  const rows = Object.entries(states)
    .filter(([, s]) => s.totalAttempts > 0)
    .map(([skill, raw]) => {
      const s = effectiveState(raw, now);
      return { skill, state: s.state, last: raw.lastPracticedAt ?? 0, daysAgo: wholeDaysSince(raw.lastPracticedAt, now) };
    })
    .sort((a, b) => b.last - a.last || a.skill.localeCompare(b.skill));
  const counts: Record<TechniqueStateName, number> = { fractured: 0, fragile: 0, fluid: 0 };
  for (const r of rows) counts[r.state] += 1;
  return {
    practised: rows.length,
    counts,
    strong: rows.filter((r) => r.state === "fluid").slice(0, limit).map((r) => r.skill),
    weak: rows.filter((r) => r.state === "fractured").slice(0, limit).map((r) => r.skill),
    recent: rows.slice(0, limit).map((r) => ({ skill: r.skill, state: r.state, daysAgo: r.daysAgo })),
  };
}
