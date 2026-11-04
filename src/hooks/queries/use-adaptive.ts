import { useQuery } from "@tanstack/react-query";
import { getAdaptiveState } from "@/services/adaptive";
import { recommendPlan } from "@/lib/adaptive/engine";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type { AdaptiveDomainState, TodayPlan } from "@/lib/types/adaptive";

const EMPTY_PLAN: TodayPlan = { weakTopic: null, practice: null, mock: null, timeBudget: [] };

export function useAdaptiveState(domain?: string) {
  return useQuery<AdaptiveDomainState>({
    queryKey: ["adaptive-state", domain],
    queryFn: () => getAdaptiveState(domain!),
    enabled: !!domain,
  });
}

export function useTodayPlan(domain?: string) {
  const query = useAdaptiveState(domain);
  const dailyMinutes = useOnboardingStore((s) => s.dailyMinutes);
  const focusMode = useOnboardingStore((s) => s.focusMode);
  return {
    ...query,
    data: query.data
      ? recommendPlan(query.data, dailyMinutes ?? 30, focusMode)
      : EMPTY_PLAN,
  };
}