import { db, type MasteryHistoryRow } from "./offline/db";
import { changeKind, type SessionChange } from "@/lib/learning/session-change";

/**
 * The mastery timeline kept on this device: which technique changed label, when, and from what to what. It is built only from the
 * pipeline's own before and after states at the end of each session (a technique whose label did not change is not recorded, and nothing
 * is rebuilt from the current snapshot), so every row is something that really happened here. It is not shared between devices: the
 * backend has no history route yet (see BACKEND_TEAM_HANDOFF.md).
 */

/** Rows to write for a session, or none when no technique changed label. */
export function historyRowsFor(userId: string, sessionId: string, change: SessionChange, at: number): MasteryHistoryRow[] {
  if (!userId || !sessionId) return [];
  return change.skills
    .filter((s) => !!s.after && changeKind(s) !== "same")
    .map((s) => ({
      id: `${sessionId}:${s.skill}`,
      userId,
      skill: s.skill,
      at,
      sessionId,
      ...(s.before ? { before: s.before } : {}),
      after: s.after as MasteryHistoryRow["after"],
      ...(typeof s.engineVersion === "number" ? { engineVersion: s.engineVersion } : {}),
    }));
}

/** Store a session's changes. Idempotent (the row id is the session and technique) and never throws. */
export async function recordMasteryHistory(userId: string, sessionId: string, change: SessionChange, at: number): Promise<number> {
  const rows = historyRowsFor(userId, sessionId, change, at);
  if (rows.length === 0) return 0;
  try {
    await db.masteryHistory.bulkPut(rows);
    return rows.length;
  } catch {
    return 0;
  }
}

/** The most recent changes for one technique, newest first. Empty when none was recorded (never filled in from anything else). */
export async function loadMasteryHistory(userId: string, skill: string, limit = 5): Promise<MasteryHistoryRow[]> {
  if (!userId || !skill) return [];
  try {
    const rows = await db.masteryHistory.where("[userId+skill]").equals([userId, skill]).toArray();
    return rows.sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)).slice(0, Math.max(0, limit));
  } catch {
    return [];
  }
}
