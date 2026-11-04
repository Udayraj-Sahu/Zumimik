import type { SolveAlongTemplate } from "@/lib/types/template";

export const SAMPLE_TEMPLATES: SolveAlongTemplate[] = [
  // ── GMAT ────────────────────────────────────────────────
  {
    id: "gmat-ps-speed-1",
    domain: "gmat",
    concept: { technique_name: "Speed & Distance", category: "problem_solving" },
    difficulty: 3,
    expected_time: 90,
    version: 1,
    generationMethod: "template",
    visual_scaffold: { type: "number_line" },
    examples: [
      {
        problem_statement: "A car travels 240 miles at 60 mph. How long does the trip take?",
        solution: [
          { step_num: 1, operation: "Time = Distance ÷ Speed" },
          { step_num: 2, operation: "Time = 240 ÷ 60" },
          { step_num: 3, operation: "Time = 4 hours", result: "4" },
        ],
      },
    ],
    key_reminders: ["Use the formula Distance = Rate × Time", "Check units match"],
    common_mistakes: ["Multiplying instead of dividing", "Forgetting to convert units"],
  },
  {
    id: "gmat-ps-work-1",
    domain: "gmat",
    concept: { technique_name: "Work Rate", category: "problem_solving" },
    difficulty: 4,
    expected_time: 120,
    version: 1,
    generationMethod: "template",
    visual_scaffold: { type: "arrow_matrix" },
    examples: [
      {
        problem_statement: "Alice can paint a room in 6 hours. Bob can paint it in 3 hours. How long together?",
        solution: [
          { step_num: 1, operation: "Alice's rate: 1/6 room per hour" },
          { step_num: 2, operation: "Bob's rate: 1/3 room per hour" },
          { step_num: 3, operation: "Combined rate: 1/6 + 1/3 = 1/2 room per hour" },
          { step_num: 4, operation: "Time = 1 ÷ (1/2) = 2 hours", result: "2" },
        ],
      },
    ],
    key_reminders: ["Combined rate = sum of individual rates", "Time = Work ÷ Rate"],
    common_mistakes: ["Averaging the times instead of summing rates", "Inverting the fraction"],
  },
  {
    id: "gmat-ds-numbers-1",
    domain: "gmat",
    concept: { technique_name: "Number Properties — DS", category: "data_sufficiency" },
    difficulty: 4,
    expected_time: 120,
    version: 1,
    generationMethod: "template",
    visual_scaffold: { type: "grid_construction" },
    examples: [
      {
        problem_statement: "Is x divisible by 6? (1) x is divisible by 2. (2) x is divisible by 3.",
        solution: [
          { step_num: 1, operation: "For divisibility by 6, need both factors 2 and 3" },
          { step_num: 2, operation: "Statement 1: x is divisible by 2 — tells us x has factor 2" },
          { step_num: 3, operation: "Statement 2: x is divisible by 3 — tells us x has factor 3" },
          { step_num: 4, operation: "Both together: x has factors 2 AND 3 → divisible by 6" },
          { step_num: 5, operation: "Answer: Both statements together are sufficient (C)", result: "C" },
        ],
      },
    ],
    key_reminders: ["Divisibility by 6 requires both 2 and 3", "Data Sufficiency: evaluate individually first, then together"],
    common_mistakes: ["Assuming (1) alone is enough", "Forgetting that 6 = 2 × 3"],
  },
  {
    id: "gmat-sc-parallel-1",
    domain: "gmat",
    concept: { technique_name: "Parallel Structure — SC", category: "sentence_correction" },
    difficulty: 3,
    expected_time: 75,
    version: 1,
    generationMethod: "template",
    visual_scaffold: { type: "equation_chain" },
    examples: [
      {
        problem_statement: "The athlete trained rigorously, ate a balanced diet, and ___ plenty of rest.",
        solution: [
          { step_num: 1, operation: "List: trained, ate, ___  — all verbs in past tense" },
          { step_num: 2, operation: "First two are past tense (trained, ate)" },
          { step_num: 3, operation: "Third must also be past tense: 'got'" },
          { step_num: 4, operation: "Correct: 'got plenty of rest'", result: "got" },
        ],
      },
    ],
    key_reminders: ["Items in a list must share the same grammatical form", "Look for 'and', 'or', 'but' as parallelism markers"],
    common_mistakes: ["Switching from past to present tense mid-list", "Using a gerund when the list starts with base verbs"],
  },
];

