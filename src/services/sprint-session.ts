import type { SprintSession } from "@/lib/types/sprint-session";
import { apiGet } from "./api";
import { mapBackendPracticeSession, type BackendPracticeSessionResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getSprintQuestions(
  topic: string,
  length: number,
  difficulty: string,
  domain?: string,
): Promise<SprintSession> {
  if (IS_MOCK) {
    const { generateSprintSession } = await import("@/lib/mock/sprint-session");
    const { delay } = await import("@/lib/mock/delay");

    await delay(300);
    return generateSprintSession(topic, length, difficulty, domain);
  }
  const params = new URLSearchParams({ topic, size: String(length) });
  const response = await apiGet<BackendPracticeSessionResponse>(`/practice/session?${params}`);
  return mapBackendPracticeSession(response, { topic, difficulty, domain });
}
