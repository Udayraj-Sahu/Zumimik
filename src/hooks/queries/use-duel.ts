import { useQuery } from "@tanstack/react-query";
import { getDuelTopics, getDuelOpponents } from "@/services/duel";
import type { DuelTopic, DuelOpponent } from "@/lib/types/duel";

type DuelSetupData = {
  topics: DuelTopic[];
  opponents: DuelOpponent[];
};

async function fetchDuelSetup(domain?: string): Promise<DuelSetupData> {
  const [topics, opponents] = await Promise.all([getDuelTopics(domain), getDuelOpponents()]);
  return { topics, opponents };
}

export function useDuelSetup(domain?: string) {
  return useQuery<DuelSetupData>({
    queryKey: ["duel-setup", domain],
    queryFn: () => fetchDuelSetup(domain),
  });
}
