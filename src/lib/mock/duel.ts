import type { DuelTopic, DuelOpponent, DuelResult } from "@/lib/types/duel";

const DUEL_TOPICS_BY_DOMAIN: Record<string, DuelTopic[]> = {
  gmat: [
    { id: "ps", label: "Problem Solving" },
    { id: "ds", label: "Data Sufficiency" },
    { id: "sc", label: "Sentence Correction" },
    { id: "cr", label: "Critical Reasoning" },
    { id: "rc", label: "Reading Comp." },
  ],
  cat: [
    { id: "qa", label: "Quantitative Apt." },
    { id: "lrdi", label: "LR & DI" },
    { id: "va", label: "Verbal Ability" },
  ],
  gre: [
    { id: "qc", label: "Quant Comparison" },
    { id: "ps", label: "Problem Solving" },
    { id: "tc", label: "Text Completion" },
    { id: "se", label: "Sentence Equivalence" },
  ],
  banking: [
    { id: "numerical", label: "Numerical Ability" },
    { id: "reasoning", label: "Reasoning" },
    { id: "english", label: "English" },
    { id: "ga", label: "General Awareness" },
  ],
};

export const DUEL_OPPONENTS: DuelOpponent[] = [
  { name: "Priya S.", initials: "PS", level: "Gold" },
  { name: "Arjun M.", initials: "AM", level: "Silver" },
  { name: "Rohan K.", initials: "RK", level: "Gold" },
  { name: "Neha V.", initials: "NV", level: "Bronze" },
  { name: "Vikram P.", initials: "VP", level: "Silver" },
];

export function getDuelTopics(domain: string): DuelTopic[] {
  return DUEL_TOPICS_BY_DOMAIN[domain] ?? DUEL_TOPICS_BY_DOMAIN["cat"] ?? [];
}

export function generateDuelResult(yourCorrect: number, total: number): DuelResult {
  const opponentCorrect = Math.max(0, Math.min(total, yourCorrect + Math.floor(Math.random() * 5) - 2));
  return {
    yourScore: yourCorrect,
    opponentScore: opponentCorrect,
    yourAccuracy: Math.round((yourCorrect / total) * 100),
    opponentAccuracy: Math.round((opponentCorrect / total) * 100),
    yourTime: Math.round(30 + Math.random() * 60),
    opponentTime: Math.round(20 + Math.random() * 70),
    won: yourCorrect > opponentCorrect,
    xpEarned: yourCorrect * 15 + (yourCorrect > opponentCorrect ? 100 : 25),
  };
}
