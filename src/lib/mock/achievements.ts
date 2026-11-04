import type { AchievementItem } from "@/lib/types/achievements";

export const ACHIEVEMENTS: AchievementItem[] = [
  { id: "streak-7", icon: "Flame", label: "Streak Champion", description: "7-day streak", unlocked: true, tier: "bronze", category: "streak", unlockedAt: "2026-08-12" },
  { id: "streak-30", icon: "Flame", label: "Iron Will", description: "30-day streak", unlocked: false, progress: 52, tier: "gold", category: "streak" },
  { id: "accuracy-90", icon: "Target", label: "Accuracy Master", description: "90%+ accuracy in a sprint", unlocked: true, tier: "silver", category: "accuracy", unlockedAt: "2026-08-18" },
  { id: "accuracy-100", icon: "Target", label: "Perfect Round", description: "100% accuracy in a sprint", unlocked: false, tier: "platinum", category: "accuracy" },
  { id: "speed-demon", icon: "Zap", label: "Speed Demon", description: "<5s avg response time", unlocked: true, tier: "gold", category: "speed", unlockedAt: "2026-08-15" },
  { id: "sprint-50", icon: "Swords", label: "Veteran", description: "50 sprints completed", unlocked: false, progress: 34, tier: "silver", category: "streak" },
  { id: "sprint-100", icon: "Swords", label: "Warrior", description: "100 sprints completed", unlocked: false, progress: 12, tier: "gold", category: "streak" },
  { id: "top-10", icon: "Medal", label: "Top 10", description: "Reach top 10 on leaderboard", unlocked: false, tier: "platinum", category: "social" },
  { id: "top-50", icon: "Trophy", label: "Arena Star", description: "Reach top 50 on leaderboard", unlocked: true, tier: "silver", category: "social", unlockedAt: "2026-08-10" },
  { id: "variety", icon: "LayoutGrid", label: "All-Rounder", description: "Complete sprints in all topics", unlocked: false, progress: 60, tier: "gold", category: "accuracy" },
  { id: "speed-10", icon: "Timer", label: "Lightning", description: "10 sprints under 5 min", unlocked: false, progress: 40, tier: "bronze", category: "speed" },
  { id: "social", icon: "Users", label: "Team Player", description: "Complete a group challenge", unlocked: false, tier: "bronze", category: "social" },
];
