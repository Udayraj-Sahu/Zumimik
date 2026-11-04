import type { AdaptiveDomainState, SessionOutcome } from "@/lib/types/adaptive";
import { apiGet, apiPost } from "./api";
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

export async function recordAdaptiveSession(outcome: SessionOutcome): Promise<AdaptiveDomainState> {
  if (IS_MOCK) {
    const { delay } = await import("@/lib/mock/delay");
    const { recordMockAdaptiveSession } = await import("@/lib/mock/adaptive");

    await delay(80);
    return recordMockAdaptiveSession(outcome);
  }
  const sessionId = crypto.randomUUID();
  await apiPost("/sync", {
    events: [
      {
        event_id: crypto.randomUUID(),
        event_type: "session_end",
        client_timestamp: outcome.ts,
        session_id: sessionId,
        metadata: {
          domain: outcome.domain,
          session_type: "adaptive",
          problems_attempted: outcome.total,
          problems_correct: outcome.score,
          total_time_ms: Math.round(outcome.totalTimeSpent * 1000),
        },
      },
    ],
  });
  return getAdaptiveState(outcome.domain);
}
