import type { SprintSession } from "@/lib/types/sprint-session";
import { apiGet, apiPost } from "./api";
import { mapBackendPracticeSession, type BackendPracticeSessionResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

/** Prefix marking a problem-bank topic label (GET /api/topics) in the `topic` slot, as opposed to a :Skill name. */
export const BANK_TOPIC_PREFIX = "bank:";

export async function getPracticeSession(
  topic: string,
  length: number,
  difficulty: string,
  domain?: string,
): Promise<SprintSession> {
  if (IS_MOCK) {
    const { generateSprintSession } = await import("@/lib/mock/sprint-session");
    const { delay } = await import("@/lib/mock/delay");

    await delay(150);
    return generateSprintSession(topic, length, difficulty, domain);
  }
  if (topic.startsWith(BANK_TOPIC_PREFIX)) {
    // A problem-bank topic is a corpus label, which is exactly what GET /practice/session?topic= filters on.
    const label = topic.slice(BANK_TOPIC_PREFIX.length);
    const size = Math.min(50, Math.max(1, Math.floor(length)));
    const response = await apiGet<BackendPracticeSessionResponse>(
      `/practice/session?topic=${encodeURIComponent(label)}&size=${size}`,
    );
    return mapBackendPracticeSession(response, { topic: label, difficulty, domain });
  }
  // `topic` here is a :Skill name from GET /practice/catalog. GET /practice/session filters on corpus topic/technique
  // labels, a near-disjoint vocabulary, so a catalog skill is requested as a slot: POST /practice/session
  // { slots: [{ skill, bucket, n }] } (n: 1-50). The backend has no difficulty parameter; difficulty is only a label.
  const n = Math.min(50, Math.max(1, Math.floor(length)));
  const response = await apiPost<BackendPracticeSessionResponse>("/practice/session", {
    slots: [{ skill: topic, bucket: "primary", n }],
  });
  return mapBackendPracticeSession(response, { topic, difficulty, domain });
}
