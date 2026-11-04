import type { SolutionStep } from "@/lib/types/template";

export type ParsedNumberLine = {
  target: number;
  lower: number;
  upper: number;
  result: number;
};

export function parseNumberLine(steps: SolutionStep[]): ParsedNumberLine {
  let lower = 0;
  let upper = 10;
  let result = 0;
  let target = 0;

  for (const step of steps) {
    const lowerMatch = step.operation.match(/lower\s*[=:]\s*([\d.]+)/i);
    const upperMatch = step.operation.match(/upper\s*[=:]\s*([\d.]+)/i);
    const resultMatch = step.operation.match(/result\s*[=:]\s*([\d.]+)/i);
    const targetMatch = step.operation.match(/target\s*[=:]\s*([\d.]+)/i);

    if (lowerMatch) lower = parseFloat(lowerMatch[1]);
    if (upperMatch) upper = parseFloat(upperMatch[1]);
    if (resultMatch) result = parseFloat(resultMatch[1]);
    if (targetMatch) target = parseFloat(targetMatch[1]);
  }

  if (result === 0 && steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    const numMatch = lastStep.operation.match(/([\d.]+)$/);
    if (numMatch) result = parseFloat(numMatch[1]);
  }

  return { target, lower, upper, result };
}
