import type { AdaptiveDomainState, SessionOutcome } from "@/lib/types/adaptive";
import { apiGet, apiPost } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getAdaptiveState(domain: string): Promise<AdaptiveDomainState> {
  if (IS_MOCK) {
    const { delay } = await import("@/lib/mock/delay");
    const { ensureAdaptiveState } = await import("@/lib/mock/adaptive");

    await delay(120);
    return ensureAdaptiveState(domain);
  }
  return apiGet<AdaptiveDomainState>(`/adaptive/state?domain=${domain}`);
}

export async function recordAdaptiveSession(outcome: SessionOutcome): Promise<AdaptiveDomainState> {
  if (IS_MOCK) {
    const { delay } = await import("@/lib/mock/delay");
    const { recordMockAdaptiveSession } = await import("@/lib/mock/adaptive");

    await delay(80);
    return recordMockAdaptiveSession(outcome);
  }
  return apiPost<AdaptiveDomainState>("/adaptive/sessions", outcome);
}