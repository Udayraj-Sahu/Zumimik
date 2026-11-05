import { useQuery } from "@tanstack/react-query";
import { IS_MOCK } from "@/lib/platform";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { loadCatalogSkills, loadLearnerStates, loadSinkingBook } from "@/services/learner";
import { daysToExam } from "@/services/practice";
import { recommendSteps, type NextStep } from "@/lib/learning/mastery-view";
import type { LearnerStates } from "@/lib/learning/learner-state";

export type LearnerView = {
  states: LearnerStates | null;
  /** The best next step (the first of steps). */
  next: NextStep | null;
  /** The few best next steps, most useful first, each a different technique. */
  steps: NextStep[];
};

/** The learner's hydrated engine states (for mastery labels) and what to practise next. Real backend only. */
export function useLearnerView() {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  return useQuery<LearnerView>({
    queryKey: ["learner-view", userId],
    queryFn: async () => {
      const now = Date.now();
      const states = await loadLearnerStates(userId, now);
      if (!states) return { states: null, next: null, steps: [] };
      const onboarding = useOnboardingStore.getState();
      let steps: NextStep[] = [];
      try {
        steps = recommendSteps(states, await loadCatalogSkills(), loadSinkingBook(userId), now, daysToExam(onboarding.examDates[onboarding.targetExam], now));
      } catch {
        steps = []; // the catalog could not be read: labels still show, no recommendation
      }
      return { states, next: steps[0] ?? null, steps };
    },
    enabled: !IS_MOCK && !!userId,
    staleTime: 60_000,
    retry: false,
  });
}
