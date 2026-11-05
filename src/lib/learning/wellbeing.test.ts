import { describe, expect, it } from "vitest";
import { fatigueElapsedGateS, fatigueThreshold, ageGroup, STAMINA_HARD_STOP_MIN } from "@vmsg/psychometrics";
import { evaluate, markServed, newWatch, observe, reorderRemaining, type CheckpointContext, type SessionWatch } from "./wellbeing";
import type { Question } from "@/lib/types/sprint-session";

const MIN = 60_000;
const base: CheckpointContext = { age: 20, baselineMs: 5000, techniqueState: "fluid", sessionElapsedMs: 25 * MIN, activePath: null, uiMode: "quick" };

/** n scored answers: the first half quick and right, then slow and often wrong (a learner tiring). */
function tiring(count: number, w: SessionWatch = newWatch()): SessionWatch {
  let watch = w;
  for (let i = watch.attempts.length; i < count; i++) {
    const late = i >= 5;
    watch = observe(watch, { correct: late ? i % 2 === 0 : true, timeSpentMs: late ? 30_000 + i * 500 : 4_000 });
  }
  return watch;
}
const calm = (count: number, w: SessionWatch) => {
  let watch = w;
  for (let i = watch.attempts.length; i < count; i++) watch = observe(watch, { correct: true, timeSpentMs: 4_000 });
  return watch;
};

describe("fatigue checkpoints use the engine's gates", () => {
  it("nothing happens off a checkpoint or with too few scored answers", () => {
    const w = tiring(4);
    expect(evaluate(w, base)).toMatchObject({ actions: [], triggered: false });
    const five = tiring(5);
    const r = evaluate(five, base);
    expect(r.triggered).toBe(false); // a checkpoint, but fewer than ten answers: the index is not evaluated
    expect(r.watch.fatigueEvents).toHaveLength(1); // still logged, so the gates can be reviewed
    expect(r.watch.fatigueEvents[0].evaluated).toBe(false);
    expect(r.actions).toEqual([]);
  });

  it("unscored answers (deferred, no verdict) are never counted", () => {
    let w = newWatch();
    w = observe(w, { correct: null, timeSpentMs: 5000 });
    w = observe(w, { correct: true, timeSpentMs: Number.NaN });
    w = observe(w, { correct: true, timeSpentMs: -1 });
    expect(w.attempts).toHaveLength(0);
  });

  it("is not evaluated until the age-specific elapsed gate has passed, or when the technique is not fluid", () => {
    const w = tiring(10);
    const gate = fatigueElapsedGateS(ageGroup(20)) * 1000;
    expect(evaluate(w, { ...base, sessionElapsedMs: gate }).triggered).toBe(false); // strictly after the gate
    expect(evaluate(w, { ...base, sessionElapsedMs: gate }).watch.fatigueEvents[0].skip_reason).toBe("elapsed_gate");
    expect(evaluate(w, { ...base, techniqueState: "fragile" }).watch.fatigueEvents[0].skip_reason).toBe("not_fluid");
    expect(evaluate(w, { ...base, sessionElapsedMs: gate + 1000 }).triggered).toBe(true);
  });

  it("an unknown age gets the protective kids threshold and gate", () => {
    const w = tiring(10);
    const kidsGate = fatigueElapsedGateS(null) * 1000;
    expect(kidsGate).toBeLessThan(fatigueElapsedGateS(ageGroup(20)) * 1000);
    const r = evaluate(w, { ...base, age: undefined, sessionElapsedMs: kidsGate + 1000 });
    expect(r.watch.fatigueEvents[0].age_threshold).toBe(fatigueThreshold(null));
    expect(r.triggered).toBe(true);
  });

  it("without a warm-up baseline it falls back to the session's first five answers", () => {
    const r = evaluate(tiring(10), { ...base, baselineMs: null });
    expect(r.watch.fatigueEvents[0].baseline_source).toBe("session");
  });

  it("a calm session does not trigger", () => {
    expect(evaluate(calm(10, newWatch()), base).triggered).toBe(false);
  });
});

