import { useQuery } from "@tanstack/react-query";
import { getAdaptiveState } from "@/services/adaptive";
import { recommendPlan } from "@/lib/adaptive/engine";
import { enginePlan } from "@/lib/adaptive/engine-plan";
import { useLearnerView } from "@/hooks/queries/use-learner-view";
import { IS_MOCK } from "@/lib/platform";
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
  const view = useLearnerView();
  // Real mode: the plan comes from the shared learner model. If the learner's history cannot be read (offline with nothing remembered)
  // the earlier heuristic plan, built from the server's topic list, is the fallback so the screen is never empty.
  const engineReady = !IS_MOCK && !!view.data?.states;
  // While the learner model is still loading, show nothing rather than the earlier heuristic plan, which would flash and then be replaced.
  const engineLoading = !IS_MOCK && view.isLoading;
  return {
    ...query,
    data: query.data && engineLoading
      ? EMPTY_PLAN
      : query.data
      ? engineReady
        ? enginePlan(query.data, view.data?.steps ?? [], dailyMinutes ?? 30, focusMode)
        : recommendPlan(query.data, dailyMinutes ?? 30, focusMode)
      : EMPTY_PLAN,
  };
}