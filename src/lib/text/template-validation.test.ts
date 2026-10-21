import { describe, expect, it } from "vitest";
import {
  SolveAlongTemplateSchema,
  TemplateExampleSchema,
  TemplateSessionSchema,
  StepProgressSchema,
} from "@/lib/types/template";
import { computeStats, computeRecent, computeStreak, computeTopicMastery } from "@/lib/text";

const validSolutionStep = () => ({
  step_num: 1,
  operation: "add",
  result: "5",
});

const validExample = () => ({
  problem_statement: "Sum 2 and 3.",
  solution: [validSolutionStep()],
  answer: "5",
});

const validTemplate = () => ({
  id: "t-001",
  domain: "gmat",
  concept: { technique_name: "Number line", category: "Number Properties" },
  difficulty: 3,
  expected_time: 90,
  visual_scaffold: { type: "timeline" },
  examples: [validExample()],
});

const validStepProgress = () => ({
  visibleSteps: 0,
  completed: false,
  correct: null,
  timeSpent: 0,
});

describe("text & input edge cases (zod schemas in src/lib/types/template.ts)", () => {
  it("1. very long text (50k chars) passes - no max-length cap is enforced", () => {
    const long = "a".repeat(50_000);
    const r = SolveAlongTemplateSchema.safeParse({
      ...validTemplate(),
      concept: { ...validTemplate().concept, technique_name: long },
      examples: [{ ...validExample(), problem_statement: long }],
    });
    expect(r.success).toBe(true);
  });

  it("2. short text / one word passes the min(1) boundary", () => {
    for (const short of ["a", "\u092F", "\uD83D\uDE80", "x"]) {
      const r = SolveAlongTemplateSchema.safeParse({
        ...validTemplate(),
        concept: { ...validTemplate().concept, technique_name: short },
      });
      expect(r.success).toBe(true);
    }
  });

  it("3. empty required strings are rejected (min 1)", () => {
    const empties: Array<(t: ReturnType<typeof validTemplate>) => object> = [
      (t) => ({ ...t, id: "" }),
      (t) => ({ ...t, concept: { ...t.concept, technique_name: "" } }),
      (t) => ({ ...t, concept: { ...t.concept, category: "" } }),
      (t) => ({ ...t, visual_scaffold: { type: "" } }),
    ];
    for (const mutate of empties) {
      expect(SolveAlongTemplateSchema.safeParse(mutate(validTemplate())).success).toBe(false);
    }
    expect(
      TemplateExampleSchema.safeParse({
        ...validExample(),
        problem_statement: "",
      }).success,
    ).toBe(false);
    expect(
      TemplateExampleSchema.safeParse({
        ...validExample(),
        solution: [{ ...validSolutionStep(), operation: "" }],
      }).success,
    ).toBe(false);
  });

  it("4. whitespace-only strings pass min(1) - no trim is applied (documented tolerance)", () => {
    expect(
      SolveAlongTemplateSchema.safeParse({
        ...validTemplate(),
        concept: { ...validTemplate().concept, technique_name: "   " },
      }).success,
    ).toBe(true);
  });

  it("5. unicode text (Latin + diacritics + CJK) passes", () => {
    const r = SolveAlongTemplateSchema.safeParse({
      ...validTemplate(),
      concept: {
        ...validTemplate().concept,
        technique_name: "Ex\u00E1menes s\u00E8v\u00E8res \u2014 \u6570\u5B66",
        category: "\u03B3\u03C1\u03B1\u03BC\u03BC\u03AE \u03B1\u03C1\u03B9\u03B8\u03BC\u03CE\u03BD",
      },
    });
    expect(r.success).toBe(true);
  });

  it("6. emoji and regional/Hindi content passes validation", () => {
    const r = SolveAlongTemplateSchema.safeParse({
      ...validTemplate(),
      examples: [
        {
          ...validExample(),
          problem_statement: "\u0928\u092E\u0938\u094D\u0924\u0947 \u0926\u0941\u0928\u093F\u092F\u093E \uD83D\uDE80\uD83D\uDD25",
        },
      ],
      key_reminders: [
        "\u0939\u093F\u0928\u094D\u0926\u0940 \u092E\u0947\u0902 \u0917\u0923\u093F\u0924",
        "\u09A4\u09C7\u09B2\u09C1\u0997 \u0997\u09A3\u09BF\u09A4",
        "\u091F",
      ],
    });
    expect(r.success).toBe(true);
  });

  it("7. numbers enforce int/range bounds (difficulty 1-5, positive step_num/expected_time)", () => {
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), difficulty: 1 }).success).toBe(true);
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), difficulty: 5 }).success).toBe(true);
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), difficulty: 6 }).success).toBe(false);
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), difficulty: 0 }).success).toBe(false);
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), difficulty: 2.5 }).success).toBe(false);
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), expected_time: 0 }).success).toBe(false);
    expect(
      TemplateExampleSchema.safeParse({
        ...validExample(),
        solution: [{ ...validSolutionStep(), step_num: 0 }],
      }).success,
    ).toBe(false);
  });

  it("8. dates and currency strings are accepted verbatim (string fields)", () => {
    const r = SolveAlongTemplateSchema.safeParse({
      ...validTemplate(),
      sourceDocumentId: "doc-2026/09/28",
      examples: [
        {
          ...validExample(),
          problem_statement: "Mock exam scheduled 2026-09-28 at 14:30 IST for \u20B91,250.50.",
          answer: "\u20B91,250.50",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("9. version defaults to 1 when omitted; non-positive versions rejected", () => {
    const parsed = SolveAlongTemplateSchema.safeParse(validTemplate());
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.version).toBe(1);
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), version: 0 }).success).toBe(false);
  });

  it("10. visual-scaffold config accepts arbitrary JSON (empty or nested)", () => {
    expect(
      SolveAlongTemplateSchema.safeParse({
        ...validTemplate(),
        visual_scaffold: { type: "matrix", config: {} },
      }).success,
    ).toBe(true);
    expect(
      SolveAlongTemplateSchema.safeParse({
        ...validTemplate(),
        visual_scaffold: { type: "matrix", config: { show: false, steps: [1, 2, 3], meta: { x: "y" } } },
      }).success,
    ).toBe(true);
  });

  it("11. optional string arrays accept empty arrays / blank entries / absence", () => {
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), key_reminders: [] }).success).toBe(true);
    expect(
      SolveAlongTemplateSchema.safeParse({
        ...validTemplate(),
        common_mistakes: [""],
        key_reminders: ["x"],
      }).success,
    ).toBe(true);
  });

  it("12. arrays with min(1) reject empty inputs", () => {
    expect(SolveAlongTemplateSchema.safeParse({ ...validTemplate(), examples: [] }).success).toBe(false);
    expect(
      TemplateExampleSchema.safeParse({ ...validExample(), solution: [] }).success,
    ).toBe(false);
  });

  it("13. session with zero templates is accepted (no min on templates[]) - tolerated empty state", () => {
    const session = {
      id: "s-1",
      templates: [],
      currentIndex: 0,
      stepProgress: {},
      mode: "quick",
    };
    expect(TemplateSessionSchema.safeParse(session).success).toBe(true);
  });

  it("14. session enforces the mode enum and non-negative index; arbitrary stepProgress keys pass", () => {
    expect(
      TemplateSessionSchema.safeParse({
        id: "s-1",
        templates: [validTemplate()],
        currentIndex: 0,
        stepProgress: { "step-7": validStepProgress() },
        mode: "guided",
      }).success,
    ).toBe(true);
    expect(
      TemplateSessionSchema.safeParse({ ...validTemplate(), mode: "bogus" }).success,
    ).toBe(false);
    expect(
      TemplateSessionSchema.safeParse({
        id: "s-1",
        templates: [validTemplate()],
        currentIndex: -1,
        stepProgress: {},
        mode: "quick",
      }).success,
    ).toBe(false);
  });

  it("15. generationMethod enum rejects unknown values; step-progress bounds enforced", () => {
    expect(
      SolveAlongTemplateSchema.safeParse({ ...validTemplate(), generationMethod: "llm" }).success,
    ).toBe(true);
    expect(
      SolveAlongTemplateSchema.safeParse({ ...validTemplate(), generationMethod: "bogus" }).success,
    ).toBe(false);
    expect(StepProgressSchema.safeParse({ visibleSteps: 0, completed: false, correct: null, timeSpent: 0 }).success).toBe(true);
    expect(StepProgressSchema.safeParse({ visibleSteps: -1, completed: false, correct: false, timeSpent: 0 }).success).toBe(false);
  });
});

describe("empty state - data layer returns safe zeros/empty for a brand-new user", () => {
  it("16. no records: dashboard stats are zeros", () => {
    expect(computeStats([])).toEqual({ accuracy: 0, questions: 0, percentile: 0, speed: 0 });
  });

  it("17. no records: topic mastery, recent activity, streak are empty/zero", () => {
    expect(computeTopicMastery([])).toEqual([]);
    expect(computeRecent([])).toEqual([]);
    expect(computeStreak([])).toEqual({
      current: 0,
      xp: 0,
      days: [false, false, false, false, false, false, false],
      labels: ["M", "T", "W", "T", "F", "S", "S"],
    });
  });
});