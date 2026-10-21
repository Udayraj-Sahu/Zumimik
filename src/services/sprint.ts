import type { SprintTopic, SprintConfig } from "@/lib/types/sprint";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getSprintTopics(domain?: string): Promise<SprintTopic[]> {
  if (IS_MOCK) {
    const { getTopicsByDomain, SPRINT_CONFIG } = await import("@/lib/mock/sprint");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return getTopicsByDomain(domain ?? "cat");
  }
  const params = domain ? `?domain=${domain}` : "";
  return apiGet<SprintTopic[]>(`/sprint/topics${params}`);
}

export async function getSprintConfig(): Promise<SprintConfig> {
  if (IS_MOCK) {
    const { getTopicsByDomain, SPRINT_CONFIG } = await import("@/lib/mock/sprint");
    const { delay } = await import("@/lib/mock/delay");

    await delay(100);
    return SPRINT_CONFIG;
  }
  return apiGet<SprintConfig>("/sprint/config");
}
