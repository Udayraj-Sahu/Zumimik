import type { TechniqueExample } from "@/lib/types/technique";
import type { SolveAlongTemplate, ScaffoldType } from "@/lib/types/template";

function inferScaffold(example: TechniqueExample): ScaffoldType {
  const steps = example.steps ?? [];
  if (steps.length > 0) {
    const eqCount = steps.filter((s) => s.includes("=")).length;
    if (eqCount >= Math.max(1, Math.ceil(steps.length / 2))) {
      return "equation_chain";
    }
  }
  return "textual_scaffold";
}

export function exampleToTemplate(
  example: TechniqueExample,
  techniqueName: string,
  level: number,
  index: number,
): SolveAlongTemplate {
  return {
    id: `${techniqueName}-${level}-${index}`.toLowerCase().replace(/\s+/g, "-"),
    domain: "cat",
    concept: {
      technique_name: techniqueName,
      category: "technique",
    },
    difficulty: level,
    expected_time: 60,
    version: 1,
    generationMethod: "converted",
    visual_scaffold: {
      type: inferScaffold(example),
      config: {},
    },
    examples: [
      {
        problem_statement: example.problem,
        solution: example.steps.map((step, j) => ({
          step_num: j + 1,
          operation: step,
        })),
        answer: example.answer,
      },
    ],
  };
}