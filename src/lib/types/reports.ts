export type ReportSummary = {
  totalSprints: number;
  totalXP: number;
  avgAccuracy: number;
  bestAccuracy: number;
  totalTime: number;
};

export type ReportTopic = {
  topic: string;
  label: string;
  sprints: number;
  accuracy: number;
  xp?: number;
};
