import { useQuery } from "@tanstack/react-query";
import { getMockPapers, getMockPaperSession } from "@/services/mock-exam";
import type { MockPaper } from "@/lib/types/mock-exam";
import type { SprintSession } from "@/lib/types/sprint-session";

export function useMockPapers(domain?: string) {
  return useQuery<MockPaper[]>({
    queryKey: ["mock-papers", domain],
    queryFn: () => getMockPapers(domain),
    enabled: !!domain,
  });
}

export function useMockPaperSession(paperId?: string, domain?: string) {
  return useQuery<SprintSession>({
    queryKey: ["mock-session", paperId, domain],
    queryFn: () => getMockPaperSession(paperId!, domain),
    enabled: !!paperId,
  });
}
