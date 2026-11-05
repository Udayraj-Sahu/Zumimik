import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimReferralReward, getReferralStatus, type ReferralStatus } from "@/services/referral";
import { useAuthStore } from "@/stores/auth-store";

export function useReferralStatus(options: { enabled?: boolean } = {}) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ReferralStatus | null>({
    queryKey: ["referral", userId],
    queryFn: getReferralStatus,
    enabled: !!userId && (options.enabled ?? true),
    staleTime: 60 * 1000,
    retry: false, // a 403/404 means the feature flag is off for this user: do not hammer it
  });
}

/** Claim the reward the server says is due, then refresh the ladder and the subscription/entitlements it may have changed. */
export function useClaimReferralReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimReferralReward,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["referral"] });
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
