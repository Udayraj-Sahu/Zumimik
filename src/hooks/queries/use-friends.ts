import { useQuery } from "@tanstack/react-query";
import { getFriendsSummary, getFriendActivity } from "@/services/friends";
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
