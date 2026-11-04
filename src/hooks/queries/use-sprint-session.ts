import { useQuery } from "@tanstack/react-query";
import { getSprintQuestions } from "@/services/sprint-session";
import type { SprintSession } from "@/lib/types/sprint-session";

export function useSprintSession(topic: string, length: number, difficulty: string, domain?: string) {
  return useQuery<SprintSession>({
    queryKey: ["sprint-session", topic, length, difficulty, domain],
    queryFn: () => getSprintQuestions(topic, length, difficulty, domain),
    enabled: !!topic && length > 0 && !!difficulty,
  });
}
