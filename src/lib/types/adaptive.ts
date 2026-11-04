export type AdaptiveTopicStatus = "NEW" | "ACTIVE" | "MASTERED";

export type AdaptiveTopicState = {
  id: string;
  name: string;
  color: string;
  mastery: number;
  attempts: number;
  currentStreak: number;
  bestStreak: number;
  status: AdaptiveTopicStatus;
};

export type AdaptiveDomainState = {
  domain: string;
  topics: AdaptiveTopicState[];
  sessionCount?: number;
  totalTimeSpent?: number;
  lastSession: {
    topicId: string;
    topicLabel: string;
    accuracy: number;
    ts: number;
  } | null;
};

export type SessionOutcome = {
  domain: string;
  topicId: string;
  topicLabel: string;
  difficulty: string;
  score: number;
  total: number;
  accuracy: number;
  xpEarned: number;
  totalTimeSpent: number;
  ts: number;
};

export type PracticeRecommendation = {
  topicId: string;
  topicLabel: string;
  mastery: number;
  color: string;
  difficulty: string;
  length: number;
};

export type MockRecommendation = {
  topicId: string;
  topicLabel: string;
  difficulty: string;
  length: number;
};

export type TimeBlock = {
  label: string;
  minutes: number;
};

export type TodayPlan = {
  weakTopic: PracticeRecommendation | null;
  practice: PracticeRecommendation | null;
  mock: MockRecommendation | null;
  timeBudget: TimeBlock[];
};
