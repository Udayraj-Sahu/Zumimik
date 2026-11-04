import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
};

export type Topic = {
  name: string;
  value: number;
  color: "primary" | "secondary";
};

export type RadarAxis = {
  label: string;
  value: number;
};

export type Metric = {
  label: string;
  value: string;
  icon: string;
};

export type DashboardStats = {
  accuracy: number;
  questions: number;
  percentile: number;
  speed: number;
};

export type StreakData = {
  current: number;
  xp: number;
  days: boolean[];
  labels: string[];
};

export type UpcomingEvent = {
  title: string;
  time: string;
  tag: string;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  xp: number;
  me?: boolean;
};

export type HomeRecentActivityItem = {
  label: string;
  score: string;
  time: string;
};
