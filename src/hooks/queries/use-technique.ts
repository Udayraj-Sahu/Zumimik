import { useQuery } from "@tanstack/react-query";
import { getTechnique, getTechniquesBySubject, getAllTechniques } from "@/services/techniques";
import type { Technique } from "@/lib/types/technique";

export function useTechnique(id: string) {
  return useQuery<Technique | null>({
    queryKey: ["technique", id],
    queryFn: () => getTechnique(id),
    enabled: !!id,
  });
}

export function useTechniquesBySubject(subjectId: string) {
  return useQuery<Technique[]>({
    queryKey: ["techniques", "subject", subjectId],
    queryFn: () => getTechniquesBySubject(subjectId),
    enabled: !!subjectId,
  });
}

export function useAllTechniques() {
  return useQuery<Technique[]>({
    queryKey: ["techniques", "all"],
    queryFn: getAllTechniques,
  });
}
