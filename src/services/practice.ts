import type { SprintSession } from "@/lib/types/sprint-session";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

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
  const params = new URLSearchParams({ topic, length: String(length), difficulty });
  if (domain) params.set("domain", domain);
  return apiGet<SprintSession>(`/practice?${params.toString()}`);
}
