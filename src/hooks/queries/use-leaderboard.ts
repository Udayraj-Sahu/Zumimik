import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/services/leaderboard";
import type { LeaderboardEntry } from "@/lib/types/dashboard";

export function useLeaderboard() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });
}
