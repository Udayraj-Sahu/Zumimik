import { Minus, Calculator, BrainCircuit, BookOpen, ListChecks, BarChart3, Sigma, FileText, Globe, Monitor } from "lucide-react";
import type { SprintTopic, SprintConfig } from "@/lib/types/sprint";

const SPRINT_TOPICS_BY_DOMAIN: Record<string, SprintTopic[]> = {
  gmat: [
    { id: "ps", label: "Problem Solving", icon: Calculator, color: "text-chart-3" },
    { id: "ds", label: "Data Sufficiency", icon: ListChecks, color: "text-chart-4" },
    { id: "sc", label: "Sentence Correction", icon: BookOpen, color: "text-primary" },
    { id: "cr", label: "Critical Reasoning", icon: BrainCircuit, color: "text-chart-2" },
    { id: "rc", label: "Reading Comp.", icon: BookOpen, color: "text-chart-3" },
  ],
  cat: [
    { id: "qa", label: "Quantitative Apt.", icon: Calculator, color: "text-chart-3" },
    { id: "lrdi", label: "LR & DI", icon: BarChart3, color: "text-chart-4" },
    { id: "va", label: "Verbal Ability", icon: BookOpen, color: "text-primary" },
  ],
  gre: [
    { id: "qc", label: "Quant Comparison", icon: Minus, color: "text-chart-3" },
    { id: "ps", label: "Problem Solving", icon: Calculator, color: "text-chart-4" },
    { id: "tc", label: "Text Completion", icon: FileText, color: "text-primary" },
    { id: "se", label: "Sentence Equivalence", icon: Sigma, color: "text-chart-2" },
    { id: "rc", label: "Reading Comp.", icon: BookOpen, color: "text-chart-3" },
  ],
  banking: [
    { id: "numerical", label: "Numerical Ability", icon: Calculator, color: "text-chart-3" },
    { id: "reasoning", label: "Reasoning", icon: BrainCircuit, color: "text-chart-4" },
    { id: "english", label: "English", icon: BookOpen, color: "text-primary" },
    { id: "ga", label: "General Awareness", icon: Globe, color: "text-chart-2" },
    { id: "computer", label: "Computer Knowledge", icon: Monitor, color: "text-chart-3" },
  ],
  "vedic-math": [
    { id: "addition", label: "Vedic Addition", icon: Calculator, color: "text-chart-3" },
    { id: "subtraction", label: "Vedic Subtraction", icon: Minus, color: "text-chart-4" },
    { id: "multiplication", label: "Vedic Multiplication", icon: Sigma, color: "text-primary" },
    { id: "squares", label: "Squares & Bases", icon: ListChecks, color: "text-chart-2" },
  ],
};

export const SPRINT_CONFIG: SprintConfig = {
  lengths: [5, 10, 15],
  difficulties: ["Adaptive", "Beginner", "Advanced"],
};

export function getTopicsByDomain(domain: string): SprintTopic[] {
  return SPRINT_TOPICS_BY_DOMAIN[domain] ?? SPRINT_TOPICS_BY_DOMAIN["cat"] ?? [];
}

export const SPRINT_TOPICS = getTopicsByDomain("cat");
