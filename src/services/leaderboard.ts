import type { LeaderboardEntry } from "@/lib/types/dashboard";
import { apiGet } from "./api";
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiGet<LeaderboardEntry[]>("/dashboard/leaderboard");
}
