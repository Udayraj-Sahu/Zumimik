import { useQuery } from "@tanstack/react-query";
import { getAchievements } from "@/services/achievements";
import type { AchievementItem } from "@/lib/types/achievements";

export function useAchievements() {
  return useQuery<AchievementItem[]>({
    queryKey: ["achievements"],
    queryFn: getAchievements,
  });
}
