import type { LeaderboardEntry } from "@/lib/types/dashboard";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (IS_MOCK) {
    const { LEADERBOARD_ENTRIES } = await import("@/lib/mock/leaderboard");
    const { delay } = await import("@/lib/mock/delay");

    await delay(250);
    return LEADERBOARD_ENTRIES;
  }
  return apiGet<LeaderboardEntry[]>("/dashboard/leaderboard");
}
