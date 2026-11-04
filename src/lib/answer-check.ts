export type AnswerCheckMode = "client_extract" | "server_sympy";
export type AnswerCheckOutcome = "correct" | "incorrect" | "deferred" | "unparsable";

export function parseLearnerAnswer(input: string): number | null {
  const text = input.trim().replace(/,/g, "");
  if (!text) return null;

  const mixed = text.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const [, whole, numerator, denominator] = mixed;
    const den = Number(denominator);
    if (!den) return null;
    const magnitude = Math.abs(Number(whole)) + Number(numerator) / den;
    return whole.startsWith("-") ? -magnitude : magnitude;
  }

  const fraction = text.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const den = Number(fraction[2]);
    return den ? Number(fraction[1]) / den : null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function checkPracticeAnswer(
  input: string,
  expected: number | null,
  mode: AnswerCheckMode,
): AnswerCheckOutcome {
  const parsed = parseLearnerAnswer(input);
  if (mode === "server_sympy" || expected === null) return "deferred";
  if (parsed === null) return "unparsable";
  const tolerance = Math.max(1e-9, Math.abs(expected) * 1e-6);
  return Math.abs(parsed - expected) <= tolerance ? "correct" : "incorrect";
}
