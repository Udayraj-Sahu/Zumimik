import { ApiError, apiGet, apiPost } from "./api";

/**
 * POST /api/v1/chat/query { template_id, level (1-3) } -> a hint for one problem, without its answer (feature flag `chatbot`).
 * With the language model off (as on staging) this is the rule-based ladder: level 1 names the method, later levels give worked
 * steps from the source when a safe one exists. The server clamps `level` to `max_level` (1 when no worked step can be shown
 * without giving the answer away), so a request above it returns the top hint again. 404 "unknown problem" for an id it cannot
 * load; 429 when the daily budget is used up (rule-based hints cost nothing). The hint text may contain LaTeX ($...$).
 */
/**
 * GET /api/v1/chat/policy -> { hints_only, rag, llm_enabled, model, daily_token_budget, budget_remaining, usage_today }. It is behind the same
 * `chatbot` switch (and rollout) as chat/query, so a 200 means hints are available to THIS learner; a 404 means they are not. The app asks
 * it before offering a hint, so a button is never shown that would only fail. (With the language model off, as on staging, hints are
 * rule-based and cost no budget.)
 */
export type ChatPolicy = { hintsOnly: boolean; llmEnabled: boolean; dailyTokenBudget: number; budgetRemaining: number };

export async function getChatPolicy(): Promise<ChatPolicy> {
  const res = await apiGet<{ hints_only?: boolean; llm_enabled?: boolean; daily_token_budget?: number; budget_remaining?: number }>("/chat/policy");
  return {
    hintsOnly: res?.hints_only !== false,
    llmEnabled: res?.llm_enabled === true,
    dailyTokenBudget: typeof res?.daily_token_budget === "number" ? res.daily_token_budget : 0,
    budgetRemaining: typeof res?.budget_remaining === "number" ? res.budget_remaining : 0,
  };
}

export type ServerHint = {
  level: number;
  maxLevel: number;
  hint: string;
  /** Set when the server could not show a worked step safely: the hints are about the method only. */
  notice: string | null;
};

export async function getServerHint(templateId: string, level: number): Promise<ServerHint> {
  const res = await apiPost<{ level?: number; max_level?: number; hint?: string; notice?: string | null }>("/chat/query", {
    template_id: templateId,
    level: Math.min(3, Math.max(1, Math.floor(level))),
  });
  if (!res || typeof res.hint !== "string" || !res.hint.trim()) throw new Error("The server did not return a hint.");
  const lvl = typeof res.level === "number" ? res.level : level;
  return { level: lvl, maxLevel: typeof res.max_level === "number" ? res.max_level : lvl, hint: res.hint, notice: res.notice ?? null };
}

/** A plain message for a failed hint request (the server's own text for 404/429, which is already readable). */
export function hintErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return "No hint is available for this problem.";
  if (err instanceof ApiError && err.status === 429) return err.message;
  return "Couldn't get a hint. Please try again.";
}
