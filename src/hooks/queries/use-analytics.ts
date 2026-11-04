import { useQuery } from "@tanstack/react-query";
import { getAnalyticsStats, getWeeklyActivity, getRecentActivity } from "@/services/analytics";
import type { AnalyticsStats, WeeklyDatum, RecentActivityItem } from "@/lib/types/analytics";

type AnalyticsData = {
  stats: AnalyticsStats;
  weekly: WeeklyDatum[];
  recent: RecentActivityItem[];
};

async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const [stats, weekly, recent] = await Promise.all([
    getAnalyticsStats(),
    getWeeklyActivity(),
    getRecentActivity(),
  ]);
  return { stats, weekly, recent };
}

export function useAnalyticsData() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: fetchAnalyticsData,
  });
}
