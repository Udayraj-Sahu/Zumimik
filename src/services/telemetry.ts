import type { SprintResult, SprintSession } from "@/lib/types/sprint-session";
import { IS_MOCK } from "@/lib/platform";
import { apiPost } from "./api";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { applySession, ageFromDob, buildSessionLog, resolveAttemptTimes } from "@/lib/learning/learner-state";
import { recordMasteryHistory } from "./mastery-history";
import { cognitiveLoadOf } from "@/lib/learning/wellbeing";
import { applyAbilityBook, sendableAbility } from "@/lib/learning/ability-book";
import type { CalibrationRecord } from "@/lib/learning/calibration";
import { summariseChange, type SessionChange } from "@/lib/learning/session-change";
import { applySessionToSinking } from "@/lib/learning/review";
import { commitAbilityBook, commitSinkingBook, invalidateLearnerCache, loadAbilityBook, loadSinkingBook, reconcileLearnerStates, withLearnerLock } from "./learner";
import { syncDeviceId } from "./offline/device-id";
import { trackSync } from "./offline/sync-activity";
import { flushQueuedBefore, settleAcknowledged, enqueueEventBatch, isPermanentRejection, parkEventBatch, removeEventBatch } from "./offline/sync";

export type SyncEvent = Record<string, unknown>;

/**
 * Build the /sync events for a finished session. Event ids are generated here, once: re-sending the SAME events
 * after a failure is idempotent on the backend (event_id is the key), whereas rebuilding would double-count.
 */
export function buildSprintSyncEvents(
  session: Pick<SprintSession, "questions" | "topic"> & Partial<Pick<SprintSession, "domain">>,
  result: SprintResult,
  domain?: string,
  sessionType = "sprint",
): SyncEvent[] {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  // Each attempt carries the time it actually happened (session end minus the time still to come), not one shared stamp.
  const times = resolveAttemptTimes(result.answers, now);
  const questions = new Map(session.questions.map((question) => [question.id, question]));
  const attempted = result.answers.filter((answer) => answer.selectedIndex !== -1 || answer.answerText !== undefined);
  const events: SyncEvent[] = attempted.map((answer) => {
    const question = questions.get(answer.questionId);
    return {
      event_id: crypto.randomUUID(),
      event_type: "problem_attempt",
      client_timestamp: times.get(answer.questionId)?.at ?? now,
      session_id: sessionId,
      session_elapsed_ms: Math.max(0, Math.round(answer.timeSpent * 1000)),
      metadata: {
        skill: question?.techniqueId ?? session.topic,
        // The canonical :Skill, present only when the server sent one: what mastery is replayed from (never a label).
        ...(question?.skillId ? { skill_id: question.skillId } : {}),
        // "actual": the device time at submission. "reconstructed": fallback for an answer saved without one.
        at_source: times.get(answer.questionId)?.source ?? "reconstructed",
        problem_id: answer.questionId,
        is_correct: answer.correct,
        time_ms: Math.max(0, Math.round(answer.timeSpent * 1000)),
        domain: domain ?? session.domain ?? "vedic-math",
        ...(question?.difficulty !== undefined ? { difficulty: question.difficulty } : {}),
        // The engine's base cognitive load of the question (COG-01), logged with the attempt as the design specifies.
        ...(cognitiveLoadOf(question?.text) !== undefined ? { bcl: cognitiveLoadOf(question?.text) } : {}),
        ...(question?.feedsMastery !== undefined ? { feeds_mastery: question.feedsMastery } : {}),
        ...(question?.answerCheck ? { answer_check: question.answerCheck } : {}),
        ...(answer.correct === null && answer.answerText !== undefined
          ? { submitted_answer: answer.answerText.trim() }
          : {}),
      },
    };
  });

  events.push({
    event_id: crypto.randomUUID(),
    event_type: "session_end",
    client_timestamp: now,
    session_id: sessionId,
    metadata: {
      problems_attempted: attempted.length,
      problems_correct: attempted.filter((answer) => answer.correct === true).length,
      problems_deferred: attempted.filter((answer) => answer.correct === null).length,
      session_type: sessionType,
      domain: domain ?? session.domain ?? "vedic-math",
      total_time_ms: Math.max(0, Math.round(result.totalTimeSpent * 1000)),
    },
  });

  return events;
}

/**
 * The /sync events for a finished session PLUS the learner's updated mastery. The session_end event carries `technique_states`
 * (the whole picture, which every server reader treats as the learner's mastery): the persisted snapshot, hydrated by the
 * engine, with this session's eligible attempts replayed over it (processAttempt via rebuildStates).
 * If the persisted snapshot cannot be read, no snapshot is attached: the stored mastery is left alone rather than replaced by a
 * history-less rebuild. Real mode only; demo mode has no server-side mastery.
 */
