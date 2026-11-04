import type { SprintResult, SprintSession } from "@/lib/types/sprint-session";
import { IS_MOCK } from "@/lib/platform";
import { apiPost } from "./api";

export async function syncSprintResult(
  session: Pick<SprintSession, "questions" | "topic"> & Partial<Pick<SprintSession, "domain">>,
  result: SprintResult,
  domain?: string,
  sessionType = "sprint",
): Promise<void> {
  if (IS_MOCK) return;

  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const questions = new Map(session.questions.map((question) => [question.id, question]));
  const attempted = result.answers.filter((answer) => answer.selectedIndex !== -1 || answer.answerText !== undefined);
  const events: Array<Record<string, unknown>> = attempted.map((answer) => {
    const question = questions.get(answer.questionId);
    return {
      event_id: crypto.randomUUID(),
      event_type: "problem_attempt",
      client_timestamp: now,
      session_id: sessionId,
      session_elapsed_ms: Math.max(0, Math.round(answer.timeSpent * 1000)),
      metadata: {
        skill: question?.techniqueId ?? session.topic,
        problem_id: answer.questionId,
        is_correct: answer.correct,
        time_ms: Math.max(0, Math.round(answer.timeSpent * 1000)),
        domain: domain ?? session.domain ?? "vedic-math",
        ...(question?.difficulty !== undefined ? { difficulty: question.difficulty } : {}),
        ...(question?.feedsMastery !== undefined ? { feeds_mastery: question.feedsMastery } : {}),
        ...(question?.answerCheck ? { answer_check: question.answerCheck } : {}),
        ...(answer.correct === null && answer.answerText !== undefined
          ? { submitted_answer: answer.answerText.trim() }
          : {}),
      },
    };
  });

  events.push({
    event_id: crypto.randomUUID(),
    event_type: "session_end",
    client_timestamp: now,
    session_id: sessionId,
    metadata: {
      problems_attempted: attempted.length,
      problems_correct: attempted.filter((answer) => answer.correct === true).length,
      problems_deferred: attempted.filter((answer) => answer.correct === null).length,
      session_type: sessionType,
      domain: domain ?? session.domain ?? "vedic-math",
      total_time_ms: Math.max(0, Math.round(result.totalTimeSpent * 1000)),
    },
  });

  await apiPost("/sync", { events });
}
