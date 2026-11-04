import type { ReportSummary, ReportTopic } from "@/lib/types/reports";

export const REPORT_SUMMARY: ReportSummary = {
  totalSprints: 47,
  totalXP: 6240,
  avgAccuracy: 78,
  bestAccuracy: 100,
  totalTime: 5460,
};

export const REPORT_TOPICS: ReportTopic[] = [
  { topic: "addition", label: "Addition", sprints: 10, accuracy: 85, xp: 1420 },
  { topic: "subtraction", label: "Subtraction", sprints: 7, accuracy: 79, xp: 980 },
  { topic: "multiplication", label: "Multiplication", sprints: 9, accuracy: 82, xp: 1150 },
  { topic: "division", label: "Division", sprints: 6, accuracy: 71, xp: 720 },
  { topic: "squares", label: "Squares", sprints: 8, accuracy: 88, xp: 1240 },
  { topic: "mixed", label: "Mixed", sprints: 7, accuracy: 74, xp: 730 },
];
