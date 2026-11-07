"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClrAction } from "@vmsg/psychometrics";
import { FATIGUE_INDEX_COMPUTED_EVENT, CLR_MODE_ACTIVATED_EVENT } from "@vmsg/psychometrics";
import type { TechniqueStateName } from "@vmsg/shared-types";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import {
  ageFromDob,
  applySession,
  buildSessionLog,
  type LearnerStates,
} from "@/lib/learning/learner-state";
import {
  evaluate,
  markServed,
  newWatch,
  observe,
  observeCheckpoint,
  reorderRemaining,
  type SessionWatch,
} from "@/lib/learning/wellbeing";
import { loadCalibration } from "@/services/calibration";
import { loadLearnerStates } from "@/services/learner";
import type { BreakKind } from "@/components/learn/break-overlay";
export type BreakInfo = {
  kind: BreakKind;
  seconds: number;
};
export type ScoredInput = {
  question: Question;
  /** The questions as currently ordered, and how many have been shown so far (the current one included). */
  questions: ReadonlyArray<Question>;
  servedCount: number;
  correct: boolean | null;
  timeSpentMs: number;
  /** Every answer given so far this session, the current one included: used to read the technique's current engine state. */
  answersSoFar: ReadonlyArray<SprintAnswer>;
  sessionStartedAt: number;
  /** The children's play limit in minutes (from the server's policy); null for everyone else. */
  sessionCapMin?: number | null;
};
/**
 * Watches one practice session for tiring and applies what the engine's controller asks for. The decisions are the engine's
 * (see lib/learning/wellbeing.ts); this hook only keeps the session's state and turns its actions into UI state:
 *   - guided: hints open by default while the controller keeps the learner in guided mode;
 *   - breakInfo: a pause to show (micro, forced, study-block, or the day-limit stop);
 *   - override: the questions still to come, reordered or trimmed by the controller (null = as served).
 * Real backend only. The state is the session's: the controller's window is the session, so nothing is carried over.
 */
export function useWellbeing(
  enabled: boolean,
  options: {
    observeOnly?: boolean;
  } = {},
) {
  const active = enabled;
  const watchRef = useRef<SessionWatch>(newWatch());
  const baseRef = useRef<LearnerStates | null>(null);
  const [guided, setGuided] = useState(false);
  const [breakInfo, setBreakInfo] = useState<BreakInfo | null>(null);
  const [override, setOverride] = useState<Question[] | null>(null);
  const [hardStopped, setHardStopped] = useState(false);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const userId = useAuthStore.getState().user?.id ?? "";
    void loadLearnerStates(userId).then((s) => {
      if (!cancelled) baseRef.current = s;
    });
    return () => {
      cancelled = true;
    };
  }, [active]);
  const reset = useCallback(() => {
    watchRef.current = newWatch();
    setGuided(false);
    setBreakInfo(null);
    setOverride(null);
    setHardStopped(false);
  }, []);
  const onScored = useCallback(
    (input: ScoredInput) => {
      if (!active) return;
      const onboarding = useOnboardingStore.getState();
      const userId = useAuthStore.getState().user?.id ?? "";
      const now = Date.now();
      const age = ageFromDob(onboarding.dob, now);
      let watch = observe(watchRef.current, {
        correct: input.correct,
        timeSpentMs: input.timeSpentMs,
      });
      if (watch === watchRef.current) return; // not a scored answer: nothing to evaluate
      // The engine state of the technique being practised right now, with this session's answers folded in.
      let techniqueState: TechniqueStateName | null = null;
      const skill = input.question.skillId;
      if (skill && baseRef.current) {
        const log = buildSessionLog(input.questions, input.answersSoFar, { endedAt: now, age });
        techniqueState = stateName(
          applySession(baseRef.current, log, now) ?? baseRef.current,
          skill,
        );
      }
      if (options.observeOnly) {
        // A timed simulation is never interrupted: the checkpoint is logged, nothing is applied or shown.
        watchRef.current = observeCheckpoint(watch, {
          age,
          baselineMs: loadCalibration(userId)?.ansBaselineMs ?? null,
          techniqueState,
          sessionElapsedMs: Math.max(0, now - input.sessionStartedAt),
          sessionCapMin: input.sessionCapMin ?? null,
          activePath: onboarding.activePath,
          uiMode: "quick",
        });
        return;
      }
      const result = evaluate(watch, {
        age,
        baselineMs: loadCalibration(userId)?.ansBaselineMs ?? null,
        techniqueState,
        sessionElapsedMs: Math.max(0, now - input.sessionStartedAt),
        sessionCapMin: input.sessionCapMin ?? null,
        activePath: onboarding.activePath,
        uiMode: watchRef.current.clr.active ? "guided" : "quick",
      });
      watch = result.watch;
      watchRef.current = watch;
      if (result.actions.length === 0) return;
      applyActions(result.actions, input);
    },
    // applyActions is defined below from stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, options.observeOnly],
  );
  function applyActions(actions: ClrAction[], input: ScoredInput) {
    for (const action of actions) {
      switch (action.kind) {
        case "force_ui_mode":
          setGuided(true);
          break;
        case "exit_clr":
          setGuided(false);
          setOverride(null); // the learner's own mode and the full remaining queue are back
          break;
        case "micro_break":
          setBreakInfo({ kind: "micro", seconds: action.seconds });
          break;
        case "forced_break":
          setBreakInfo({ kind: "forced", seconds: action.seconds });
          break;
        case "block_break":
          setBreakInfo({ kind: "block", seconds: action.minutes * 60 });
          break;
        case "hard_stop":
          setBreakInfo({ kind: "hard_stop", seconds: action.breakMinutes * 60 });
          setHardStopped(true);
          setOverride(input.questions.slice(0, input.servedCount)); // nothing more is served today
          break;
        case "cap_new_problems":
        case "reorder_easiest_first":
        case "sinking_only":
          setOverride(reorderRemaining(input.questions, input.servedCount, watchRef.current.clr));
          break;
        case "ratio_slippage":
          // The exam-sprint ratio applies to what is composed next; this session's questions are already fetched, so the
          // reordering above is all that can change here.
          break;
      }
    }
  }
  const onServed = useCallback((question: Pick<Question, "bucket">) => {
    watchRef.current = markServed(watchRef.current, question);
  }, []);
  /** The session's psychometric events for the sync batch (fatigue checkpoints and interventions). */
  const events = useCallback(
    () => [
      ...watchRef.current.fatigueEvents.map((metadata) => ({
        event_type: FATIGUE_INDEX_COMPUTED_EVENT as string,
        metadata: metadata as unknown as Record<string, unknown>,
      })),
      ...watchRef.current.clrEvents.map((metadata) => ({
        event_type: CLR_MODE_ACTIVATED_EVENT as string,
        metadata: metadata as unknown as Record<string, unknown>,
      })),
    ],
    [],
  );
  return {
    guided,
    breakInfo,
    dismissBreak: () => setBreakInfo(null),
    override,
    hardStopped,
    onScored,
    onServed,
    events,
    reset,
  };
}
function stateName(states: LearnerStates, skill: string) {
  return states[skill]?.state ?? null;
}
