import { useQuery } from "@tanstack/react-query";
import { getPracticeSession, type PracticeLevel } from "@/services/practice";
import { ApiError } from "@/services/api";
import type { SprintSession } from "@/lib/types/sprint-session";

export function usePracticeSession(
  topic: string,
  length: number,
  difficulty: string,
  domain?: string,
  options: { enabled?: boolean; level?: PracticeLevel } = {},
) {
  return useQuery<SprintSession>({
    queryKey: ["practice", topic, length, difficulty, domain, options.level ?? null],
    queryFn: () => getPracticeSession(topic, length, difficulty, domain, options.level),
    enabled: !!topic && length > 0 && (options.enabled ?? true),
    // A served session must not change under the learner: a refetch (focus, reconnect) would swap the
    // questions and reset their progress. A new session is only requested explicitly.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Client errors (401/403/429/4xx) will not fix themselves; one retry for network/5xx.
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
  });
}
