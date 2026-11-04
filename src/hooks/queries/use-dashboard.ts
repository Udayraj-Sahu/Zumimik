import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTopicMastery, getRadarAxes, getDashboardMetrics,
  getDashboardStats, getStreakData, getUpcomingEvents,
  getLeaderboard, getHomeRecentActivity,
} from "@/services/dashboard";
import { cacheQueryData, clearExpiredCache, getCachedQueryData } from "@/services/offline/sync";
import { useNetworkStore } from "@/stores/network-store";
import type { Topic, RadarAxis, Metric, DashboardStats, StreakData, UpcomingEvent, LeaderboardEntry, HomeRecentActivityItem } from "@/lib/types/dashboard";

type DashboardData = {
  topics: Topic[];
  radarAxes: RadarAxis[];
  metrics: Metric[];
  stats: DashboardStats;
  streak: StreakData;
  upcoming: UpcomingEvent[];
  leaderboard: LeaderboardEntry[];
  recent: HomeRecentActivityItem[];
};

async function fetchDashboardData(domain?: string): Promise<DashboardData> {
  const [topics, radarAxes, metrics, stats, streak, upcoming, leaderboard, recent] = await Promise.all([
    getTopicMastery(domain),
    getRadarAxes(domain),
    getDashboardMetrics(domain),
    getDashboardStats(domain),
    getStreakData(domain),
    getUpcomingEvents(domain),
    getLeaderboard(domain),
    getHomeRecentActivity(domain),
  ]);
  return { topics, radarAxes, metrics, stats, streak, upcoming, leaderboard, recent };
}

function dashboardCacheKey(domain?: string): string {
  return domain ? `dashboard:${domain}` : "dashboard";
}

export function useDashboardData(domain?: string) {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const isOnlineRef = useRef(isOnline);
  const [cachedData, setCachedData] = useState<DashboardData | null>(null);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    clearExpiredCache().catch(() => {});
    getCachedQueryData(dashboardCacheKey(domain))
      .then((data) => {
        if (data) setCachedData(data as DashboardData);
      })
      .catch(() => {});
  }, [domain]);

  const query = useQuery<DashboardData>({
    queryKey: ["dashboard", domain],
    queryFn: async () => {
      try {
        return await fetchDashboardData(domain);
      } catch (err) {
        if (!isOnlineRef.current) {
          const cached = await getCachedQueryData(dashboardCacheKey(domain));
          if (cached) return cached as DashboardData;
        }
        throw err;
      }
    },
    placeholderData: isOnline ? undefined : (cachedData ?? undefined),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (query.data) {
      cacheQueryData(dashboardCacheKey(domain), query.data);
    }
  }, [query.data, domain]);

  return query;
}
