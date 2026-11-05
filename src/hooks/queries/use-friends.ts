import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFriendsSummary, getFriendActivity, respondToFriendRequest, sendFriendRequest, removeFriend, generateFriendQr, redeemFriendQr, type FriendRequestAction } from "@/services/friends";
import type { Friend, FriendActivity } from "@/lib/types/friends";

type FriendsData = {
  friends: Friend[];
  activity: FriendActivity[];
  requests: Friend[];
};

async function fetchFriendsData(): Promise<FriendsData> {
  const [summary, activity] = await Promise.all([getFriendsSummary(), getFriendActivity()]);
  return { ...summary, activity };
}

export function useFriends() {
  return useQuery<FriendsData>({
    queryKey: ["friends"],
    queryFn: fetchFriendsData,
  });
}

/** Ask the server for a fresh one-time friend QR code. Every call issues a new code, so this is a mutation, not a cached query. */
export function useGenerateFriendQr() {
  return useMutation({ mutationFn: generateFriendQr });
}

/** Accept or decline an incoming request, then refresh the friends list (the single source of truth). */
export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ friendshipId, action }: { friendshipId: string; action: FriendRequestAction }) =>
      respondToFriendRequest(friendshipId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => sendFriendRequest(email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}

/** Redeem a scanned or pasted friend code; on success the new friend appears (the friends list is refreshed). */
export function useRedeemFriendQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scanned: string) => redeemFriendQr(scanned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => removeFriend(friendshipId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}
