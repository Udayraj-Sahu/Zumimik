import type { ProfileData, ProfileStat, Achievement } from "@/lib/types/profile";

export const PROFILE_DATA: ProfileData = {
  initials: "UA",
  name: "Udayraj Sahu",
  badge: "Champion",
  level: "Lv. 04",
  streak: "12-Day Streak",
};

export const PROFILE_STATS: ProfileStat[] = [
  { label: "Sessions", value: "47" },
  { label: "Streak", value: "12d" },
  { label: "Rank", value: "#47" },
];

export const ACHIEVEMENTS: Achievement[] = [
  { icon: "Flame", label: "Week Warrior", desc: "7-day streak", unlocked: true },
  { icon: "Zap", label: "Speed Demon", desc: "10 sprints in a day", unlocked: true },
  { icon: "Medal", label: "Top 50", desc: "Arena rank #47", unlocked: true },
  { icon: "Star", label: "Perfect Score", desc: "100% on any sprint", unlocked: false },
  { icon: "Shield", label: "Iron Will", desc: "30-day streak", unlocked: false },
  { icon: "Swords", label: "Gladiator", desc: "100 sprints completed", unlocked: false },
];
