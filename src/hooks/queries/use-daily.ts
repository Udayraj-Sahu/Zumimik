import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { getDailyChallenge, getDailyLeaderboard, submitDailyChallenge, type DailyChallenge, type DailyLeaderboard } from "@/services/daily";

const noRetryOnClientError = (count: number, error: unknown) => !(error instanceof ApiError && error.status < 500) && count < 1;

export function useDailyChallenge() {
  return useQuery<DailyChallenge>({
    queryKey: ["daily-challenge"],
    queryFn: getDailyChallenge,
    // Today's problems must not be swapped under a learner mid-attempt.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: noRetryOnClientError,
  });
}

export function useDailyLeaderboard(enabled = true) {
  return useQuery<DailyLeaderboard>({
    queryKey: ["daily-leaderboard"],
    queryFn: getDailyLeaderboard,
    enabled,
    retry: noRetryOnClientError,
  });
}

export function useSubmitDaily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answers, totalTimeMs }: { answers: Array<string | null>; totalTimeMs: number }) => submitDailyChallenge(answers, totalTimeMs),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["daily-challenge"] });
      void qc.invalidateQueries({ queryKey: ["daily-leaderboard"] });
      for (const key of ["achievements", "dashboard", "analytics", "account-summary", "profile"]) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}
