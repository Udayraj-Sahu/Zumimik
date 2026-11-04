import type { ReportSummary, ReportTopic } from "@/lib/types/reports";
import { apiGet } from "./api";
import type { BackendMockHistoryResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export type ReportsData = { summary: ReportSummary; topics: ReportTopic[] };

export async function getReportsData(): Promise<ReportsData> {
  if (IS_MOCK) {
    const { REPORT_SUMMARY, REPORT_TOPICS } = await import("@/lib/mock/reports");
    const { delay } = await import("@/lib/mock/delay");
    await delay(200);
    return { summary: REPORT_SUMMARY, topics: REPORT_TOPICS };
  }

  const [history, streak] = await Promise.all([
    apiGet<BackendMockHistoryResponse>("/mocks/history"),
    apiGet<{ xp: number }>("/dashboard/streak"),
  ]);
  const attempts = history.attempts;
  const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.total_score ?? 0), 0);
  const maxScore = attempts.reduce((sum, attempt) => sum + (attempt.max_score ?? 0), 0);
  const accuracies = attempts.map((attempt) =>
    attempt.max_score && attempt.total_score !== null
      ? Math.round((attempt.total_score / attempt.max_score) * 100)
      : 0,
  );
  const byExam = new Map<string, { attempts: number; score: number; maxScore: number }>();

  for (const attempt of attempts) {
    const current = byExam.get(attempt.exam) ?? { attempts: 0, score: 0, maxScore: 0 };
    current.attempts += 1;
    current.score += attempt.total_score ?? 0;
    current.maxScore += attempt.max_score ?? 0;
    byExam.set(attempt.exam, current);
  }

  return {
    summary: {
      totalSprints: attempts.length,
      totalXP: streak.xp,
      avgAccuracy: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      bestAccuracy: Math.max(0, ...accuracies),
      totalTime: attempts.reduce((sum, attempt) => sum + (attempt.total_time_taken_seconds ?? 0), 0),
    },
    topics: Array.from(byExam, ([exam, value]) => ({
      topic: exam,
      label: exam.toUpperCase(),
      sprints: value.attempts,
      accuracy: value.maxScore > 0 ? Math.round((value.score / value.maxScore) * 100) : 0,
    })),
  };
}

export async function getReportSummary(): Promise<ReportSummary> {
  return (await getReportsData()).summary;
}

export async function getReportTopics(): Promise<ReportTopic[]> {
  return (await getReportsData()).topics;
}
