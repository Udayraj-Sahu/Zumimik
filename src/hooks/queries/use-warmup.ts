import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getWarmupOffer, type WarmupOffer } from "@/services/calibration";

export function useWarmupOffer() {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  return useQuery<WarmupOffer>({
    queryKey: ["warmup-offer", userId],
    queryFn: () => getWarmupOffer(userId),
    enabled: !!userId,
    staleTime: 60_000,
    retry: false,
  });
}
