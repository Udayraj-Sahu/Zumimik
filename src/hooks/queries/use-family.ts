import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSeat,
  getChildFriends,
  getFamily,
  removeSeat,
  requestChildFriend,
  respondChildFriend,
  revokeChildFriend,
  setSeatStatus,
} from "@/services/family";
import { useAuthStore } from "@/stores/auth-store";
import type { ChildFriendAction, ChildFriends, FamilyOverview, NewSeatInput } from "@/lib/types/family";

export const familyKeys = {
  all: (userId?: string) => ["family", userId] as const,
  friends: (childId: string) => ["family-friends", childId] as const,
};

export function useFamily() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<FamilyOverview>({
    queryKey: familyKeys.all(userId),
    queryFn: getFamily,
    enabled: !!userId,
    retry: false, // 403/401 will not fix themselves
  });
}

/** Seat changes also change the parent's quote/discounts and the child's tier: refresh the family and the subscription. */
function useSeatMutation<TArg, TRes>(fn: (arg: TArg) => Promise<TRes>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["family"] });
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export const useCreateSeat = () => useSeatMutation((input: NewSeatInput) => createSeat(input));
export const useSetSeatStatus = () =>
  useSeatMutation(({ childUserId, status }: { childUserId: string; status: "active" | "suspended" }) => setSeatStatus(childUserId, status));
export const useRemoveSeat = () => useSeatMutation((childUserId: string) => removeSeat(childUserId));

export function useChildFriends(childUserId: string | null, enabled: boolean) {
  return useQuery<ChildFriends>({
    queryKey: familyKeys.friends(childUserId ?? ""),
    queryFn: () => getChildFriends(childUserId!),
    enabled: !!childUserId && enabled,
    retry: false,
  });
}

function useFriendMutation<TArg>(fn: (arg: TArg) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["family-friends"] }),
  });
}

export const useRequestChildFriend = () =>
  useFriendMutation(({ childUserId, email }: { childUserId: string; email: string }) => requestChildFriend(childUserId, email));
export const useRespondChildFriend = () =>
  useFriendMutation(({ friendshipId, action }: { friendshipId: string; action: ChildFriendAction }) => respondChildFriend(friendshipId, action));
export const useRevokeChildFriend = () => useFriendMutation((friendshipId: string) => revokeChildFriend(friendshipId));
