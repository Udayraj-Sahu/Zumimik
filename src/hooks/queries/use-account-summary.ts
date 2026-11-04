import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getLeaderboard, getStreakData } from "@/services/dashboard";
import { useAuthStore } from "@/stores/auth-store";

export type AccountSummary = {
  streakDays: number | null;
  xp: number | null;
  questions: number | null;
  rank: number | null;
  /** Overall accuracy % across answered questions (/dashboard/stats). */
  accuracy: number | null;
  /** Average seconds per question (/dashboard/stats). */
  speed: number | null;
  percentile: number | null;
};

/**
 * Real numbers for the Settings overview, from /dashboard/streak, /dashboard/stats and /dashboard/leaderboard.
 * A field whose request failed is null (rendered as "--"); nothing is invented.
 */
export function useAccountSummary() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<AccountSummary>({
    queryKey: ["account-summary", userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [streak, stats, board] = await Promise.allSettled([getStreakData(), getDashboardStats(), getLeaderboard()]);
      if (streak.status === "rejected" && stats.status === "rejected" && board.status === "rejected") {
        throw streak.reason;
      }
      const me = board.status === "fulfilled" ? board.value.find((entry) => entry.me) : undefined;
      return {
        streakDays: streak.status === "fulfilled" ? streak.value.current : null,
        xp: streak.status === "fulfilled" ? streak.value.xp : null,
        questions: stats.status === "fulfilled" ? stats.value.questions : null,
        // With no answered questions these are not measurements, so they stay null rather than showing 0.
        accuracy: stats.status === "fulfilled" && stats.value.questions > 0 ? stats.value.accuracy : null,
        speed: stats.status === "fulfilled" && stats.value.questions > 0 && stats.value.speed > 0 ? stats.value.speed : null,
        percentile: stats.status === "fulfilled" && stats.value.questions > 0 ? stats.value.percentile : null,
        rank: me && me.rank > 0 ? me.rank : null,
      };
    },
  });
}
