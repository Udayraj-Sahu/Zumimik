import { allocateTimeBudget } from "@/lib/adaptive/modes";
import type {
  AdaptiveDomainState,
  AdaptiveTopicState,
  TodayPlan,
  PracticeRecommendation,
  TimeBlock,
} from "@/lib/types/adaptive";
const MOCK_EVERY = 5;
export function difficultyFor(mastery: number): string {
  if (mastery < 35) return "Beginner";
  if (mastery <= 70) return "Adaptive";
  return "Advanced";
}
export function lengthFor(mastery: number): number {
  if (mastery < 40) return 5;
  if (mastery <= 75) return 10;
  return 15;
}
function toPracticeRec(t: AdaptiveTopicState): PracticeRecommendation {
  return {
    topicId: t.id,
    topicLabel: t.name,
    mastery: t.mastery,
    color: t.color,
    difficulty: difficultyFor(t.mastery),
    length: lengthFor(t.mastery),
  };
}
export function recommendPlan(
  state: AdaptiveDomainState,
  dailyMinutes?: number,
  focusMode?: "sleep" | "sprint",
): TodayPlan {
  const sorted = [...state.topics].sort((a, b) => a.mastery - b.mastery);
  const weak = sorted[0] ?? null;
  const practiceTopic = sorted[1] ?? sorted[0] ?? null;
  const session = state.sessionCount ?? 0;
  const mock =
    session > 0 && session % MOCK_EVERY === MOCK_EVERY - 1
      ? { topicId: "mock", topicLabel: "Full-length Mock", difficulty: "Advanced", length: 15 }
      : null;
  const minutes = dailyMinutes ?? 30;
  const mode = focusMode ?? "sprint";
  const timeBudget: TimeBlock[] = allocateTimeBudget(minutes, mode);
  return {
    weakTopic: weak ? toPracticeRec(weak) : null,
    practice: practiceTopic ? toPracticeRec(practiceTopic) : null,
    mock,
    timeBudget,
  };
}
