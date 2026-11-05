import { useQuery } from "@tanstack/react-query";
import { getFeatureFlags, type FeatureFlags } from "@/services/flags";

export function useFeatureFlags() {
  return useQuery<FeatureFlags>({
    queryKey: ["feature-flags"],
    queryFn: getFeatureFlags,
    staleTime: 5 * 60 * 1000,
    retry: false, // if the list cannot be read nothing is hidden: unknown is treated as available
  });
}
