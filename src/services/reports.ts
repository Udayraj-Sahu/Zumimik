import type { ReportSummary, ReportTopic } from "@/lib/types/reports";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getReportSummary(): Promise<ReportSummary> {
  if (IS_MOCK) {
    const { REPORT_SUMMARY, REPORT_TOPICS } = await import("@/lib/mock/reports");
    const { delay } = await import("@/lib/mock/delay");
 await delay(200); return REPORT_SUMMARY; }
  return apiGet<ReportSummary>("/reports/summary");
}

export async function getReportTopics(): Promise<ReportTopic[]> {
  if (IS_MOCK) {
    const { REPORT_SUMMARY, REPORT_TOPICS } = await import("@/lib/mock/reports");
    const { delay } = await import("@/lib/mock/delay");
 await delay(150); return REPORT_TOPICS; }
  return apiGet<ReportTopic[]>("/reports/topics");
}
