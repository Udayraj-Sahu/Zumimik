import type { PlannerDay, PlannerStats } from "@/lib/types/planner";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getPlannerDays(): Promise<PlannerDay[]> {
  if (IS_MOCK) {
    const { PLANNER_DAYS, PLANNER_STATS } = await import("@/lib/mock/planner");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return PLANNER_DAYS;
  }
  return apiGet<PlannerDay[]>("/planner/days");
}

export async function getPlannerStats(): Promise<PlannerStats> {
  if (IS_MOCK) {
    const { PLANNER_DAYS, PLANNER_STATS } = await import("@/lib/mock/planner");
    const { delay } = await import("@/lib/mock/delay");

    await delay(100);
    return PLANNER_STATS;
  }
  return apiGet<PlannerStats>("/planner/stats");
}
