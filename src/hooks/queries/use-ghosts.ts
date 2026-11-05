import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api";
import { getGhosts, raceGhost, saveGhost, type Ghost } from "@/services/ghosts";

export function useGhosts() {
  return useQuery<Ghost[]>({
    queryKey: ["ghosts"],
    queryFn: getGhosts,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
  });
}

export function useSaveGhost() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: saveGhost, onSuccess: () => void qc.invalidateQueries({ queryKey: ["ghosts"] }) });
}

export function useRaceGhost() {
  return useMutation({ mutationFn: ({ ghostId, timeMs, correct }: { ghostId: string; timeMs: number; correct: number }) => raceGhost(ghostId, { timeMs, correct }) });
}
