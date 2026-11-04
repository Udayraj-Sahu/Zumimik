import type { MockPaper } from "@/lib/types/mock-exam";
import type { SprintSession } from "@/lib/types/sprint-session";
import type { Question, SprintResult } from "@/lib/types/sprint-session";
import { apiGet, apiPost } from "./api";
import {
  mapMockBlueprints,
  mapMockConfigure,
  mapMockResults,
  type BackendBlueprintsResponse,
  type BackendMockConfigureResponse,
  type BackendMockResultsResponse,
  type BackendMockSubmitResponse,
} from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getMockPapers(domain?: string): Promise<MockPaper[]> {
  if (IS_MOCK) {
    const { getMockPapersByDomain, getMockPaperById } = await import("@/lib/mock/mock-exam");
    const { delay } = await import("@/lib/mock/delay");

    await delay(250);
    return getMockPapersByDomain(domain);
  }
  const response = await apiGet<BackendBlueprintsResponse>("/mocks/blueprints");
  return mapMockBlueprints(response, domain);
}

export async function getMockPaperSession(paperId: string, domain?: string): Promise<SprintSession> {
  if (IS_MOCK) {
    const { getMockPapersByDomain, getMockPaperById } = await import("@/lib/mock/mock-exam");
    const { buildPaperSession } = await import("@/lib/mock/sprint-session");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    const paper = getMockPaperById(paperId);
    if (!paper) throw new Error("Mock paper not found");
    return buildPaperSession(
      paper.domain ?? domain ?? "cat",
      paper.title,
      paper.durationMinutes,
      paper.sections.map((s) => ({ topic: s.topic, questions: s.questions })),
    );
  }
  // Backend flow: blueprint key (cat | gmat | gre) → POST /mocks/configure creates the attempt and serves its questions.
  // There is no GET /mock-exam/session/{id} on the backend.
  const response = await apiPost<BackendMockConfigureResponse>("/mocks/configure", {
    exam: paperId,
    mode: "full",
    practice: false,
  });
  return mapMockConfigure(response, paperId.toUpperCase());
}

/** Record one answer server-side (idempotent upsert per question). `answer` is the option id, or typed text. */
export async function submitMockAnswer(
  mockId: string,
  questionId: string,
  answer: string | null,
  timeMs?: number,
): Promise<void> {
  if (IS_MOCK) return;
  await apiPost("/mocks/submit-answer", { mock_id: mockId, question_id: questionId, answer, time_ms: timeMs ?? null });
}

export type MockSubmitInput = {
  mockId: string;
  questions: Question[];
  answers: Array<{ question_id: string; answer: string | null; time_ms?: number }>;
  elapsedSeconds: number;
};

/** Submit the exam (bulk answers make the submit self-sufficient if some submit-answer calls were lost), then read the graded review. */
export async function submitMock(input: MockSubmitInput): Promise<SprintResult> {
  const submitted = await apiPost<BackendMockSubmitResponse>("/mocks/submit", {
    mock_id: input.mockId,
    answers: input.answers,
    elapsed_seconds: Math.round(input.elapsedSeconds),
  });
  const results = await apiGet<BackendMockResultsResponse>(`/mocks/results/${encodeURIComponent(input.mockId)}`);
  return mapMockResults(results, input.questions, submitted.xp_awarded ?? 0, input.elapsedSeconds);
}
