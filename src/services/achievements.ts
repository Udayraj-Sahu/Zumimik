import type { AchievementItem } from "@/lib/types/achievements";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getAchievements(): Promise<AchievementItem[]> {
  if (IS_MOCK) {
    const { ACHIEVEMENTS } = await import("@/lib/mock/achievements");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return ACHIEVEMENTS;
  }
  return apiGet<AchievementItem[]>("/achievements");
}
