import type { SprintSession } from "@/lib/types/sprint-session";
import { getPracticeSession, type PracticeLevel } from "./practice";

import { IS_MOCK } from "@/lib/platform";

export async function getSprintQuestions(
  topic: string,
  length: number,
  difficulty: string,
  domain?: string,
  level?: PracticeLevel,
): Promise<SprintSession> {
  if (IS_MOCK) {
    const { generateSprintSession } = await import("@/lib/mock/sprint-session");
    const { delay } = await import("@/lib/mock/delay");

    await delay(300);
    return generateSprintSession(topic, length, difficulty, domain);
  }
  // A sprint topic is a catalog :Skill. GET /practice/session?topic= filters corpus topic labels (a different vocabulary) and
  // returned no questions for most skills, so Sprint uses the same POST slot request as Practice.
  return getPracticeSession(topic, length, difficulty, domain, level);
}
