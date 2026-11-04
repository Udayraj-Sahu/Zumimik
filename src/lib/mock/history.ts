import type { HistoryEntry } from "@/lib/types/history";

function entry(
  id: string, topic: string, label: string, difficulty: string,
  score: number, total: number, xp: number, time: number, daysAgo: number,
): HistoryEntry {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id, topic, topicLabel: label, difficulty,
    score, total, accuracy: Math.round((score / total) * 100),
    xpEarned: xp, totalTimeSpent: time,
    completedAt: d.toISOString(),
  };
}

export const HISTORY_ENTRIES: HistoryEntry[] = [
  entry("h1", "ps", "Problem Solving", "Intermediate", 14, 15, 190, 142, 0),
  entry("h2", "qa", "Quantitative Apt.", "Advanced", 10, 15, 150, 98, 1),
  entry("h3", "sc", "Sentence Correction", "Beginner", 20, 20, 250, 186, 1),
  entry("h4", "lrdi", "LR & DI", "Advanced", 15, 15, 300, 72, 2),
  entry("h5", "ds", "Data Sufficiency", "Intermediate", 10, 12, 150, 110, 2),
  entry("h6", "va", "Verbal Ability", "Beginner", 15, 15, 250, 134, 3),
  entry("h7", "rc", "Reading Comp.", "Advanced", 11, 15, 160, 156, 3),
  entry("h8", "ps", "Problem Solving", "Intermediate", 18, 20, 230, 165, 4),
  entry("h9", "qa", "Quantitative Apt.", "Beginner", 15, 15, 250, 120, 5),
  entry("h10", "cr", "Critical Reasoning", "Intermediate", 12, 15, 170, 95, 5),
  entry("h11", "ds", "Data Sufficiency", "Advanced", 8, 12, 130, 108, 6),
  entry("h12", "va", "Verbal Ability", "Intermediate", 13, 15, 180, 142, 7),
  entry("h13", "lrdi", "LR & DI", "Beginner", 20, 20, 300, 158, 8),
  entry("h14", "ps", "Problem Solving", "Advanced", 16, 20, 210, 140, 10),
  entry("h15", "sc", "Sentence Correction", "Beginner", 15, 15, 250, 80, 12),
  entry("h16", "rc", "Reading Comp.", "Intermediate", 12, 15, 170, 130, 14),
  entry("h17", "qa", "Quantitative Apt.", "Beginner", 12, 12, 220, 100, 16),
  entry("h18", "va", "Verbal Ability", "Advanced", 11, 15, 160, 138, 20),
  entry("h19", "lrdi", "LR & DI", "Intermediate", 13, 15, 180, 148, 25),
  entry("h20", "ds", "Data Sufficiency", "Beginner", 20, 20, 250, 175, 30),
];

const TOPICS_FILTER_BY_DOMAIN: Record<string, { id: string; label: string }[]> = {
  gmat: [
    { id: "all", label: "All Topics" },
    { id: "ps", label: "Problem Solving" },
    { id: "ds", label: "Data Sufficiency" },
    { id: "sc", label: "Sentence Correction" },
    { id: "cr", label: "Critical Reasoning" },
    { id: "rc", label: "Reading Comp." },
  ],
  cat: [
    { id: "all", label: "All Topics" },
    { id: "qa", label: "Quantitative Apt." },
    { id: "lrdi", label: "LR & DI" },
    { id: "va", label: "Verbal Ability" },
  ],
  gre: [
    { id: "all", label: "All Topics" },
    { id: "qc", label: "Quant Comparison" },
    { id: "ps", label: "Problem Solving" },
    { id: "tc", label: "Text Completion" },
    { id: "se", label: "Sentence Equivalence" },
    { id: "rc", label: "Reading Comp." },
  ],
  banking: [
    { id: "all", label: "All Topics" },
    { id: "numerical", label: "Numerical Ability" },
    { id: "reasoning", label: "Reasoning" },
    { id: "english", label: "English" },
    { id: "ga", label: "General Awareness" },
    { id: "computer", label: "Computer" },
  ],
};

export const DIFFICULTY_FILTER = [
  { id: "all", label: "All" },
  { id: "Beginner", label: "Beginner" },
  { id: "Intermediate", label: "Intermediate" },
  { id: "Advanced", label: "Advanced" },
];

export function getTopicFilters(domain: string) {
  return TOPICS_FILTER_BY_DOMAIN[domain] ?? TOPICS_FILTER_BY_DOMAIN["cat"] ?? [];
}

export const TOPICS_FILTER = getTopicFilters("cat");
