import { useQuery } from "@tanstack/react-query";
import { getSubjectTree, getLeafTechniques } from "@/services/explorer";
import { getTopicMastery } from "@/services/dashboard";
import { getReferencePages, getReferenceCard, type ReferencePageSummary, type ReferenceCard } from "@/services/reference";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { IS_MOCK } from "@/lib/platform";
import { explorerScopeKey } from "@/lib/exam-scope";
import type { TopicNode } from "@/lib/types/technique";
import type { Topic } from "@/lib/types/dashboard";

export const explorerKeys = {
  tree: (exam?: string | null) => ["explorer", "tree", explorerScopeKey(exam, IS_MOCK)] as const,
  techniques: (exam?: string | null) => ["explorer", "techniques", explorerScopeKey(exam, IS_MOCK)] as const,
  // The learner's mastery is not part of the topic catalog and has its own key (it is per exam: GET /dashboard/topics?domain=).
  mastery: (exam?: string | null) => ["explorer", "mastery", exam ?? ""] as const,
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

/** The learner's mastery for the active exam (GET /dashboard/topics?domain=). Separate from the catalog. */
export function useExplorerMastery(domain?: string) {
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activeDomain = domain || targetExam;
  return useQuery<Topic[]>({
    queryKey: explorerKeys.mastery(activeDomain),
    queryFn: () => getTopicMastery(activeDomain || undefined),
    staleTime: 60 * 1000,
  });
}

/** The Reference Library index (public). Real mode only: there are no bundled fixtures for it. */
export function useReferencePages(enabled = true) {
  return useQuery<ReferencePageSummary[]>({
    queryKey: ["explorer", "reference", "pages"],
    queryFn: getReferencePages,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReferenceCard(subtopicId: string | null) {
  return useQuery<ReferenceCard>({
    queryKey: ["explorer", "reference", "card", subtopicId],
    queryFn: () => getReferenceCard(subtopicId as string),
    enabled: !!subtopicId,
    staleTime: 5 * 60 * 1000,
  });
}
