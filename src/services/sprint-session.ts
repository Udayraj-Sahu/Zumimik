import type { SprintSession } from "@/lib/types/sprint-session";
import { getPracticeSession, type PracticeLevel } from "./practice";
export async function getSprintQuestions(
  topic: string,
  length: number,
  difficulty: string,
  domain?: string,
  level?: PracticeLevel,
): Promise<SprintSession> {
  // A sprint topic is a catalog :Skill. GET /practice/session?topic= filters corpus topic labels (a different vocabulary) and
  // returned no questions for most skills, so Sprint uses the same POST slot request as Practice.
  return getPracticeSession(topic, length, difficulty, domain, level);
}
