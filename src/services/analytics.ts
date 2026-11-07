import type { AnalyticsStats, WeeklyDatum, RecentActivityItem } from "@/lib/types/analytics";
import { apiGet } from "./api";
import { mapBackendRecentActivity } from "./backend-adapters";
export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  return apiGet<AnalyticsStats>("/dashboard/stats");
}
export async function getWeeklyActivity(): Promise<WeeklyDatum[]> {
  const streak = await apiGet<{
    days: boolean[];
    labels: string[];
  }>("/dashboard/streak");
  return streak.days.map((active, index) => ({
    day: streak.labels[index] ?? "",
    pct: active ? 100 : 0,
  }));
}
export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const recent = await apiGet<
    Array<{
      label: string;
      score: string;
      time: string;
    }>
  >("/dashboard/recent-activity");
  return mapBackendRecentActivity(recent);
}
