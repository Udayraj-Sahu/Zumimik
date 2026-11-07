import { useQuery } from "@tanstack/react-query";
import { getPlans } from "@/services/billing";
import {
  applyBackendPricing,
  effectiveCycle,
  unavailablePricing,
  type PricingState,
} from "@/lib/pricing";
/**
 * The plans to display, priced from GET /billing/plans. Mock mode keeps the bundled prices. In real mode, until the backend prices
 * load (or if they cannot), paid prices are unknown ("—"): the bundled prices (which disagree with the backend) are never shown.
 */
export function usePricedPlans(): PricingState & {
  cycle: (requested: "annual" | "monthly") => "annual" | "monthly";
} {
  const { data } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: getPlans,
    enabled: true,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const state = data ? applyBackendPricing(data.plans) : unavailablePricing();
  return { ...state, cycle: (requested) => effectiveCycle(requested, state) };
}
