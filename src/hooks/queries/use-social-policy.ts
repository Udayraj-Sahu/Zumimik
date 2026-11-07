import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocialPolicy, type SocialPolicy } from "@/services/social-policy";
export function useSocialPolicy() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<SocialPolicy>({
    queryKey: ["social", "policy", userId],
    queryFn: getSocialPolicy,
    enabled: !!userId,
    staleTime: 60 * 1000,
    retry: false,
  });
}
