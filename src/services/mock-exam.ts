import type { MockPaper } from "@/lib/types/mock-exam";
import type { SprintSession } from "@/lib/types/sprint-session";
import type { Question, SprintResult } from "@/lib/types/sprint-session";
import { ApiError, apiGet, apiPost } from "./api";
import {
  mapMockBlueprints,
  mapMockConfigure,
  mapMockResults,
  type BackendBlueprintsResponse,
  type BackendMockConfigureResponse,
  type BackendMockResultsResponse,
  type BackendMockSubmitResponse,
} from "./backend-adapters";
import { useAuthStore } from "@/stores/auth-store";
import { addMockSinking } from "@/lib/learning/review";
import { commitSinkingBook, loadSinkingBook } from "./learner";
export async function getMockPapers(domain?: string): Promise<MockPaper[]> {
  const response = await apiGet<BackendBlueprintsResponse>("/mocks/blueprints");
  return mapMockBlueprints(response, domain);
}
/**
 * POST /mocks/configure answers 503 "<exam>.<section>: ... the pool has N" when the question bank cannot make a faithful section
 * (for example CAT VARC needs 8 verbal-ability questions and the bank has none). The same request with `practice: true` is the
 * server's labelled way to run it anyway. This returns the server's reason for that refusal, or null for any other error.
 */
export function unfillablePaperReason(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.status !== 503) return null;
  return /the pool has|cannot run as a scored mock|no combination of whole question sets/i.test(
    err.message,
  )
    ? err.message
    : null;
}
export async function getMockPaperSession(
  paperId: string,
  domain?: string,
  practice = false,
): Promise<SprintSession> {
  // Backend flow: blueprint key (cat | gmat | gre) → POST /mocks/configure creates the attempt and serves its questions.
  // There is no GET /mock-exam/session/{id} on the backend.
  const response = await apiPost<BackendMockConfigureResponse>("/mocks/configure", {
    exam: paperId,
    mode: "full",
    practice,
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
  await apiPost("/mocks/submit-answer", {
    mock_id: mockId,
    question_id: questionId,
    answer,
    time_ms: timeMs ?? null,
  });
}
export type MockSubmitInput = {
  mockId: string;
  questions: Question[];
  answers: Array<{
    question_id: string;
    answer: string | null;
    time_ms?: number;
  }>;
  elapsedSeconds: number;
};
/** Submit the exam (bulk answers make the submit self-sufficient if some submit-answer calls were lost), then read the graded review. */
export async function submitMock(input: MockSubmitInput): Promise<SprintResult> {
  const submitted = await apiPost<BackendMockSubmitResponse>("/mocks/submit", {
    mock_id: input.mockId,
    answers: input.answers,
    elapsed_seconds: Math.round(input.elapsedSeconds),
  });
  // The weak skills the server deferred become review entries (trigger mock_wrong_answer); a failure here never blocks the results.
  try {
    if (
      Array.isArray(submitted.deferred_sinking_skills) &&
      submitted.deferred_sinking_skills.length > 0
    ) {
      const userKey = useAuthStore.getState().user?.id ?? "";
      commitSinkingBook(
        userKey,
        addMockSinking(loadSinkingBook(userKey), submitted.deferred_sinking_skills),
      );
    }
  } catch {}
  const results = await apiGet<BackendMockResultsResponse>(
    `/mocks/results/${encodeURIComponent(input.mockId)}`,
  );
  return mapMockResults(results, input.questions, submitted.xp_awarded ?? 0, input.elapsedSeconds);
}
