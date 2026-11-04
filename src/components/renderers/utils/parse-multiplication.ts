import type { SolutionStep } from "@/lib/types/template";

export type ParsedMultiplication = {
  top: number[];
  bottom: number[];
  topNum: number;
  bottomNum: number;
};

export type Product = {
  step: number;
  value: number;
};

export function parseMultiplication(problem: string): ParsedMultiplication {
  const cleaned = problem.replace(/,/g, "").trim();
  const match = cleaned.match(/(\d+)\s*[×x*by]\s*(\d+)/i);
  if (!match) return { top: [], bottom: [], topNum: 0, bottomNum: 0 };
  const topNum = parseInt(match[1], 10);
  const bottomNum = parseInt(match[2], 10);
  return {
    top: String(topNum).split("").map(Number),
    bottom: String(bottomNum).split("").map(Number),
    topNum,
    bottomNum,
  };
}

export function extractProducts(steps: SolutionStep[]): Product[] {
  const products: Product[] = [];
  for (const step of steps) {
    const match = step.operation.match(/=\s*(\d+)/);
    if (match) {
      products.push({ step: step.step_num, value: parseInt(match[1], 10) });
    }
  }
  return products;
}
