import { useQuery } from "@tanstack/react-query";
import { getHistory, getTopicFilterOptions } from "@/services/history";
import type { HistoryEntry } from "@/lib/types/history";

export function useHistory(domain?: string) {
  return useQuery<HistoryEntry[]>({
    queryKey: ["history", domain],
    queryFn: () => getHistory(domain),
  });
}

/** Topic filter chips. Real mode derives them from the backend mock-exam blueprints (GET /mocks/blueprints), not a fixture. */
export function useHistoryTopicFilters(domain?: string) {
  return useQuery<{ id: string; label: string }[]>({
    queryKey: ["history-topic-filters", domain],
    queryFn: () => getTopicFilterOptions(domain),
    staleTime: 5 * 60 * 1000,
  });
}
