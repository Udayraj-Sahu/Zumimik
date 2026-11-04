export type HistoryEntry = {
  id: string;
  topic: string;
  topicLabel: string;
  difficulty: string;
  score: number;
  total: number;
  accuracy: number;
  xpEarned?: number;
  totalTimeSpent: number;
  completedAt: string;
};
