"use client";
import { useCallback } from "react";
import { useMyClubs } from "@/hooks/queries/use-clubs";
import { useFeatureFlags } from "@/hooks/queries/use-feature-flags";
import { isFeatureOff } from "@/services/flags";
import { silentHubCheckIn } from "@/services/hub-checkin";

/**
 * A function that quietly sends the player's location to the backend for hub check-in (double XP at their hub). It does nothing for a
 * player with no hub or when the backend has the feature off, and it never throws or shows anything.
 */
export function useSilentHubCheckin(): () => void {
  const { data: clubs } = useMyClubs();
  const { data: flags } = useFeatureFlags();
  return useCallback(() => {
    if (isFeatureOff(flags, "location_gamification") || isFeatureOff(flags, "virtual_hubs")) return;
    void silentHubCheckIn((clubs ?? []).map((c) => c.hub_id));
  }, [clubs, flags]);
}
