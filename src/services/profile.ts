import type { ProfileData, ProfileStat, Achievement } from "@/lib/types/profile";
import { apiGet } from "./api";
import { useAuthStore } from "@/stores/auth-store";
import { mapBackendAchievements, type BackendAchievementsResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getProfile(): Promise<ProfileData> {
  if (IS_MOCK) {
    const { PROFILE_DATA, PROFILE_STATS, ACHIEVEMENTS } = await import("@/lib/mock/profile");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return PROFILE_DATA;
  }
  // Backend contract: GET /auth/me → { user: { id, name, email, role, tier } }.
  // Streak is optional decoration: its failure must not blank the profile header.
  const [meResult, streakResult] = await Promise.allSettled([
    apiGet<{ user: { id: string; name?: string | null; email?: string; role?: string; tier?: string | null } }>("/auth/me"),
    apiGet<{ current: number; xp: number }>("/dashboard/streak"),
  ]);
  const auth = useAuthStore.getState();
  let user: { name?: string | null; email?: string | null; tier?: string | null } | null | undefined = auth.user;
  if (meResult.status === "fulfilled" && meResult.value?.user) {
    // Keep the stored session user fresh without clobbering fields the server omitted.
    auth.syncServerUser(meResult.value.user);
    user = useAuthStore.getState().user ?? meResult.value.user;
  } else if (!user) {
    // Nothing stored and /auth/me failed: surface the real error rather than inventing a profile.
    throw meResult.status === "rejected" ? meResult.reason : new Error("Profile unavailable");
  }
  const streak = streakResult.status === "fulfilled" ? streakResult.value : { current: 0, xp: 0 };
  const name = user?.name?.trim() || user?.email?.split("@")[0] || "Learner";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return {
    initials,
    name,
    badge: user?.tier ?? "free",
    level: `Level ${Math.floor(streak.xp / 500) + 1}`,
    streak: `${streak.current} day${streak.current === 1 ? "" : "s"}`,
  };
}

export async function getProfileStats(): Promise<ProfileStat[]> {
  if (IS_MOCK) {
    const { PROFILE_DATA, PROFILE_STATS, ACHIEVEMENTS } = await import("@/lib/mock/profile");
    const { delay } = await import("@/lib/mock/delay");

    await delay(150);
    return PROFILE_STATS;
  }
  const stats = await apiGet<{
    accuracy: number;
    questions: number;
    percentile: number;
    speed: number;
  }>("/dashboard/stats");
  return [
    { label: "Accuracy", value: `${stats.accuracy}%` },
    { label: "Questions", value: String(stats.questions) },
    { label: "Percentile", value: `${stats.percentile}%` },
    { label: "Average speed", value: `${stats.speed}s` },
  ];
}

export async function getAchievements(): Promise<Achievement[]> {
  if (IS_MOCK) {
    const { PROFILE_DATA, PROFILE_STATS, ACHIEVEMENTS } = await import("@/lib/mock/profile");
    const { delay } = await import("@/lib/mock/delay");

    await delay(250);
    return ACHIEVEMENTS;
  }
  const response = await apiGet<BackendAchievementsResponse>("/social/achievements");
  return mapBackendAchievements(response).map(({ icon, label, description, unlocked }) => ({
    icon,
    label,
    desc: description,
    unlocked,
  }));
}
