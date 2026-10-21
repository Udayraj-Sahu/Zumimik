import type { MockPaper } from "@/lib/types/mock-exam";
import { CYAN, EMERALD, LIME, VIOLET_PURPLE, YELLOW } from "@/lib/theme";

function buildPaper(
  base: Omit<MockPaper, "totalQuestions" | "durationMinutes">,
): MockPaper {
  return {
    ...base,
    totalQuestions: base.sections.reduce((sum, s) => sum + s.questions, 0),
    durationMinutes: base.sections.reduce((sum, s) => sum + s.minutes, 0),
  };
}

const CAT_PAPERS: MockPaper[] = [
  buildPaper({
    id: "cat-2025-slot1",
    domain: "cat",
    title: "CAT 2025 Slot 1 Question Paper",
    shortLabel: "2025 · Slot 1",
    description: "Full-length CAT mock with VARC, DILR and QA sections.",
    sections: [
      { id: "varc", label: "VARC", topic: "va", questions: 24, minutes: 40 },
      { id: "dilr", label: "DILR", topic: "lrdi", questions: 20, minutes: 40 },
      { id: "qa", label: "QA", topic: "qa", questions: 22, minutes: 40 },
    ],
    difficulty: "Moderate",
    accent: VIOLET_PURPLE,
  }),
  buildPaper({
    id: "cat-2024-slot2",
    domain: "cat",
    title: "CAT 2024 Slot 2 Question Paper",
    shortLabel: "2024 · Slot 2",
    description: "Past paper with a balanced split across all three sections.",
    sections: [
      { id: "varc", label: "VARC", topic: "va", questions: 24, minutes: 40 },
      { id: "dilr", label: "DILR", topic: "lrdi", questions: 20, minutes: 40 },
      { id: "qa", label: "QA", topic: "qa", questions: 22, minutes: 40 },
    ],
    difficulty: "Moderate",
    accent: EMERALD,
  }),
  buildPaper({
    id: "cat-section-quant",
    domain: "cat",
    title: "CAT Quant Sectional",
    shortLabel: "Sectional · QA",
    description: "A timed Quant-only drill to sharpen your QA speed.",
    sections: [{ id: "qa", label: "QA", topic: "qa", questions: 20, minutes: 30 }],
    difficulty: "Advanced",
    accent: YELLOW,
  }),
];

const GMAT_PAPERS: MockPaper[] = [
  buildPaper({
    id: "gmat-2025-official",
    domain: "gmat",
    title: "GMAT Focus Official Mock",
    shortLabel: "Official Mock",
    description: "Full-length GMAT Focus with Quant, Verbal and Data Insights.",
    sections: [
      { id: "quant", label: "Quant", topic: "ps", questions: 21, minutes: 45 },
      { id: "verbal", label: "Verbal", topic: "cr", questions: 23, minutes: 45 },
      { id: "di", label: "Data Insights", topic: "ds", questions: 20, minutes: 45 },
    ],
    difficulty: "Moderate",
    accent: EMERALD,
  }),
  buildPaper({
    id: "gmat-quant-drill",
    domain: "gmat",
    title: "GMAT Quant Speed Drill",
    shortLabel: "Drill · Quant",
    description: "Problem solving + data sufficiency in one timed set.",
    sections: [
      { id: "ps", label: "Problem Solving", topic: "ps", questions: 15, minutes: 25 },
      { id: "ds", label: "Data Sufficiency", topic: "ds", questions: 10, minutes: 20 },
    ],
    difficulty: "Advanced",
    accent: YELLOW,
  }),
];

const GRE_PAPERS: MockPaper[] = [
  buildPaper({
    id: "gre-2025-practice",
    domain: "gre",
    title: "GRE PowerPrep Practice Test",
    shortLabel: "PowerPrep",
    description: "Full-length GRE with Quantitative and Verbal Reasoning.",
    sections: [
      { id: "q1", label: "Quant 1", topic: "ps", questions: 20, minutes: 35 },
      { id: "v1", label: "Verbal 1", topic: "rc", questions: 20, minutes: 30 },
      { id: "q2", label: "Quant 2", topic: "qc", questions: 20, minutes: 35 },
      { id: "v2", label: "Verbal 2", topic: "tc", questions: 20, minutes: 30 },
    ],
    difficulty: "Moderate",
    accent: VIOLET_PURPLE,
  }),
];

const BANKING_PAPERS: MockPaper[] = [
  buildPaper({
    id: "bank-prelims-2025",
    domain: "banking",
    title: "Bank Prelims Mock 2025",
    shortLabel: "Prelims · 2025",
    description: "Sectional bank prelims covering quant, reasoning and English.",
    sections: [
      { id: "quant", label: "Quantitative", topic: "numerical", questions: 20, minutes: 20 },
      { id: "reasoning", label: "Reasoning", topic: "reasoning", questions: 20, minutes: 20 },
      { id: "english", label: "English", topic: "english", questions: 20, minutes: 20 },
    ],
    difficulty: "Moderate",
    accent: EMERALD,
  }),
];

const RANDOM_PAPERS: MockPaper[] = [
  buildPaper({
    id: "random-mixed-1",
    domain: "random",
    title: "Random Test Prep",
    shortLabel: "Random Mix",
    description: "A mixed bag of speed math, quant, reasoning and English.",
    sections: [
      { id: "vm", label: "Speed Math", topic: "addition", questions: 5, minutes: 5 },
      { id: "qa", label: "Quantitative", topic: "qa", questions: 5, minutes: 8 },
      { id: "ps", label: "Problem Solving", topic: "ps", questions: 5, minutes: 8 },
      { id: "eng", label: "English", topic: "english", questions: 5, minutes: 5 },
    ],
    difficulty: "Mixed",
    accent: LIME,
  }),
  buildPaper({
    id: "random-quick-1",
    domain: "random",
    title: "Random Quick Round",
    shortLabel: "Quick Round",
    description: "A short random sprint across all exam styles.",
    sections: [
      { id: "vm", label: "Speed Math", topic: "multiplication", questions: 4, minutes: 4 },
      { id: "ga", label: "General Awareness", topic: "ga", questions: 4, minutes: 5 },
      { id: "verbal", label: "Verbal", topic: "rc", questions: 4, minutes: 8 },
      { id: "num", label: "Numerical", topic: "numerical", questions: 4, minutes: 6 },
    ],
    difficulty: "Mixed",
    accent: CYAN,
  }),
];

export const MOCK_PAPERS_BY_DOMAIN: Record<string, MockPaper[]> = {
  gmat: GMAT_PAPERS,
  cat: CAT_PAPERS,
  gre: GRE_PAPERS,
  banking: BANKING_PAPERS,
  random: RANDOM_PAPERS,
};

export function getMockPapersByDomain(domain?: string): MockPaper[] {
  const d = domain ?? "cat";
  return MOCK_PAPERS_BY_DOMAIN[d] ?? MOCK_PAPERS_BY_DOMAIN["cat"] ?? [];
}

export function getMockPaperById(id: string): MockPaper | undefined {
  for (const papers of Object.values(MOCK_PAPERS_BY_DOMAIN)) {
    const found = papers.find((p) => p.id === id);
    if (found) return found;
  }
  return undefined;
}
