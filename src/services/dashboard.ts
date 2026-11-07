import type {
  Topic,
  RadarAxis,
  Metric,
  DashboardStats,
  StreakData,
  UpcomingEvent,
  LeaderboardEntry,
  HomeRecentActivityItem,
} from "@/lib/types/dashboard";
import { apiGet } from "./api";
export async function getTopicMastery(domain?: string): Promise<Topic[]> {
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<Topic[]>(`/dashboard/topics${params}`);
}
export async function getRadarAxes(_domain?: string): Promise<RadarAxis[]> {
  return apiGet<RadarAxis[]>("/dashboard/radar");
}
export async function getDashboardMetrics(_domain?: string): Promise<Metric[]> {
  return apiGet<Metric[]>("/dashboard/metrics");
}
export async function getDashboardStats(domain?: string): Promise<DashboardStats> {
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<DashboardStats>(`/dashboard/stats${params}`);
}
export async function getStreakData(_domain?: string): Promise<StreakData> {
  return apiGet<StreakData>("/dashboard/streak");
}
export async function getUpcomingEvents(domain?: string): Promise<UpcomingEvent[]> {
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<UpcomingEvent[]>(`/dashboard/events${params}`);
}
export async function getLeaderboard(_domain?: string): Promise<LeaderboardEntry[]> {
  return apiGet<LeaderboardEntry[]>("/dashboard/leaderboard");
}
export async function getHomeRecentActivity(domain?: string): Promise<HomeRecentActivityItem[]> {
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<HomeRecentActivityItem[]>(`/dashboard/recent-activity${params}`);
}
