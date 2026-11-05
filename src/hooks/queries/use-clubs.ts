import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { createClub, getMyClubs, joinClub, leaveClub, searchClubs, type Club, type CreateClubInput } from "@/services/clubs";

export function useClubSearch(q: string, enabled = true) {
  return useQuery<Club[]>({
    queryKey: ["clubs", "search", q.trim()],
    queryFn: () => searchClubs({ q }),
    enabled,
    retry: false, // a 404/403 means the feature is off or refused for this account: do not hammer it
  });
}

export function useMyClubs(enabled = true) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<Club[]>({
    queryKey: ["clubs", "mine", userId],
    queryFn: getMyClubs,
    enabled: enabled && !!userId,
    retry: false,
  });
}

function useRefreshClubs() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["clubs"] });
}

export function useCreateClub() {
  const refresh = useRefreshClubs();
  return useMutation({ mutationFn: (input: CreateClubInput) => createClub(input), onSuccess: refresh });
}

export function useJoinClub() {
  const refresh = useRefreshClubs();
  return useMutation({ mutationFn: (hubId: string) => joinClub(hubId), onSuccess: refresh });
}

export function useLeaveClub() {
  const refresh = useRefreshClubs();
  return useMutation({ mutationFn: (hubId: string) => leaveClub(hubId), onSuccess: refresh });
}
