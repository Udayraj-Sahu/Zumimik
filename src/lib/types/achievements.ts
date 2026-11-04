export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";
export type AchievementCategory =
  | "streak"
  | "accuracy"
  | "speed"
  | "social"
  | "competitive"
  | "collaborative"
  | "milestone"
  | "special";

export type AchievementItem = {
  id: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  tier: AchievementTier;
  category: AchievementCategory;
  unlockedAt?: string;
};
