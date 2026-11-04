import type { SprintTopic, SprintConfig } from "@/lib/types/sprint";
import { apiGet } from "./api";
import { mapPracticeCatalogToSprintTopics, type BackendPracticeCatalogResponse } from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getSprintTopics(domain?: string): Promise<SprintTopic[]> {
  if (IS_MOCK) {
    const { getTopicsByDomain, SPRINT_CONFIG } = await import("@/lib/mock/sprint");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return getTopicsByDomain(domain ?? "cat");
  }
  const catalog = await apiGet<BackendPracticeCatalogResponse>("/practice/catalog");
  return mapPracticeCatalogToSprintTopics(catalog);
}

export async function getSprintConfig(): Promise<SprintConfig> {
  if (IS_MOCK) {
    const { getTopicsByDomain, SPRINT_CONFIG } = await import("@/lib/mock/sprint");
    const { delay } = await import("@/lib/mock/delay");

    await delay(100);
    return SPRINT_CONFIG;
  }
  // Session lengths and labels are presentation defaults; the backend has no
  // user-specific sprint configuration endpoint.
  const { SPRINT_CONFIG } = await import("@/lib/mock/sprint");
  return SPRINT_CONFIG;
}
