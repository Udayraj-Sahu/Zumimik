import { useQuery } from "@tanstack/react-query";
import { IS_MOCK } from "@/lib/platform";
import { useAuthStore } from "@/stores/auth-store";
import { loadMasteryHistory } from "@/services/mastery-history";

/** The recorded label changes for one technique on this device, newest first. */
export function useMasteryHistory(skill: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  return useQuery({
    queryKey: ["mastery-history", userId, skill ?? ""],
    queryFn: () => loadMasteryHistory(userId, skill ?? ""),
    enabled: !IS_MOCK && !!userId && !!skill,
    staleTime: 30_000,
    retry: false,
  });
}
