import type { SolutionStep } from "@/lib/types/template";

export type ParsedSquare = {
  number: number;
  base: number;
  deficiency: number;
};

export function parseSquareProblem(
  problem: string,
  steps: SolutionStep[],
): ParsedSquare {
  const cleaned = problem.replace(/,/g, "").trim();
  const sqMatch = cleaned.match(/(?:square\s*(?:of)?|(\d+)\s*²)\s*(\d+)/i);
  const num = sqMatch ? parseInt(sqMatch[2] || sqMatch[1], 10) : 0;

  if (steps.length > 0) {
    const baseMatch = steps[0]?.operation.match(/[Bb]ase\s*[=:]\s*(\d+)/);
    if (baseMatch) {
      const base = parseInt(baseMatch[1], 10);
      return { number: num, base, deficiency: num - base };
    }
  }

  let base = 10;
  while (base * 10 <= num) base *= 10;
  return { number: num, base, deficiency: num - base };
}
