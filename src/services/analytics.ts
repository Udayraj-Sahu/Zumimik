import type { AnalyticsStats, WeeklyDatum, RecentActivityItem } from "@/lib/types/analytics";
import { apiGet } from "./api";
import { mapBackendRecentActivity } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  if (IS_MOCK) {
    const { ANALYTICS_STATS, WEEKLY_DATA, RECENT_ACTIVITY } = await import("@/lib/mock/analytics");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return ANALYTICS_STATS;
  }
  return apiGet<AnalyticsStats>("/dashboard/stats");
}

export async function getWeeklyActivity(): Promise<WeeklyDatum[]> {
  if (IS_MOCK) {
    const { ANALYTICS_STATS, WEEKLY_DATA, RECENT_ACTIVITY } = await import("@/lib/mock/analytics");
    const { delay } = await import("@/lib/mock/delay");

    await delay(150);
    return WEEKLY_DATA;
  }
  const streak = await apiGet<{ days: boolean[]; labels: string[] }>("/dashboard/streak");
  return streak.days.map((active, index) => ({
    day: streak.labels[index] ?? "",
    pct: active ? 100 : 0,
  }));
}

export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  if (IS_MOCK) {
    const { ANALYTICS_STATS, WEEKLY_DATA, RECENT_ACTIVITY } = await import("@/lib/mock/analytics");
    const { delay } = await import("@/lib/mock/delay");

    await delay(100);
    return RECENT_ACTIVITY;
  }
  const recent = await apiGet<Array<{ label: string; score: string; time: string }>>(
    "/dashboard/recent-activity",
  );
  return mapBackendRecentActivity(recent);
}
