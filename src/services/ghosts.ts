import { apiGet, apiPost } from "./api";
import type { Question, SprintResult } from "@/lib/types/sprint-session";

/**
 * Ghost runs (real backend only; flag `social_ghosts`, a dark feature answers 404).
 *   POST /api/v1/social/ghosts            { domain, skill, problem_ids, answer_times_ms, correct, is_public } -> { ghost_id, is_public, expires_at }
 *   GET  /api/v1/social/ghosts            -> { ghosts: [{ ghost_id, owner, domain, skill, problems, total_time_ms, problems_correct, is_public, created_at }] }
 *   POST /api/v1/social/ghosts/{id}/race  { time_ms, correct } -> { race_id, won, xp_awarded, ghost: { total_time_ms, problems_correct } }
 * `owner` is "You", a friend's name, or "Anonymous" (a public ghost never carries identity).
 */
export type Ghost = {
  id: string;
  owner: string;
  skill: string | null;
  problems: number;
  totalTimeMs: number;
  correct: number;
  isPublic: boolean;
  createdAt: string;
};

export type GhostRaceResult = { won: boolean; xpAwarded: number; ghostTimeMs: number; ghostCorrect: number };

const MAX_PROBLEMS = 50;
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

type BackendGhost = {
  ghost_id?: string; owner?: string; skill?: string | null; problems?: number;
  total_time_ms?: number; problems_correct?: number; is_public?: boolean; created_at?: string;
};

export async function getGhosts(): Promise<Ghost[]> {
  const res = await apiGet<{ ghosts?: BackendGhost[] }>("/social/ghosts");
  return (res.ghosts ?? [])
    .filter((g): g is BackendGhost & { ghost_id: string } => typeof g.ghost_id === "string")
    .map((g) => ({
      id: g.ghost_id,
      owner: g.owner ?? "Anonymous",
      skill: g.skill ?? null,
      problems: num(g.problems),
      totalTimeMs: num(g.total_time_ms),
      correct: num(g.problems_correct),
      isPublic: g.is_public === true,
      createdAt: g.created_at ?? "",
    }));
}

/** Builds the three aligned arrays the server requires (one entry per question; an unanswered question is wrong with a 1 ms floor). */
export function buildGhostRun(questions: ReadonlyArray<Pick<Question, "id">>, result: Pick<SprintResult, "answers">) {
  const used = questions.slice(0, MAX_PROBLEMS);
  const byId = new Map(result.answers.map((a) => [a.questionId, a]));
  return {
    problemIds: used.map((q) => q.id),
    answerTimesMs: used.map((q) => Math.max(1, Math.round((byId.get(q.id)?.timeSpent ?? 0) * 1000))),
    correct: used.map((q) => byId.get(q.id)?.correct === true),
  };
}

export async function saveGhost(input: {
  skill: string;
  domain?: string;
  questions: ReadonlyArray<Pick<Question, "id">>;
  result: Pick<SprintResult, "answers">;
  isPublic: boolean;
}): Promise<{ id: string; isPublic: boolean }> {
  const run = buildGhostRun(input.questions, input.result);
  const res = await apiPost<{ ghost_id?: string; is_public?: boolean }>("/social/ghosts", {
    ...(input.domain && input.domain.length <= 20 ? { domain: input.domain } : {}),
    skill: input.skill.slice(0, 160),
    problem_ids: run.problemIds,
    answer_times_ms: run.answerTimesMs,
    correct: run.correct,
    is_public: input.isPublic,
  });
  return { id: res.ghost_id ?? "", isPublic: res.is_public === true };
}

export async function raceGhost(ghostId: string, run: { timeMs: number; correct: number }): Promise<GhostRaceResult> {
  const res = await apiPost<{ won?: boolean; xp_awarded?: number; ghost?: { total_time_ms?: number; problems_correct?: number } }>(
    `/social/ghosts/${encodeURIComponent(ghostId)}/race`,
    { time_ms: Math.max(1, Math.round(run.timeMs)), correct: Math.max(0, Math.round(run.correct)) },
  );
  return { won: res.won === true, xpAwarded: num(res.xp_awarded), ghostTimeMs: num(res.ghost?.total_time_ms), ghostCorrect: num(res.ghost?.problems_correct) };
}

/** Race a ghost: the same skill and number of questions, then the result (time + correct) is compared on the server. */
export function raceHref(g: Ghost): string | null {
  if (!g.skill || g.problems < 1) return null;
  return `/play/sprint?topic=${encodeURIComponent(g.skill)}&length=${g.problems}&difficulty=adaptive&ghost=${encodeURIComponent(g.id)}`;
}