describe("the controller's interventions", () => {
  it("first trigger: guided mode, a short break, new problems capped, easiest first; the event is logged", () => {
    const r = evaluate(tiring(10), base);
    expect(r.triggered).toBe(true);
    expect(r.actions.map((a) => a.kind)).toEqual(expect.arrayContaining(["force_ui_mode", "micro_break", "cap_new_problems", "reorder_easiest_first"]));
    expect(r.actions.find((a) => a.kind === "micro_break")).toMatchObject({ seconds: 120 });
    expect(r.actions.find((a) => a.kind === "cap_new_problems")).toMatchObject({ max: 3 });
    expect(r.watch.clr.active).toBe(true);
    expect(r.watch.clrEvents).toHaveLength(1);
    expect(r.watch.clrEvents[0]).toMatchObject({ intervention: "standard", ui_mode_to: "guided", micro_break_s: 120, new_problem_cap: 3 });
  });

  it("the same checkpoint cannot trigger twice", () => {
    const first = evaluate(tiring(10), base);
    const again = evaluate(first.watch, { ...base, uiMode: "guided" });
    expect(again.actions).toEqual([]);
    expect(again.watch.clrEvents).toHaveLength(1);
  });

  it("a repeat trigger is a forced break with review-only questions (and it is finite: a calm checkpoint afterwards exits)", () => {
    const first = evaluate(tiring(10), base);
    const second = evaluate(tiring(15, first.watch), { ...base, uiMode: "guided", sessionElapsedMs: 27 * MIN });
    expect(second.actions.map((a) => a.kind)).toEqual(expect.arrayContaining(["forced_break", "sinking_only"]));
    expect(second.actions.find((a) => a.kind === "forced_break")).toMatchObject({ seconds: 300 });
    expect(second.watch.clr.sinkingOnly).toBe(true);

    // The learner recovers: calm answers, after the break has ended, lift CLR and restore their own mode.
    const recovered = evaluate(calm(35, calm(25, second.watch)), { ...base, uiMode: "guided", sessionElapsedMs: 40 * MIN });
    expect(recovered.watch.clr.active).toBe(false);
    expect(recovered.actions.map((a) => a.kind)).toContain("exit_clr");
    // and a calm checkpoint on its own never starts another intervention
    expect(evaluate(calm(40, recovered.watch), { ...base, sessionElapsedMs: 41 * MIN }).actions).toEqual([]);
  });

  it("exam preparation uses stamina mode: a break and a ratio instead of the new-problem cap", () => {
    const r = evaluate(tiring(10), { ...base, activePath: "exam_prep" });
    const kinds = r.actions.map((a) => a.kind);
    expect(kinds).toContain("ratio_slippage");
    expect(kinds).not.toContain("cap_new_problems");
    expect(r.watch.clrEvents[0]).toMatchObject({ intervention: "stamina", goal: "exam_sprint", new_problem_cap: null });
  });

  it("an exam sprint stops after the engine's daily limit", () => {
    const r = evaluate(calm(10, newWatch()), { ...base, activePath: "exam_prep", sessionElapsedMs: (STAMINA_HARD_STOP_MIN + 5) * MIN });
    expect(r.actions.map((a) => a.kind)).toContain("hard_stop");
  });
});

