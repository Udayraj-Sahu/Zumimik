import type { SessionLogEntry } from "@vmsg/psychometrics";
import type { TechniqueStateName } from "@vmsg/shared-types";
import type { LearnerStates } from "./learner-state";

/** What one finished session did to each technique it touched, as the learner-state engine computed it. */
export type SkillChange = {
  skill: string;
  /** Scored answers on this technique in this session, and how many were right. This is accuracy, not mastery. */
  attempts: number;
  correct: number;
  /** The mastery label before and after (undefined = the learner had no history with it before). */
  before: TechniqueStateName | undefined;
  after: TechniqueStateName | undefined;
};

export type SessionChange = { skills: SkillChange[] };

/**
 * Compare the states the pipeline started from with the states it produced, for the techniques this session's eligible answers
 * touched. Nothing is computed here: both sides are the engine's own states. Returns null when either side is unknown (the
 * history could not be read), so a change is never shown that was not actually calculated.
 */
export function summariseChange(log: ReadonlyArray<SessionLogEntry>, before: LearnerStates | null, after: LearnerStates | null): SessionChange | null {
  if (!before || !after || log.length === 0) return null;
  const by = new Map<string, SkillChange>();
  for (const { skill, attempt } of log) {
    const row = by.get(skill) ?? { skill, attempts: 0, correct: 0, before: before[skill]?.state, after: after[skill]?.state };
    row.attempts += 1;
    if (attempt.correct) row.correct += 1;
    by.set(skill, row);
  }
  return { skills: [...by.values()] };
}

const RANK: Record<TechniqueStateName, number> = { fractured: 0, fragile: 1, fluid: 2 };

export type ChangeKind = "improved" | "same" | "slipped" | "new";

export function changeKind(c: Pick<SkillChange, "before" | "after">): ChangeKind {
  if (!c.after) return "same";
  if (!c.before) return "new";
  if (RANK[c.after] > RANK[c.before]) return "improved";
  if (RANK[c.after] < RANK[c.before]) return "slipped";
  return "same";
}