export function getTemplatesByDomain(domain: string): SolveAlongTemplate[] {
  return SAMPLE_TEMPLATES.filter((t) => t.domain === domain);
}

export function getTemplatesByCategory(
  category: string,
  domain?: string,
): SolveAlongTemplate[] {
  return SAMPLE_TEMPLATES.filter(
    (t) => t.concept.category === category && (!domain || t.domain === domain),
  );
}

export function getTemplateById(id: string): SolveAlongTemplate | undefined {
  return SAMPLE_TEMPLATES.find((t) => t.id === id);
}

export function getCategoriesForDomain(domain: string): string[] {
  const cats = new Set<string>();
  for (const t of SAMPLE_TEMPLATES) {
    if (t.domain === domain) cats.add(t.concept.category);
  }
  return Array.from(cats);
}

const FALLBACK_SCAFFOLD_TYPES: Array<SolveAlongTemplate["visual_scaffold"]["type"]> = [
  "arrow_matrix",
  "number_line",
  "grid_construction",
  "equation_chain",
  "place_value_chart",
  "shape_canvas",
  "venn_diagram",
];

const FALLBACK_REMINDERS: Record<string, string[]> = {
  gmat: [
    "Read the question carefully before solving",
    "Eliminate wrong answers first",
    "Manage time — don't spend too long on one question",
    "Look for clue words in the stem",
  ],
  general: [
    "Understand the concept before memorizing steps",
    "Check your work with a different method",
    "Focus on accuracy first, then speed",
    "Review mistakes to identify weak areas",
  ],
};

const FALLBACK_MISTAKES: string[] = [
  "Rushing through the problem without reading carefully",
  "Misapplying the formula or technique",
  "Arithmetic errors in intermediate steps",
  "Forgetting to double-check the final answer",
];

const DOMAIN_LABEL_MAP: Record<string, string> = {
  gmat: "GMAT",
  cat: "CAT",
  gre: "GRE",
  banking: "Banking",
};

let _fallbackCounter = 0;

export function generateFallbackTemplates(
  domain: string,
  category: string,
  count = 3,
): SolveAlongTemplate[] {
  const domainLabel = DOMAIN_LABEL_MAP[domain] || domain;
  const catLabel = category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const namePatterns = [
    `Core ${domainLabel} — ${catLabel}`,
    `Advanced ${domainLabel} — ${catLabel}`,
    `Rapid ${domainLabel} — ${catLabel}`,
  ];
  const reminders =
    FALLBACK_REMINDERS[domain as keyof typeof FALLBACK_REMINDERS] ??
    FALLBACK_REMINDERS.general;

  return Array.from({ length: count }, (_, i) => {
    const idx = _fallbackCounter++;
    const scaffoldType =
      FALLBACK_SCAFFOLD_TYPES[
        (i + _fallbackCounter) % FALLBACK_SCAFFOLD_TYPES.length
      ];

    return {
      id: `fallback__${domain}__${category}__${idx}`,
      domain,
      concept: {
        technique_name: namePatterns[i % namePatterns.length],
        category,
      },
      difficulty: (i % 3) + 2, // 2, 3, 4
      expected_time: 30 + i * 15, // 30, 45, 60
      version: 1,
      generationMethod: "llm",
      visual_scaffold: { type: scaffoldType },
      examples: [
        {
          problem_statement: `Sample problem for ${domainLabel} — ${catLabel} (Example ${i + 1})`,
          solution: [
            { step_num: 1, operation: "Identify the given values and the target value" },
            { step_num: 2, operation: "Select the appropriate formula or technique" },
            { step_num: 3, operation: "Apply the method step by step" },
            { step_num: 4, operation: "Verify the result for consistency" },
          ],
        },
      ],
      key_reminders: reminders.slice(0, 2),
      common_mistakes: FALLBACK_MISTAKES.slice(0, 2),
    };
  });
}
