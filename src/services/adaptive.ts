import type { AdaptiveDomainState } from "@/lib/types/adaptive";
import { apiGet } from "./api";
import { mapBackendMastery, type BackendMasteryResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getAdaptiveState(domain: string): Promise<AdaptiveDomainState> {
  if (IS_MOCK) {
    const { delay } = await import("@/lib/mock/delay");
    const { ensureAdaptiveState } = await import("@/lib/mock/adaptive");

    await delay(120);
    return ensureAdaptiveState(domain);
  }
  const mastery = await apiGet<BackendMasteryResponse>("/practice/mastery");
  return mapBackendMastery(mastery, domain);
}
