import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt } from "@vmsg/psychometrics";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

vi.setConfig({ testTimeout: 60000 });

const T0 = Date.UTC(2026, 10, 6, 12, 0, 0);
const MIN = 60_000;

vi.mock("@/lib/platform", () => ({ IS_MOCK: false, safeLocalStorage: localStorage }));
vi.mock("@/services/learner", () => {
  let s = freshState("S");
  for (let i = 0; i < 30; i++) s = processAttempt(s, { correct: true, timeSpentSeconds: 3, targetTimeSeconds: 20, problemId: `old${i}`, at: T0 - 2 * 86_400_000 + i * 1000 });
  return { loadLearnerStates: vi.fn(async () => ({ S: s })) };
});

const question = (n: number): Question => ({ id: `q${n}`, text: `${n} + ${n} = ?`, options: [], correctIndex: 0, timeLimit: 30, skillId: "S", feedsMastery: true, trustStatus: "trusted", bucket: "frontier", difficulty: 2 });
const questions = Array.from({ length: 14 }, (_, i) => question(i + 1));

/** Ten scored answers: five quick and right, then five slow (one wrong) after a long stretch: a learner tiring. */
async function answerTen(hook: ReturnType<typeof renderHook<ReturnType<typeof import("./use-wellbeing").useWellbeing>, unknown>>) {
  const answered: SprintAnswer[] = [];
  for (let i = 0; i < 10; i++) {
    const slow = i >= 5;
    const right = i !== 7;
    const timeSpent = slow ? 40 : 4;
    answered.push({ questionId: `q${i + 1}`, selectedIndex: -1, answerText: "x", correct: right, timeSpent, answeredAt: T0 + (slow ? 22 * MIN : 0) + i * 5000 });
    await act(async () => {
      hook.result.current.onScored({
        question: questions[i],
        questions,
        servedCount: i + 1,
        correct: right,
        timeSpentMs: timeSpent * 1000,
        answersSoFar: [...answered],
        sessionStartedAt: T0 - 5 * MIN, // the session has been running for 27 minutes by the last answer
      });
    });
  }
}

describe("fatigue watching in a timed simulation versus a normal session", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"], now: T0 + 22 * MIN + 50_000 });
  });
  afterEach(() => vi.useRealTimers());

  async function hookFor(options: { observeOnly?: boolean }) {
    const { useWellbeing } = await import("./use-wellbeing");
    const hook = renderHook(() => useWellbeing(true, options));
    await new Promise((r) => setTimeout(r, 20)); // the learner state loads
    return hook;
  }

  it("a normal session is interrupted when the engine says so: a break, guided hints, a trimmed queue", async () => {
    const hook = await hookFor({});
    await answerTen(hook);
    await waitFor(() => expect(hook.result.current.breakInfo?.kind).toBe("micro"));
    expect(hook.result.current.guided).toBe(true);
    expect(hook.result.current.override).not.toBeNull();
    expect(hook.result.current.events().some((e) => e.event_type === "clr_mode_activated")).toBe(true);
  });

  it("a timed simulation only records the checkpoint: no break, no hints, no reordering, no intervention event", async () => {
    const hook = await hookFor({ observeOnly: true });
    await answerTen(hook);
    expect(hook.result.current.breakInfo).toBeNull();
    expect(hook.result.current.guided).toBe(false);
    expect(hook.result.current.override).toBeNull();
    expect(hook.result.current.hardStopped).toBe(false);
    const events = hook.result.current.events();
    expect(events.some((e) => e.event_type === "clr_mode_activated")).toBe(false); // nothing was activated, so nothing is claimed
    const checkpoints = events.filter((e) => e.event_type === "fatigue_index_computed");
    expect(checkpoints).toHaveLength(2); // the engine's checkpoints at the 5th and 10th scored answer
    expect(checkpoints[1].metadata.exceeded).toBe(true); // the same reading the normal session acted on, recorded only
  });

  it("answers that are not scored are never observed", async () => {
    const hook = await hookFor({ observeOnly: true });
    await act(async () => {
      hook.result.current.onScored({ question: questions[0], questions, servedCount: 1, correct: null, timeSpentMs: 4000, answersSoFar: [], sessionStartedAt: T0 });
    });
    expect(hook.result.current.events()).toEqual([]);
  });
});
