import { targetTimeSeconds, type SessionLogEntry } from "@vmsg/psychometrics";
import { DEFAULT_AGE, isUsableTimestamp } from "./learner-state";

type RawEvent = Record<string, unknown>;

/**
 * The engine's session log for events that are still on the device (queued, not yet acknowledged by the server).
 *
 * Learner state is event-sourced: the server snapshot already contains every event it acknowledged, so replaying ONLY the
 * unacknowledged attempts over it gives the state the learner is really in, with no double counting and no dependence on a
 * locally advanced copy. Rules, identical to the live path (attemptEligibility):
 *   - only \`problem_attempt\` events with a boolean verdict (a deferred, server-graded answer has \`is_correct: null\`);
 *   - the canonical :Skill (\`skill_id\`) must be present; an event from before it was recorded cannot be tied to a skill
 *     and is skipped rather than guessed from a label;
 *   - \`feeds_mastery: false\` (sandbox) never moves mastery;
 *   - an event id is applied once, whichever batch carries it.
 * Time: the event's own \`client_timestamp\`. Events saved before attempt times were recorded share one stamp per batch; they keep
 * their array order (the sort is stable), which is the order they were answered in. A timestamp the clock cannot have produced
 * (before 2020, or beyond the allowed skew) is not trusted: the attempt is skipped from replay and stays queued for the server.
 */
export function attemptsFromEvents(events: ReadonlyArray<RawEvent>, now: number, age?: number): SessionLogEntry[] {
  const target = targetTimeSeconds(age ?? DEFAULT_AGE);
  const seen = new Set<string>();
  const rows: Array<{ index: number; entry: SessionLogEntry }> = [];
  events.forEach((event, index) => {
    if (event.event_type !== "problem_attempt") return;
    const id = typeof event.event_id === "string" ? event.event_id : null;
    if (id) {
      if (seen.has(id)) return;
      seen.add(id);
    }
    const m = (event.metadata ?? {}) as Record<string, unknown>;
    const skill = m.skill_id;
    if (typeof skill !== "string" || skill.length === 0) return;
    if (typeof m.is_correct !== "boolean") return;
    if (m.feeds_mastery === false) return;
    const at = event.client_timestamp;
    if (!isUsableTimestamp(at, now)) return;
    const timeMs = typeof m.time_ms === "number" && Number.isFinite(m.time_ms) ? Math.max(0, m.time_ms) : 0;
    rows.push({
      index,
      entry: {
        skill,
        attempt: {
          correct: m.is_correct,
          timeSpentSeconds: timeMs / 1000,
          targetTimeSeconds: target,
          ...(typeof m.difficulty === "number" ? { difficulty: m.difficulty } : {}),
          problemId: typeof m.problem_id === "string" ? m.problem_id : undefined,
          at: Math.min(at, now),
        },
      },
    });
  });
  rows.sort((a, b) => a.entry.attempt.at - b.entry.attempt.at || a.index - b.index);
  return rows.map((r) => r.entry);
}
