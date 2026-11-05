import { describe, expect, it } from "vitest";
import { createSinking, freshState, processAttempt, type TechniqueState } from "@vmsg/psychometrics";
import { recommendNext, STATE_LABEL, stateOf } from "./mastery-view";
import { hydrateLearner } from "./learner-state";

const NOW = Date.UTC(2026, 10, 6, 12);
const DAY = 86_400_000;
function practised(skill: string, results: boolean[], lastAt = NOW - DAY): TechniqueState {
  let s = freshState(skill);
  results.forEach((c, i) => { s = processAttempt(s, { correct: c, timeSpentSeconds: 4, targetTimeSeconds: 10, problemId: `${skill}${i}`, at: lastAt - (results.length - i) * 1000 }); });
  return s;
}
const catalog = [
  { skill: "Basics", parents: [] as string[], servable: 5 },
  { skill: "Fractions", parents: ["Basics"], servable: 5 },
  { skill: "Decimals", parents: ["Fractions"], servable: 5 },
];

describe("mastery labels", () => {
  it("are the three the learner sees, taken from the engine state, and absent without history", () => {
    expect(STATE_LABEL).toEqual({ fractured: "Fractured", fragile: "Fragile", fluid: "Fluid" });
    const fluid = practised("Basics", Array(30).fill(true));
    const failing = practised("Fractions", [false, false, false, false]);
    expect(stateOf({ Basics: fluid, Fractions: failing }, "Basics")).toBe("fluid");
    expect(stateOf({ Basics: fluid, Fractions: failing }, "Fractions")).toBe("fractured");
    expect(stateOf({ Basics: fluid }, "Decimals")).toBeUndefined();
    expect(stateOf(null, "Basics")).toBeUndefined();
  });

  it("a fluid technique idle past the cliff reads as fragile (decay is part of the label)", () => {
    const old = practised("Basics", Array(30).fill(true), NOW - 12 * DAY);
    expect(old.state).toBe("fluid"); // as stored
    const hydrated = hydrateLearner({ technique_states: JSON.parse(JSON.stringify({ Basics: old })), as_of: NOW - 12 * DAY }, NOW);
    expect(stateOf(hydrated, "Basics")).toBe("fragile"); // as the learner sees it today
  });
});

describe("what to practise next", () => {
  it("a brand-new learner starts at the root: prerequisites keep the rest locked", () => {
    expect(recommendNext({}, catalog, {}, NOW)).toEqual({ skill: "Basics", kind: "new" });
  });

  it("once the prerequisite is mastered the next technique opens", () => {
    const states = { Basics: practised("Basics", Array(30).fill(true)) };
    expect(recommendNext(states, catalog, {}, NOW)).toEqual({ skill: "Fractions", kind: "new" });
  });

  it("a technique that was started and not settled is continued before anything new", () => {
    const states = { Basics: practised("Basics", Array(30).fill(true)), Fractions: practised("Fractions", [false, false, true, false]) };
    expect(recommendNext(states, catalog, {}, NOW)).toEqual({ skill: "Fractions", kind: "continue" });
  });

  it("the review queue comes first", () => {
    const states = { Basics: practised("Basics", Array(30).fill(true)), Fractions: practised("Fractions", [false, false, true, false]) };
    const out = recommendNext(states, catalog, { Fractions: createSinking("Fractions", "session_wrong") }, NOW);
    expect(out).toEqual({ skill: "Fractions", kind: "review" });
  });

  it("a technique with nothing servable is never recommended, and a fully mastered catalog recommends nothing", () => {
    expect(recommendNext({}, [{ skill: "Basics", parents: [], servable: 0 }], {}, NOW)).toBeNull();
    const all = { Basics: practised("Basics", Array(30).fill(true)), Fractions: practised("Fractions", Array(30).fill(true)), Decimals: practised("Decimals", Array(30).fill(true)) };
    expect(recommendNext(all, catalog, {}, NOW)).toBeNull();
  });
});

describe("the ordered list of next steps", () => {
  it("lists review, then techniques in progress, then new ones, each technique once, and the first is the single next step", async () => {
    const { recommendSteps } = await import("./mastery-view");
    const states = {
      Basics: practised("Basics", Array(30).fill(true)),
      Fractions: practised("Fractions", [false, false, true, false]),
    };
    const open = [...catalog, { skill: "Geometry", parents: [] as string[], servable: 5 }]; // a second root technique with no prerequisite
    const steps = recommendSteps(states, open, { Fractions: createSinking("Fractions", "session_wrong") }, NOW);
    expect(steps.map((s) => s.kind)).toEqual(["review", "new"]);
    expect(steps[0].skill).toBe("Fractions");
    expect(new Set(steps.map((s) => s.skill)).size).toBe(steps.length);
    expect(recommendNext(states, open, { Fractions: createSinking("Fractions", "session_wrong") }, NOW)).toEqual(steps[0]);
    expect(steps[1].skill).toBe("Geometry"); // Decimals stays locked until Fractions is mastered
    expect(recommendSteps({}, catalog, {}, NOW, undefined, 3).map((s) => s.skill)).toEqual(["Basics"]); // the rest is locked behind the prerequisite
  });
});
