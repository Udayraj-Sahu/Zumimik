import { useQuery } from "@tanstack/react-query";
import { getSubjectTree, getLeafTechniques } from "@/services/explorer";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type { TopicNode } from "@/lib/types/technique";

export function useSubjectTree(domain?: string) {
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activeDomain = domain || targetExam;
  return useQuery<TopicNode[]>({
    queryKey: ["subject-tree", activeDomain],
    queryFn: () => getSubjectTree(activeDomain),
    enabled: !!activeDomain,
  });
}

export function useLeafTechniques(domain?: string) {
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activeDomain = domain || targetExam;
  return useQuery<TopicNode[]>({
    queryKey: ["leaf-techniques", activeDomain],
    queryFn: () => getLeafTechniques(activeDomain),
    enabled: !!activeDomain,
  });
}
