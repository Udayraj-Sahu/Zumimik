import { useQuery } from "@tanstack/react-query";
import { getSprintQuestions } from "@/services/sprint-session";
import type { PracticeLevel } from "@/services/practice";
import { ApiError } from "@/services/api";
import type { SprintSession } from "@/lib/types/sprint-session";

export function useSprintSession(topic: string, length: number, difficulty: string, domain?: string, level?: PracticeLevel) {
  return useQuery<SprintSession>({
    queryKey: ["sprint-session", topic, length, difficulty, domain, level],
    queryFn: () => getSprintQuestions(topic, length, difficulty, domain, level),
    enabled: !!topic && length > 0 && !!difficulty,
    // A served session must not be swapped by a focus/reconnect refetch mid-sprint.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
  });
}
