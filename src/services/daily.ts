import { apiGet, apiPost } from "./api";

/**
 * Daily challenge (real backend only; there are no fixtures for it).
 *   GET  /api/v1/social/daily             -> { date, problems: [{ problem_id, text, difficulty }], submitted: null | {...} }
 *   POST /api/v1/social/daily/submit      { answers: (string|null)[], total_time_ms } -> { score, rank, xp_awarded, ... } (409: already played)
 *   GET  /api/v1/social/daily/leaderboard -> { date, mode: "full" | "percentile_only" | "hidden", entries, me, participants }
 * The answers are scored on the server and never sent to the device.
 */
export type DailyProblem = { id: string; text: string; difficulty: number | null };

export type DailyResult = {
  correct: number;
  total: number;
  score: number;
  timeMs: number;
  rank: number | null;
  xpAwarded: number | null;
};

export type DailyChallenge = { date: string; problems: DailyProblem[]; submitted: DailyResult | null };

export type DailyLeaderboard = {
  date: string;
  mode: string;
  participants: number;
  entries: Array<{ rank: number; name: string; score: number; correct: number }>;
  me: { rank: number; score: number; percentile: number | null } | null;
};

type BackendDaily = {
  date?: string;
  problems?: Array<{ problem_id?: string; text?: string; difficulty?: number | null }>;
  submitted?: { problems_correct?: number; problems_total?: number; total_time_ms?: number; score?: number } | null;
};

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export async function getDailyChallenge(): Promise<DailyChallenge> {
  const res = await apiGet<BackendDaily>("/social/daily");
  const problems: DailyProblem[] = (res.problems ?? [])
    .filter((p) => typeof p.problem_id === "string" && typeof p.text === "string")
    .map((p) => ({ id: p.problem_id as string, text: p.text as string, difficulty: typeof p.difficulty === "number" ? p.difficulty : null }));
  const s = res.submitted;
  return {
    date: res.date ?? "",
    problems,
    submitted: s
      ? { correct: num(s.problems_correct), total: num(s.problems_total, problems.length), score: num(s.score), timeMs: num(s.total_time_ms), rank: null, xpAwarded: null }
      : null,
  };
}

export async function submitDailyChallenge(answers: Array<string | null>, totalTimeMs: number): Promise<DailyResult> {
  const res = await apiPost<{
    problems_correct?: number; problems_total?: number; score?: number; rank?: number | null; xp_awarded?: number;
  }>("/social/daily/submit", { answers, total_time_ms: Math.max(1, Math.round(totalTimeMs)) });
  return {
    correct: num(res.problems_correct),
    total: num(res.problems_total, answers.length),
    score: num(res.score),
    timeMs: Math.max(1, Math.round(totalTimeMs)),
    rank: typeof res.rank === "number" ? res.rank : null,
    xpAwarded: typeof res.xp_awarded === "number" ? res.xp_awarded : null,
  };
}

type BackendLeaderboard = {
  date?: string;
  mode?: string;
  participants?: number;
  entries?: Array<{ rank?: number; name?: string; score?: number; problems_correct?: number }>;
  me?: { rank?: number; score?: number; percentile?: number | null } | null;
};

export async function getDailyLeaderboard(): Promise<DailyLeaderboard> {
  const res = await apiGet<BackendLeaderboard>("/social/daily/leaderboard");
  return {
    date: res.date ?? "",
    mode: res.mode ?? "full",
    participants: num(res.participants),
    entries: (res.entries ?? []).map((e) => ({ rank: num(e.rank), name: e.name ?? "Learner", score: num(e.score), correct: num(e.problems_correct) })),
    me: res.me ? { rank: num(res.me.rank), score: num(res.me.score), percentile: typeof res.me.percentile === "number" ? res.me.percentile : null } : null,
  };
}
