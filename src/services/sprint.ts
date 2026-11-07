import type { SprintTopic, SprintConfig } from "@/lib/types/sprint";
import { apiGet } from "./api";
import {
  mapPracticeCatalogToSprintTopics,
  type BackendPracticeCatalogResponse,
} from "./backend-adapters";
export async function getSprintTopics(domain?: string): Promise<SprintTopic[]> {
  const catalog = await apiGet<BackendPracticeCatalogResponse>("/practice/catalog");
  return mapPracticeCatalogToSprintTopics(catalog);
}
export async function getSprintConfig(): Promise<SprintConfig> {
  // Session lengths and labels are presentation defaults; the backend has no
  // user-specific sprint configuration endpoint.
  const { SPRINT_CONFIG } = await import("@/lib/config/sprint-config");
  return SPRINT_CONFIG;
}
