import { useQuery } from "@tanstack/react-query";
import { getReferralStatus, type ReferralStatus } from "@/services/referral";
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
