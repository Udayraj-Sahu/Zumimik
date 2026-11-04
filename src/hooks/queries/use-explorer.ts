import { useQuery } from "@tanstack/react-query";
import { getSubjectTree, getLeafTechniques } from "@/services/explorer";
import { getTopicMastery } from "@/services/dashboard";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { IS_MOCK } from "@/lib/platform";
import { explorerScopeKey } from "@/lib/exam-scope";
import type { TopicNode } from "@/lib/types/technique";
import type { Topic } from "@/lib/types/dashboard";

export const explorerKeys = {
  tree: (exam?: string | null) => ["explorer", "tree", explorerScopeKey(exam, IS_MOCK)] as const,
  techniques: (exam?: string | null) => ["explorer", "techniques", explorerScopeKey(exam, IS_MOCK)] as const,
  // The learner's mastery is not part of the topic catalog and has its own key.
  mastery: () => ["explorer", "mastery"] as const,
};

export function useSubjectTree(domain?: string) {
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activeDomain = domain || targetExam;
  return useQuery<TopicNode[]>({
    queryKey: explorerKeys.tree(activeDomain),
    queryFn: () => getSubjectTree(activeDomain),
    enabled: !!activeDomain,
  });
}

export function useLeafTechniques(domain?: string) {
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activeDomain = domain || targetExam;
  return useQuery<TopicNode[]>({
    queryKey: explorerKeys.techniques(activeDomain),
    queryFn: () => getLeafTechniques(activeDomain),
    enabled: !!activeDomain,
  });
}

/** The learner's mastery (GET /dashboard/topics). Separate from the catalog; its `domain` parameter is a backend no-op. */
export function useExplorerMastery() {
  return useQuery<Topic[]>({
    queryKey: explorerKeys.mastery(),
    queryFn: () => getTopicMastery(),
    staleTime: 60 * 1000,
  });
}
