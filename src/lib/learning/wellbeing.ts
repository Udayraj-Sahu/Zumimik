import {
  ageGroup,
  clrGoal,
  clrQueue,
  fatigueCheckpoint,
  initialClrState,
  recordClrServed,
  stepClr,
  type ActivePath,
  type ClrAction,
  type ClrModeActivatedPayload,
  type ClrState,
  type FatigueAttempt,
  type FatigueIndexComputedPayload,
} from "@vmsg/psychometrics";
import type { RenderMode, TechniqueStateName } from "@vmsg/shared-types";
import type { Question } from "@/lib/types/sprint-session";

/**
 * Fatigue and cognitive-load regulation on top of the vendored engine. fatigueCheckpoint decides whether the learner is tiring (its
 * gates, windows and age thresholds are the engine's, and the engine marks its weights and thresholds as provisional), stepClr decides
 * what to do about it, clrQueue reorders what is left. This file only feeds them the session's real scored attempts and keeps the
 * state between calls; it chooses no threshold and adds no rule of its own.
 */

export type SessionWatch = {
  /** Scored attempts this session, oldest first. Unscored (deferred / unanswered) answers are never added. */
  attempts: FatigueAttempt[];
  clr: ClrState;
  /** Events to log with the session: one fatigue_index_computed per checkpoint, one clr_mode_activated per intervention. */
  fatigueEvents: FatigueIndexComputedPayload[];
  clrEvents: ClrModeActivatedPayload[];
};

export function newWatch(): SessionWatch {
  return { attempts: [], clr: initialClrState(), fatigueEvents: [], clrEvents: [] };
}

export type CheckpointContext = {
  age?: number;
  /** Warm-up ANS baseline (ms); absent or 0 makes the engine fall back to the session's first five answers. */
  baselineMs?: number | null;
  /** The current technique's engine state name (never the state object); null when unknown. */
  techniqueState: TechniqueStateName | null;
  sessionElapsedMs: number;
  /** The learner's session cap in minutes (children only); absent means the engine default. */
  sessionCapMin?: number | null;
  activePath: ActivePath | null;
  uiMode: RenderMode;
};

export type CheckpointResult = {
  watch: SessionWatch;
  /** What the controller asked for at this checkpoint, in order. Empty off a checkpoint and when nothing is needed. */
  actions: ClrAction[];
  /** The engine evaluated the index and found it above the age threshold. */
  triggered: boolean;
};

/** Record one scored answer. Only a boolean verdict counts. */
export function observe(watch: SessionWatch, attempt: { correct: boolean | null; timeSpentMs: number }): SessionWatch {
  if (attempt.correct === null || !Number.isFinite(attempt.timeSpentMs) || attempt.timeSpentMs < 0) return watch;
  return { ...watch, attempts: [...watch.attempts, { correct: attempt.correct, timeSpentMs: attempt.timeSpentMs }] };
}

/**
 * Run the engine at the current scored count. Off a checkpoint (every fifth scored answer) the engine does nothing and neither do
 * we. At a checkpoint the engine always returns an event (skipped ones included), which is kept for logging; stepClr then turns an
 * exceeded index into actions, once per checkpoint (it is idempotent on the scored count, so a repeat call cannot re-trigger).
 */
export function evaluate(watch: SessionWatch, ctx: CheckpointContext): CheckpointResult {
  const checkpoint = fatigueCheckpoint({
    attempts: watch.attempts,
    baselineMs: ctx.baselineMs ?? null,
    ageGroup: ageGroup(ctx.age ?? null),
    techniqueState: ctx.techniqueState,
    sessionElapsedS: ctx.sessionElapsedMs / 1000,
    sessionCapMin: ctx.sessionCapMin ?? null,
    scoredCount: watch.attempts.length,
  });
  if (checkpoint.event === null) return { watch, actions: [], triggered: false };
  const step = stepClr(watch.clr, checkpoint, { goal: clrGoal(ctx.activePath), uiMode: ctx.uiMode, sessionElapsedMs: ctx.sessionElapsedMs });
  return {
    watch: {
      ...watch,
      clr: step.clrState,
      fatigueEvents: [...watch.fatigueEvents, checkpoint.event],
      clrEvents: step.event ? [...watch.clrEvents, step.event] : watch.clrEvents,
    },
    actions: step.actions,
    triggered: checkpoint.exceeded,
  };
}

/**
 * The questions still to come, as the engine wants them under CLR: easiest first, new material capped, review-only after a forced
 * break. The served prefix (everything up to and including the current question) is kept as is. Inactive CLR returns the list
 * unchanged. Questions the engine drops are not served this session; they stay unseen on the server for the next one.
 */
export function reorderRemaining(questions: ReadonlyArray<Question>, servedCount: number, clr: ClrState): Question[] {
  if (!clr.active) return [...questions];
  const served = questions.slice(0, servedCount);
  const remaining = clrQueue(questions.slice(servedCount), clr);
  return [...served, ...remaining];
}

/** Count a question as served: new-problem caps are measured against what was actually shown. */
export function markServed(watch: SessionWatch, question: Pick<Question, "bucket">): SessionWatch {
  const clr = recordClrServed(watch.clr, { bucket: question.bucket });
  return clr === watch.clr ? watch : { ...watch, clr };
}
