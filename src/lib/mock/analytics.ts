import type { AnalyticsStats, WeeklyDatum, RecentActivityItem } from "@/lib/types/analytics";

export const ANALYTICS_STATS: AnalyticsStats = {
  accuracy: 82,
  questions: 470,
  percentile: 47,
  speed: 34,
};

export const WEEKLY_DATA: WeeklyDatum[] = [
  { day: "MON", pct: 80 },
  { day: "TUE", pct: 62 },
  { day: "WED", pct: 78 },
  { day: "THU", pct: 90 },
  { day: "FRI", pct: 68 },
  { day: "SAT", pct: 73 },
  { day: "SUN", pct: 88 },
];

export const RECENT_ACTIVITY: RecentActivityItem[] = [
  { title: "Completed Sprint", sub: "Quantitative Aptitude — 92%", time: "2H AGO" },
  { title: "New High Score", sub: "Logical Reasoning — 79%", time: "1D AGO" },
  { title: "Streak Milestone", sub: "12-Day Streak Achieved", time: "2D AGO" },
  { title: "Rank Up", sub: "Climbed to #47 in Arena Rankings", time: "3D AGO" },
];
