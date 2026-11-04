import type { AdaptiveDomainState, SessionOutcome } from "@/lib/types/adaptive";
import { applyOutcome, initialDomainState } from "@/lib/adaptive/engine";

export type AdaptiveTopicSeed = {
  id: string;
  name: string;
  color: string;
  value: number;
};

export const ADAPTIVE_TOPICS_BY_DOMAIN: Record<string, AdaptiveTopicSeed[]> = {
  gmat: [
    { id: "ps", name: "Problem Solving", color: "#22c55e", value: 20 },
    { id: "ds", name: "Data Sufficiency", color: "#06b6d4", value: 16 },
    { id: "sc", name: "Sentence Correction", color: "#a78bfa", value: 18 },
    { id: "cr", name: "Critical Reasoning", color: "#f59e0b", value: 14 },
    { id: "rc", name: "Reading Comp.", color: "#10b981", value: 16 },
  ],
  cat: [
    { id: "qa", name: "Quantitative Apt.", color: "#22c55e", value: 18 },
    { id: "lrdi", name: "LR & DI", color: "#06b6d4", value: 16 },
    { id: "va", name: "Verbal Ability", color: "#a78bfa", value: 16 },
  ],
  gre: [
    { id: "qc", name: "Quant Comparison", color: "#22c55e", value: 18 },
    { id: "ps", name: "Problem Solving", color: "#06b6d4", value: 16 },
    { id: "tc", name: "Text Completion", color: "#a78bfa", value: 16 },
    { id: "se", name: "Sentence Equivalence", color: "#f59e0b", value: 14 },
    { id: "rc", name: "Reading Comp.", color: "#10b981", value: 16 },
  ],
  banking: [
    { id: "numerical", name: "Numerical Ability", color: "#22c55e", value: 16 },
    { id: "reasoning", name: "Reasoning", color: "#06b6d4", value: 16 },
    { id: "english", name: "English", color: "#a78bfa", value: 16 },
    { id: "ga", name: "General Awareness", color: "#f59e0b", value: 12 },
    { id: "computer", name: "Computer Knowledge", color: "#10b981", value: 12 },
  ],
  "vedic-math": [
    { id: "addition", name: "Vedic Addition", color: "#22c55e", value: 22 },
    { id: "subtraction", name: "Vedic Subtraction", color: "#06b6d4", value: 20 },
    { id: "multiplication", name: "Vedic Multiplication", color: "#a78bfa", value: 18 },
    { id: "squares", name: "Squares & Bases", color: "#f59e0b", value: 18 },
  ],
};

const states: Record<string, AdaptiveDomainState> = {};

export function ensureAdaptiveState(domain: string): AdaptiveDomainState {
  const existing = states[domain];
  if (existing) return existing;
  const fresh = initialDomainState(domain);
  states[domain] = fresh;
  return fresh;
}

export function recordMockAdaptiveSession(outcome: SessionOutcome): AdaptiveDomainState {
  const current = ensureAdaptiveState(outcome.domain);
  const next = applyOutcome(current, outcome);
  states[outcome.domain] = next;
  return next;
}
