import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getChatPolicy, type ChatPolicy } from "@/services/chat";
/** Is the hint helper available to this learner (GET /chat/policy: 200 = yes, 404 = switched off / not in the rollout)? */
export function useChatPolicy(enabled = true) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ChatPolicy>({
    queryKey: ["chat", "policy", userId],
    queryFn: getChatPolicy,
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
    retry: false, // a 404 will not fix itself within the session
  });
}
