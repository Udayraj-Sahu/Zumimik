import type { HistoryEntry } from "@/lib/types/history";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getHistory(domain?: string): Promise<HistoryEntry[]> {
  if (IS_MOCK) {
    const { HISTORY_ENTRIES, getTopicFilters } = await import("@/lib/mock/history");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return HISTORY_ENTRIES;
  }
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<HistoryEntry[]>(`/history${params}`);
}

export async function getTopicFilterOptions(domain?: string): Promise<{ id: string; label: string }[]> {
  if (IS_MOCK) {
    const { HISTORY_ENTRIES, getTopicFilters } = await import("@/lib/mock/history");
    const { delay } = await import("@/lib/mock/delay");

    await delay(50);
    return getTopicFilters(domain ?? "cat");
  }
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<{ id: string; label: string }[]>(`/history/filters${params}`);
}
