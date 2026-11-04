import type { SolutionStep } from "@/lib/types/template";

export type ParsedDivision = {
  dividend: number[];
  divisor: number;
};

export type Quotient = {
  digit: number;
  remainder: number;
};

export function parseDivision(problem: string): ParsedDivision {
  const cleaned = problem.replace(/,/g, "").trim();
  const match = cleaned.match(new RegExp("(?:divide\\s+)?(\\d+)\\s*(?:÷|\/|by|÷|divided\\s+by)\\s*(\\d+)", "i"));
  if (match) {
    return {
      dividend: String(parseInt(match[1], 10)).split("").map(Number),
      divisor: parseInt(match[2], 10),
    };
  }
  const altMatch = cleaned.match(/(\d+)\s*[÷/]\s*(\d+)/);
  if (altMatch) {
    return {
      dividend: String(parseInt(altMatch[1], 10)).split("").map(Number),
      divisor: parseInt(altMatch[2], 10),
    };
  }
  return { dividend: [], divisor: 0 };
}

export function extractQuotients(steps: SolutionStep[]): Quotient[] {
  const quotients: Quotient[] = [];
  for (const step of steps) {
    const digitMatch = step.operation.match(/goes\s*(\d+)/i);
    const remainderMatch = step.operation.match(/remainder\s*(\d+)/i);
    if (digitMatch) {
      quotients.push({
        digit: parseInt(digitMatch[1], 10),
        remainder: remainderMatch ? parseInt(remainderMatch[1], 10) : 0,
      });
    }
  }
  return quotients;
}
