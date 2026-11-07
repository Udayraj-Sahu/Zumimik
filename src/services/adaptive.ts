import type { AdaptiveDomainState } from "@/lib/types/adaptive";
import { apiGet } from "./api";
import { mapBackendMastery, type BackendMasteryResponse } from "./backend-adapters";
export async function getAdaptiveState(domain: string): Promise<AdaptiveDomainState> {
  const mastery = await apiGet<BackendMasteryResponse>("/practice/mastery");
  return mapBackendMastery(mastery, domain);
}
