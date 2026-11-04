import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/services/history";
import type { HistoryEntry } from "@/lib/types/history";

export function useHistory(domain?: string) {
  return useQuery<HistoryEntry[]>({
    queryKey: ["history", domain],
    queryFn: () => getHistory(domain),
  });
}
