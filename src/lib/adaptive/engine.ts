import { ADAPTIVE_TOPICS_BY_DOMAIN } from "@/lib/mock/adaptive";
import { allocateTimeBudget } from "@/lib/adaptive/modes";
import type {
  AdaptiveDomainState,
  AdaptiveTopicState,
  AdaptiveTopicStatus,
  SessionOutcome,
  TodayPlan,
  PracticeRecommendation,
  TimeBlock,
} from "@/lib/types/adaptive";

const MASTERY_RATE = 24;
const MASTERED_AT = 80;
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

export function initialTopics(domain: string): AdaptiveTopicState[] {
  const seeds = ADAPTIVE_TOPICS_BY_DOMAIN[domain] ?? ADAPTIVE_TOPICS_BY_DOMAIN["cat"] ?? [];
  return seeds.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    mastery: t.value,
    attempts: 0,
    currentStreak: 0,
    bestStreak: 0,
    status: t.value === 0 ? "NEW" : t.value >= MASTERED_AT ? "MASTERED" : "ACTIVE",
  }));
}

export function initialDomainState(domain: string): AdaptiveDomainState {
  return {
    domain,
    topics: initialTopics(domain),
    sessionCount: 0,
    totalTimeSpent: 0,
    lastSession: null,
  };
}

export function applyOutcome(state: AdaptiveDomainState, outcome: SessionOutcome): AdaptiveDomainState {
  const delta = (outcome.accuracy / 100 - 0.5) * MASTERY_RATE;

  const topics = state.topics.map((t) => {
    if (t.id !== outcome.topicId) {
      return { ...t, mastery: Math.max(0, t.mastery - 1) };
    }
    const nextMastery = Math.max(0, Math.min(100, Math.round(t.mastery + delta)));
    const currentStreak = outcome.accuracy >= 50 ? t.currentStreak + 1 : 0;
    const status: AdaptiveTopicStatus = nextMastery >= MASTERED_AT ? "MASTERED" : nextMastery > 0 ? "ACTIVE" : "NEW";
    return {
      ...t,
      mastery: nextMastery,
      attempts: t.attempts + 1,
      currentStreak,
      bestStreak: Math.max(t.bestStreak, currentStreak),
      status,
    };
  });

  return {
    ...state,
    topics,
    sessionCount: (state.sessionCount ?? 0) + 1,
    totalTimeSpent: (state.totalTimeSpent ?? 0) + outcome.totalTimeSpent,
    lastSession: {
      topicId: outcome.topicId,
      topicLabel: outcome.topicLabel,
      accuracy: outcome.accuracy,
      ts: outcome.ts,
    },
  };
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
  const mock = session > 0 && session % MOCK_EVERY === MOCK_EVERY - 1
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
