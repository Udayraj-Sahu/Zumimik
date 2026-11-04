import type { HistoryEntry } from "@/lib/types/history";
import { apiGet } from "./api";
import {
  mapMockHistory,
  mapMockHistoryFilters,
  type BackendBlueprintsResponse,
  type BackendMockHistoryResponse,
} from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getHistory(domain?: string): Promise<HistoryEntry[]> {
  if (IS_MOCK) {
    const { HISTORY_ENTRIES, getTopicFilters } = await import("@/lib/mock/history");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return HISTORY_ENTRIES;
  }
  const response = await apiGet<BackendMockHistoryResponse>("/mocks/history");
  return mapMockHistory(response, domain);
}

export async function getTopicFilterOptions(domain?: string): Promise<{ id: string; label: string }[]> {
  if (IS_MOCK) {
    const { HISTORY_ENTRIES, getTopicFilters } = await import("@/lib/mock/history");
    const { delay } = await import("@/lib/mock/delay");

    await delay(50);
    return getTopicFilters(domain ?? "cat");
  }
  const response = await apiGet<BackendBlueprintsResponse>("/mocks/blueprints");
  return mapMockHistoryFilters(response, domain);
}
