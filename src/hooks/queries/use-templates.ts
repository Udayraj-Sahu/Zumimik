import { useQuery } from "@tanstack/react-query";
import { getTemplatesByCategory, getTemplatesByDomain } from "@/services/templates";
import type { SolveAlongTemplate } from "@/lib/types/template";

export const templatesKeys = {
  domain: (exam: string) => ["templates", "domain", exam] as const,
  category: (category: string, exam: string) => ["templates", "category", category, exam] as const,
};

export function useTemplatesByDomain(exam: string | null) {
  return useQuery<SolveAlongTemplate[]>({
    queryKey: templatesKeys.domain(exam ?? ""),
    queryFn: () => getTemplatesByDomain(exam as string),
    enabled: !!exam,
  });
}

export function useTemplatesByCategory(category: string | null, exam: string) {
  return useQuery<SolveAlongTemplate[]>({
    queryKey: templatesKeys.category(category ?? "", exam),
    queryFn: () => getTemplatesByCategory(category as string, exam),
    enabled: !!category,
  });
}
