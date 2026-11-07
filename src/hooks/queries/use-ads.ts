import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useNetworkStore } from "@/stores/network-store";
import { useFeatureFlags } from "@/hooks/queries/use-feature-flags";
import { isFeatureOff } from "@/services/flags";
import {
  AD_PLACEMENTS,
  flushImpressions,
  getAdDecision,
  queueImpression,
  type AdPlacement,
  type AdShown,
} from "@/services/ads";
/**
 * Ask the server whether to show an ad at this placement. Returns the unit to show, or null for every other case: not signed in,
 * offline, mock mode, the `ad_engine` flag off (nothing is requested then), the engine answering 404/403, or the server saying
 * no (kids, paid tier, cooldown, hourly cap...). The server decides; there is no client-side fallback ad.
 */
export function useAdDecision(placement: AdPlacement): AdShown | null {
  const userId = useAuthStore((s) => s.user?.id);
  const online = useNetworkStore((s) => s.isOnline);
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  const enabled = !!userId && online && !flagsLoading && !isFeatureOff(flags, "ad_engine");
  const { data } = useQuery({
    queryKey: ["ads", "decision", placement, userId],
    queryFn: () => getAdDecision(placement),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return enabled && data && data.show ? data : null;
}
/**
 * Count an impression only after the ad has really been on screen for the whole duration the server allowed (a banner that is
 * dismissed or navigated away from earlier is not counted). Queued first, so it survives going offline, then sent.
 */
export function useAdImpression(ad: AdShown | null, onShown?: () => void): void {
  const recorded = useRef<string | null>(null);
  const shown = useRef(onShown);
  useEffect(() => {
    shown.current = onShown;
  });
  const token = ad?.token ?? null;
  const seconds = ad?.duration_seconds ?? 0;
  const unitId = ad?.unit.unit_id;
  const placement = ad?.placement;
  useEffect(() => {
    if (!token || !unitId || !placement || seconds <= 0 || recorded.current === token) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return; // not actually seen
      recorded.current = token;
      queueImpression({
        token,
        unit_id: unitId,
        placement,
        screen: AD_PLACEMENTS[placement],
        shown_at: startedAt,
        duration_ms: seconds * 1000,
      });
      void flushImpressions();
      shown.current?.();
    }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [token, unitId, placement, seconds]);
}
