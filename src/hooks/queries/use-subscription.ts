import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSubscription, type Subscription } from "@/services/billing";
import { useAuthStore } from "@/stores/auth-store";
import { usePlanStore } from "@/stores/plan-store";

/** Subscription/entitlement from the backend. Also keeps the local plan gate in step with it (real mode). */
export function useSubscription() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const setPlanFromEntitlement = usePlanStore((s) => s.setPlanFromEntitlement);

  const query = useQuery<Subscription>({
    queryKey: ["subscription", userId],
    queryFn: getSubscription,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setPlanFromEntitlement(query.data.tier);
  }, [query.data, setPlanFromEntitlement]);

  return query;
}
