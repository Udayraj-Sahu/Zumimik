import type { DuelTopic, DuelOpponent, DuelResult } from "@/lib/types/duel";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getDuelTopics(domain?: string): Promise<DuelTopic[]> {
  if (IS_MOCK) {
    const { getDuelTopics: mockGetDuelTopics } = await import("@/lib/mock/duel");
    const { delay } = await import("@/lib/mock/delay");
    await delay(100);
    return mockGetDuelTopics(domain ?? "cat");
  }
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<DuelTopic[]>(`/duel/topics${params}`);
}

export async function getDuelOpponents(): Promise<DuelOpponent[]> {
  if (IS_MOCK) {
    const { DUEL_OPPONENTS } = await import("@/lib/mock/duel");
    const { delay } = await import("@/lib/mock/delay");
    await delay(100);
    return DUEL_OPPONENTS;
  }
  return apiGet<DuelOpponent[]>("/duel/opponents");
}

export async function submitDuelResult(yourCorrect: number, total: number): Promise<DuelResult> {
  if (IS_MOCK) {
    const { generateDuelResult } = await import("@/lib/mock/duel");
    const { delay } = await import("@/lib/mock/delay");
    await delay(300);
    return generateDuelResult(yourCorrect, total);
  }
  return apiGet<DuelResult>(`/duel/result?correct=${yourCorrect}&total=${total}`);
}
