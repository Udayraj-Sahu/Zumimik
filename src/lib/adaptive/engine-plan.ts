import { recommendPlan } from "@/lib/adaptive/engine";
import type { AdaptiveDomainState, PracticeRecommendation, TodayPlan } from "@/lib/types/adaptive";
import type { NextStep } from "@/lib/learning/mastery-view";

/** A normal session length. It is a session SIZE (the learner's configuration), not a judgement about their mastery. */
export const DEFAULT_PLAN_LENGTH = 10;

/** The difficulty label that tells the Sprint to follow the learner's own ability estimate instead of forcing a level. */
export const ADAPTIVE_DIFFICULTY = "Adaptive";

/**
 * Today's plan from the shared learner model. Which techniques to work on comes from the engine (the review queue first, then what
 * the learner has started and not settled, then the next technique whose prerequisites are mastered); nothing here ranks techniques
 * by a percentage or picks a difficulty from a mastery threshold. Difficulty is left to the learner's ability estimate
 * (ADAPTIVE_DIFFICULTY) and the length is the usual session size. Only what is not about learning (the mock-exam rhythm and the
 * time budget from the learner's daily minutes and focus mode) is taken from the existing planner.
 *
 * The display fields (name, colour, the persisted percentage) come from the topic list the server returned; a technique not in that
 * list still gets a recommendation, labelled by its id, with no percentage invented.
 */
export function enginePlan(
  state: AdaptiveDomainState,
  steps: ReadonlyArray<NextStep>,
  dailyMinutes?: number,
  focusMode?: "sleep" | "sprint",
): TodayPlan {
  const base = recommendPlan(state, dailyMinutes, focusMode);
  const topic = (skill: string): PracticeRecommendation => {
    const t = state.topics.find((x) => x.id === skill);
    return {
      topicId: skill,
      topicLabel: t?.name ?? skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"),
      mastery: t?.mastery ?? 0,
      color: t?.color ?? "primary",
      difficulty: ADAPTIVE_DIFFICULTY,
      length: DEFAULT_PLAN_LENGTH,
    };
  };
  // The technique to work on (something to review, or started and not settled), then the best different technique after it.
  const weak = steps.find((s) => s.kind === "review" || s.kind === "continue");
  const practice = steps.find((s) => s !== weak);
  return {
    ...base,
    weakTopic: weak ? topic(weak.skill) : null,
    practice: practice ? topic(practice.skill) : null,
  };
}
