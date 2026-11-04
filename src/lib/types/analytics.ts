export type AnalyticsStats = {
  accuracy: number;
  questions: number;
  percentile: number;
  speed: number;
};

export type WeeklyDatum = {
  day: string;
  pct: number;
};

export type RecentActivityItem = {
  title: string;
  sub: string;
  time: string;
};