describe("what is left of the session is reordered by the engine", () => {
  const q = (id: string, bucket: Question["bucket"], difficulty: number): Question => ({ id, text: id, options: [], correctIndex: 0, timeLimit: 30, bucket, difficulty });
  const list = [q("done", "primary", 3), q("a", "frontier", 4), q("b", "primary", 2), q("c", "frontier", 1), q("d", "sinking", 3), q("e", "frontier", 2), q("f", "frontier", 5)];

  it("leaves the served part alone and returns everything when CLR is not active", () => {
    const idle = newWatch();
    expect(reorderRemaining(list, 1, idle.clr).map((x) => x.id)).toEqual(list.map((x) => x.id));
  });

  it("standard CLR: easiest first and at most three new (frontier) problems", () => {
    const w = evaluate(tiring(10), base).watch;
    const out = reorderRemaining(list, 1, w.clr);
    expect(out[0].id).toBe("done");
    expect(out.slice(1).map((x) => x.id)).toEqual(["c", "b", "e", "d", "a"]); // f (the 4th frontier item) is held back
    expect(out.filter((x) => x.bucket === "frontier").length - 0).toBeLessThanOrEqual(1 + 3);
  });

  it("the cap counts what is actually served", () => {
    let w = evaluate(tiring(10), base).watch;
    for (const id of ["c", "e", "a"]) w = markServed(w, list.find((x) => x.id === id)!);
    expect(reorderRemaining(list, 1, w.clr).map((x) => x.id)).not.toContain("f");
    expect(reorderRemaining(list, 1, w.clr).filter((x) => x.bucket === "frontier").map((x) => x.id)).toEqual([]);
  });

  it("after a forced break only review questions remain", () => {
    const first = evaluate(tiring(10), base);
    const second = evaluate(tiring(15, first.watch), { ...base, uiMode: "guided", sessionElapsedMs: 27 * MIN });
    const out = reorderRemaining(list, 1, second.watch.clr);
    expect(out.slice(1).every((x) => x.bucket === "sinking")).toBe(true);
    expect(out.slice(1).map((x) => x.id)).toEqual(["d"]);
  });
});

describe("per-question cognitive load (the engine's own count from the question text)", () => {
  const mk = (id: string, text: string, difficulty: number | undefined, bucket: Question["bucket"] = "primary"): Question => ({ id, text, options: [], correctIndex: 0, timeLimit: 30, bucket, difficulty });

  it("is the engine's value, between 1 and 5, higher for heavier arithmetic", async () => {
    const { cognitiveLoadOf } = await import("./wellbeing");
    const light = cognitiveLoadOf("12 + 13 = ?")!;
    const heavy = cognitiveLoadOf("98 × 97 = ?")!;
    expect(light).toBeGreaterThanOrEqual(1);
    expect(heavy).toBeLessThanOrEqual(5);
    expect(heavy).toBeGreaterThan(light);
    expect(heavy).toBe(5); // many column carries clamp at the engine's maximum
    expect(cognitiveLoadOf("1 + 1")!).toBeGreaterThanOrEqual(1); // never below the minimum
  });

  it("is undefined when there is nothing to count", async () => {
    const { cognitiveLoadOf } = await import("./wellbeing");
    for (const t of [undefined, null, "", "   "]) expect(cognitiveLoadOf(t)).toBeUndefined();
  });

  it("breaks a tie between questions of the same difficulty: the lighter one comes first", () => {
    const clr = evaluate(tiring(10), base).watch.clr;
    const list = [mk("done", "1 + 1", 2), mk("heavy", "98 × 97 = ?", 2), mk("light", "12 + 13 = ?", 2), mk("harder", "1 + 1", 3)];
    const out = reorderRemaining(list, 1, clr).map((x) => x.id);
    expect(out).toEqual(["done", "light", "heavy", "harder"]); // difficulty first, then load, never the other way round
  });

  it("difficulty still decides before load, so a light hard question does not jump an easier heavy one", () => {
    const clr = evaluate(tiring(10), base).watch.clr;
    const list = [mk("done", "1 + 1", 2), mk("easyHeavy", "98 × 97 = ?", 1), mk("hardLight", "1 + 1", 4)];
    expect(reorderRemaining(list, 1, clr).map((x) => x.id)).toEqual(["done", "easyHeavy", "hardLight"]);
  });

  it("without text or without difficulty it falls back to difficulty and then to the original order", () => {
    const clr = evaluate(tiring(10), base).watch.clr;
    const list = [mk("done", "x", 2), mk("b", "", 2), mk("a", "", 2), mk("noDiff", "", undefined)];
    expect(reorderRemaining(list, 1, clr).map((x) => x.id)).toEqual(["done", "b", "a", "noDiff"]); // unknown difficulty sorts last
  });

  it("does not change the order when CLR is not active", () => {
    const list = [mk("a", "98 × 97", 2), mk("b", "1 + 1", 2)];
    expect(reorderRemaining(list, 0, newWatch().clr).map((x) => x.id)).toEqual(["a", "b"]);
  });
});
