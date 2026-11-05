import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { freshState, processAttempt, type SessionLogEntry, type TechniqueState } from "@vmsg/psychometrics";
import { changeKind, summariseChange } from "./session-change";
import { summariseProgress } from "./progress-view";
import { breakdownSession } from "./session-breakdown";
import { enginePlan, ADAPTIVE_DIFFICULTY, DEFAULT_PLAN_LENGTH } from "@/lib/adaptive/engine-plan";
import type { AdaptiveDomainState } from "@/lib/types/adaptive";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

const NOW = Date.UTC(2026, 10, 6, 12);
const DAY = 86_400_000;
function practised(skill: string, results: boolean[], lastAt = NOW - DAY): TechniqueState {
  let s = freshState(skill);
  results.forEach((c, i) => { s = processAttempt(s, { correct: c, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}${i}`, at: lastAt - (results.length - i) * 1000 }); });
  return s;
}
const entry = (skill: string, correct: boolean): SessionLogEntry => ({ skill, attempt: { correct, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: skill + Math.random(), at: NOW } });

describe("what a session did to each technique", () => {
  it("compares the engine states before and after, per technique, with this session's accuracy kept separate", () => {
    const before = { A: practised("A", [true, true, true, true, true, true]) };
    const after = { A: practised("A", Array(30).fill(true)), B: practised("B", [false, false, false, false]) };
    const change = summariseChange([entry("A", true), entry("A", true), entry("B", false)], before, after)!;
    const a = change.skills.find((s) => s.skill === "A")!;
    expect(a).toMatchObject({ attempts: 2, correct: 2, before: "fragile", after: "fluid" });
    expect(changeKind(a)).toBe("improved");
    const b = change.skills.find((s) => s.skill === "B")!;
    expect(b).toMatchObject({ attempts: 1, correct: 0, before: undefined, after: "fractured" });
    expect(changeKind(b)).toBe("new");
    expect(changeKind({ before: "fluid", after: "fragile" })).toBe("slipped");
    expect(changeKind({ before: "fragile", after: "fragile" })).toBe("same");
  });

  it("is null whenever either side is unknown, so a change that was not calculated is never shown", () => {
    expect(summariseChange([entry("A", true)], null, {})).toBeNull();
    expect(summariseChange([entry("A", true)], {}, null)).toBeNull();
    expect(summariseChange([], {}, {})).toBeNull();
  });
});

describe("progress comes from the engine labels, not from effort", () => {
  it("counts techniques by label, lists strong and weak, and orders recent practice by when it happened", () => {
    const states = {
      Strong: practised("Strong", Array(30).fill(true), NOW - 2 * DAY),
      Mid: practised("Mid", [true, true, true, true, true, true], NOW - 1 * DAY),
      Weak: practised("Weak", [false, false, false, false], NOW - 5 * DAY),
      Unseen: freshState("Unseen"),
    };
    const p = summariseProgress(states, NOW)!;
    expect(p.practised).toBe(3); // a technique with no attempts is not practised
    expect(p.counts).toEqual({ fluid: 1, fragile: 1, fractured: 1 });
    expect(p.strong).toEqual(["Strong"]);
    expect(p.weak).toEqual(["Weak"]);
    expect(p.recent.map((r) => r.skill)).toEqual(["Mid", "Strong", "Weak"]);
    expect(p.recent[0].daysAgo).toBe(1);
    expect(summariseProgress(null, NOW)).toBeNull();
  });

  it("does not depend on how many questions were answered", () => {
    const light = summariseProgress({ A: practised("A", [false, false, false, false]) }, NOW)!;
    const heavy = summariseProgress({ A: { ...practised("A", [false, false, false, false]), totalAttempts: 5000 } }, NOW)!;
    expect(heavy.counts).toEqual(light.counts); // volume of practice does not change a mastery label
  });
});

describe("session breakdown is accuracy only", () => {
  const q = (id: string, skillId: string | undefined, difficulty: number): Question => ({ id, text: id, options: [], correctIndex: 0, timeLimit: 30, skillId, difficulty });
  const a = (id: string, correct: boolean | null, t: number): SprintAnswer => ({ questionId: id, selectedIndex: 0, correct, timeSpent: t });
  it("groups scored answers by technique and difficulty and averages the time; deferred and unanswered are left out", () => {
    const b = breakdownSession(
      [q("1", "A", 2), q("2", "A", 3), q("3", "B", 3), q("4", "B", 3), q("5", undefined, 1)],
      [a("1", true, 4), a("2", false, 8), a("3", true, 6), a("4", null, 5), { questionId: "5", selectedIndex: -1, correct: false, timeSpent: 1 }],
    );
    expect(b.byTechnique).toEqual([
      { skill: "A", attempts: 2, correct: 1, accuracyPct: 50 },
      { skill: "B", attempts: 1, correct: 1, accuracyPct: 100 },
    ]);
    expect(b.byDifficulty).toEqual([
      { difficulty: 2, attempts: 1, correct: 1, accuracyPct: 100 },
      { difficulty: 3, attempts: 2, correct: 1, accuracyPct: 50 },
    ]);
    expect(b.avgSeconds).toBe(6);
    expect(breakdownSession([], []).avgSeconds).toBeNull();
  });
});

describe("today's plan from the learner model", () => {
  const state: AdaptiveDomainState = {
    domain: "cat",
    topics: [
      { id: "Fractions", name: "Fractions", color: "primary", mastery: 20, attempts: 3, currentStreak: 0, bestStreak: 0, status: "ACTIVE" },
      { id: "Decimals", name: "Decimals", color: "primary", mastery: 90, attempts: 9, currentStreak: 5, bestStreak: 5, status: "MASTERED" },
    ],
    sessionCount: 2,
    lastSession: null,
  };
  it("takes the technique from the engine, not from the lowest percentage, and leaves difficulty to the learner's ability", () => {
    const plan = enginePlan(state, [{ skill: "Decimals", kind: "review" }, { skill: "Geometry", kind: "new" }], 30, "sprint");
    expect(plan.weakTopic).toMatchObject({ topicId: "Decimals", difficulty: ADAPTIVE_DIFFICULTY, length: DEFAULT_PLAN_LENGTH }); // the review item, although it shows 90%
    expect(plan.practice).toMatchObject({ topicId: "Geometry", topicLabel: "Geometry", mastery: 0, difficulty: ADAPTIVE_DIFFICULTY }); // not in the topic list: labelled by id, no percentage invented
    expect(plan.timeBudget.length).toBeGreaterThan(0);
  });
  it("never repeats the same technique twice and tolerates having nothing to recommend", () => {
    const same = enginePlan(state, [{ skill: "Fractions", kind: "continue" }], 30, "sprint");
    expect(same.weakTopic?.topicId).toBe("Fractions");
    expect(same.practice).toBeNull();
    const none = enginePlan(state, [], 30, "sprint");
    expect(enginePlan(state, [{ skill: "Geometry", kind: "new" }], 30, "sprint").weakTopic).toBeNull(); // nothing to intervene on: a new technique is a practice suggestion, not a weak spot
    expect(none.weakTopic).toBeNull();
    expect(none.practice).toBeNull();
  });
});

describe("adaptive learning widgets live in the Adaptive Learning tab", () => {
  function all(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) all(path, out);
      else if (/.(ts|tsx)$/.test(name) && !/.test./.test(name)) out.push(path.split("\\").join("/"));
    }
    return out;
  }
  const importers = (needle: string) => all("src").filter((f) => readFileSync(f, "utf8").includes(needle));

  it("the learning-progress, warm-up and recommendation cards are reached only through the tab section", () => {
    expect(importers("adaptive/learner-progress-card")).toEqual(["src/components/adaptive/adaptive-engine-section.tsx"]);
    expect(importers("adaptive/warmup-card")).toEqual(["src/components/adaptive/adaptive-engine-section.tsx"]);
    // the recommendation card also closes a finished sprint (what to practise next), and sits inside the progress card
    expect(importers("adaptive/next-step-card").sort()).toEqual(["src/app/(app)/play/sprint/results/page.tsx", "src/components/adaptive/learner-progress-card.tsx"]);
  });

  it("the tab section is mounted by the /learn page, and by nothing else", () => {
    expect(importers("adaptive/adaptive-engine-section")).toEqual(["src/app/(app)/learn/page.tsx"]);
  });

  it("the Dashboard and the Explorer render none of them", () => {
    for (const file of ["src/app/(app)/dashboard/page.tsx", "src/app/(app)/learn/explorer/page.tsx"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/learner-progress-card|warmup-card|next-step-card|adaptive-engine-section/);
    }
  });
});

describe("behaviour and competition stay out of the learner model", () => {
  function sources(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) sources(path, out);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(path);
    }
    return out;
  }
  const read = (p: string) => readFileSync(p, "utf8");

  it("habits, XP, leaderboards, ghosts and the daily challenge never import the engine or the learner model", () => {
    const behavioural = ["src/stores/habit-store.ts", "src/stores/referral-store.ts", "src/services/leaderboard.ts", "src/services/daily.ts", "src/services/ghosts.ts", "src/services/friends.ts", "src/services/clubs.ts", "src/services/achievements.ts"];
    for (const file of behavioural) {
      expect(read(file), file).not.toMatch(/@vmsg\/psychometrics|@\/lib\/learning\/|services\/learner|\.\/learner"/);
    }
  });

  it("the learner model never imports habits, XP, streaks or rankings", () => {
    for (const file of sources("src/lib/learning")) {
      const imports = [...read(file).matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
      for (const spec of imports) expect(spec, file).not.toMatch(/habit-store|referral-store|leaderboard|achievements|ghosts|daily|friends|clubs/);
    }
  });
});
