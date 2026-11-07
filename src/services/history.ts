import type { HistoryEntry } from "@/lib/types/history";
import { apiGet } from "./api";
import {
  mapMockHistory,
  mapMockHistoryFilters,
  type BackendBlueprintsResponse,
  type BackendMockHistoryResponse,
} from "./backend-adapters";
export async function getHistory(domain?: string): Promise<HistoryEntry[]> {
  const response = await apiGet<BackendMockHistoryResponse>("/mocks/history");
  return mapMockHistory(response, domain);
}
export async function getTopicFilterOptions(domain?: string): Promise<
  {
    id: string;
    label: string;
  }[]
> {
  const response = await apiGet<BackendBlueprintsResponse>("/mocks/blueprints");
  return mapMockHistoryFilters(response, domain);
}
