import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFriendsSummary, getFriendActivity, respondToFriendRequest, type FriendRequestAction } from "@/services/friends";
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

/** Accept or decline an incoming request, then refresh the friends list (the single source of truth). */
export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ friendshipId, action }: { friendshipId: string; action: FriendRequestAction }) =>
      respondToFriendRequest(friendshipId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}
