import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  createClub,
  getClub,
  getClubLeaderboard,
  getMyClubs,
  joinClub,
  leaveClub,
  searchClubs,
  type Club,
  type ClubDetail,
  type ClubLeaderboard,
  type CreateClubInput,
} from "@/services/clubs";

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

export function useClub(hubId: string | null) {
  return useQuery<ClubDetail>({
    queryKey: ["clubs", "detail", hubId],
    queryFn: () => getClub(hubId as string),
    enabled: !!hubId,
    retry: false,
  });
}

/** Members only: the server answers 403 to anyone else, so ask only once the detail says you are in. */
export function useClubLeaderboard(hubId: string | null, isMember: boolean) {
  return useQuery<ClubLeaderboard>({
    queryKey: ["clubs", "leaderboard", hubId],
    queryFn: () => getClubLeaderboard(hubId as string),
    enabled: !!hubId && isMember,
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
