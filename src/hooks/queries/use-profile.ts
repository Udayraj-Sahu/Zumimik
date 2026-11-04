import { useQuery } from "@tanstack/react-query";
import { getProfile, getProfileStats, getAchievements } from "@/services/profile";
import type { ProfileData, ProfileStat, Achievement } from "@/lib/types/profile";

type ProfileDataResult = {
  profile: ProfileData;
  stats: ProfileStat[];
  achievements: Achievement[];
};

async function fetchProfileData(): Promise<ProfileDataResult> {
  // The identity header must survive a failed stats/achievements call; only getProfile may fail the query.
  const [profile, stats, achievements] = await Promise.all([
    getProfile(),
    getProfileStats().catch((): ProfileStat[] => []),
    getAchievements().catch((): Achievement[] => []),
  ]);
  return { profile, stats, achievements };
}

export function useProfileData() {
  return useQuery<ProfileDataResult>({
    queryKey: ["profile"],
    queryFn: fetchProfileData,
  });
}
