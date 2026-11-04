import { useQuery } from "@tanstack/react-query";
import { getPlannerDays, getPlannerStats } from "@/services/planner";
import type { PlannerDay, PlannerStats } from "@/lib/types/planner";

type PlannerData = {
  days: PlannerDay[];
  stats: PlannerStats;
};

async function fetchPlannerData(): Promise<PlannerData> {
  const [days, stats] = await Promise.all([getPlannerDays(), getPlannerStats()]);
  return { days, stats };
}

export function usePlanner() {
  return useQuery<PlannerData>({
    queryKey: ["planner"],
    queryFn: fetchPlannerData,
  });
}