export async function buildSessionSyncEvents(
  session: Pick<SprintSession, "questions" | "topic"> & Partial<Pick<SprintSession, "domain">>,
  result: SprintResult,
  domain?: string,
  sessionType = "sprint",
  opts: { calibration?: CalibrationRecord; extraEvents?: Array<{ event_type: string; metadata: Record<string, unknown> }>; onChange?: (change: SessionChange) => void } = {},
): Promise<SyncEvent[]> {
  const events = buildSprintSyncEvents(session, result, domain, sessionType);
  if (IS_MOCK) return events;
  const now = Date.now();
  const userKey = useAuthStore.getState().user?.id ?? "";
  const age = ageFromDob(useOnboardingStore.getState().dob, now);
  const end = events[events.length - 1] as { event_id: string; session_id: string; metadata: Record<string, unknown> };
  // Psychometric events from the session (fatigue checkpoints, cognitive-load interventions), logged with it.
  for (const extra of opts.extraEvents ?? []) {
    events.splice(events.length - 1, 0, {
      event_id: crypto.randomUUID(),
      event_type: extra.event_type,
      client_timestamp: now,
      session_id: end.session_id,
      metadata: extra.metadata,
    });
  }
  if (opts.calibration) {
    // calibration_completed {priors, ans_baseline_ms}: the warm-up's result, logged with the session that produced it.
    events.splice(events.length - 1, 0, {
      event_id: crypto.randomUUID(),
      event_type: "calibration_completed",
      client_timestamp: now,
      session_id: end.session_id,
      metadata: {
        priors: opts.calibration.priors,
        ans_baseline_ms: Math.round(opts.calibration.ansBaselineMs),
        active_path: opts.calibration.activePath,
        answered: opts.calibration.answered,
      },
    });
  }
  const log = buildSessionLog(session.questions, result.answers, { endedAt: now, age });
  if (log.length === 0) return events;
  // Ability (IRT) per subject: the stored estimates (merged with the server's evidence when it sends any) with this session's first
  // scored answers recorded, each in the estimate of its own subject. Independent of the mastery snapshot, so it is kept even when that
  // snapshot could not be read. Only subjects the server knows (quant, di) are sent; items with no named subject feed a local-only
  // estimate and are never reported as Quant.
  const abilities = await loadAbilityBook(userKey);
  const abilitiesNext = applyAbilityBook(abilities, session.questions, result.answers, { endedAt: now });
  if (abilitiesNext !== abilities) {
    const sendable = sendableAbility(abilitiesNext);
    if (Object.keys(sendable).length > 0) end.metadata.theta = sendable;
    commitAbilityBook(userKey, abilitiesNext);
  }
  const base = await reconcileLearnerStates(userKey, now);
  const priors = opts.calibration ? new Map(Object.entries(opts.calibration.priors)) : undefined;
  const next = applySession(base, log, now, priors);
  // What this session did to each technique, from the same states that are about to be persisted.
  const change = summariseChange(log, base, next);
  if (change) {
    opts.onChange?.(change);
    void recordMasteryHistory(userKey, end.session_id, change, now); // best effort: never blocks the session or its sync
  }
  // Review book: wrong answers add or raise entries; a technique the engine now calls fluid is recovered and leaves.
  commitSinkingBook(userKey, applySessionToSinking(loadSinkingBook(userKey), log, next));
  if (!next) return events;
  end.metadata.technique_states = next;
  return events;
}

/**
 * Build a finished session's events AND store them durably, as one step under the learner lock. A session that finishes while
 * another is being built waits, and then starts from a state that already includes the first one's queued events, so neither
 * snapshot can drop the other. The returned events are what to hand to `sendSyncBatch` (storing them again is a no-op: the
 * stored batch is keyed by its first event id).
 */
export async function queueSessionSync(
  session: Pick<SprintSession, "questions" | "topic"> & Partial<Pick<SprintSession, "domain">>,
  result: SprintResult,
  domain?: string,
  sessionType = "sprint",
  opts: { calibration?: CalibrationRecord; extraEvents?: Array<{ event_type: string; metadata: Record<string, unknown> }>; onChange?: (change: SessionChange) => void } = {},
): Promise<SyncEvent[]> {
  if (IS_MOCK) return buildSprintSyncEvents(session, result, domain, sessionType);
  return withLearnerLock(async () => {
    const events = await buildSessionSyncEvents(session, result, domain, sessionType, opts);
    await enqueueEventBatch(events);
    return events;
  });
}

/** POST /api/v1/sync. Resolves only when the backend acknowledged the batch. */
export async function postSyncEvents(events: SyncEvent[]): Promise<void> {
  if (IS_MOCK) return;
  await apiPost("/sync", { events, device_id: syncDeviceId() });
}

/**
 * Durable send. The batch is written to Dexie first, then posted:
 *  - "synced": the backend acknowledged it (the stored copy is removed).
 *  - "queued": it could not be delivered (offline/server trouble); it stays on the device and is retried automatically.
 * A permanent rejection (e.g. 422) is parked and thrown, so the caller never claims it was saved.
 */
export async function sendSyncBatch(events: SyncEvent[]): Promise<"synced" | "queued"> {
  if (IS_MOCK) return "synced";
  const id = await enqueueEventBatch(events);
  try {
    await flushQueuedBefore(id); // earlier sessions first, so the server sees them in order
    const response = await trackSync(() => apiPost("/sync", { events, device_id: syncDeviceId() }));
    // Acknowledged. Events the server rejected one by one are parked with their reason, never silently dropped.
    if (id) await settleAcknowledged({ id, events }, response);
    else await removeEventBatch(id);
    invalidateLearnerCache(); // the server's mastery just changed
    return "synced";
  } catch (err) {
    if (isPermanentRejection(err)) {
      await parkEventBatch(id, err instanceof Error ? err.message : "rejected");
      throw err;
    }
    if (!id) throw err; // nothing durable to fall back on
    return "queued";
  }
}

export async function syncSprintResult(
  session: Pick<SprintSession, "questions" | "topic"> & Partial<Pick<SprintSession, "domain">>,
  result: SprintResult,
  domain?: string,
  sessionType = "sprint",
  extraEvents: Array<{ event_type: string; metadata: Record<string, unknown> }> = [],
): Promise<SessionChange | null> {
  if (IS_MOCK) return null;
  let change: SessionChange | null = null;
  // Durable: a failed send is kept on the device and retried, not dropped.
  await sendSyncBatch(await queueSessionSync(session, result, domain, sessionType, { extraEvents, onChange: (c) => { change = c; } }));
  return change;
}
