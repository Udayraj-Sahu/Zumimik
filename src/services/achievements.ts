import type { AchievementItem } from "@/lib/types/achievements";
import { apiGet } from "./api";
import { mapBackendAchievements, type BackendAchievementsResponse } from "./backend-adapters";
export async function getAchievements(): Promise<AchievementItem[]> {
  const response = await apiGet<BackendAchievementsResponse>("/social/achievements");
  return mapBackendAchievements(response);
}
