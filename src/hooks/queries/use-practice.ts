import { useQuery } from "@tanstack/react-query";
import { getPracticeSession } from "@/services/practice";
import type { SprintSession } from "@/lib/types/sprint-session";

export function usePracticeSession(topic: string, length: number, difficulty: string, domain?: string) {
  return useQuery<SprintSession>({
    queryKey: ["practice", topic, length, difficulty, domain],
    queryFn: () => getPracticeSession(topic, length, difficulty, domain),
    enabled: !!topic && length > 0,
  });
}
