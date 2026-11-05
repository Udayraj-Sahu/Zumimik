import { useQuery } from "@tanstack/react-query";
import { IS_MOCK } from "@/lib/platform";
import { useAuthStore } from "@/stores/auth-store";
import { getSocialPolicy, type SocialPolicy } from "@/services/social-policy";

export function useSocialPolicy() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<SocialPolicy>({
    queryKey: ["social", "policy", userId],
    queryFn: getSocialPolicy,
    enabled: !IS_MOCK && !!userId,
    staleTime: 60 * 1000,
    retry: false,
  });
}
