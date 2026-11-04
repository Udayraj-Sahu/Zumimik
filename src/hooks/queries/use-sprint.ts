import { useQuery } from "@tanstack/react-query";
import { getSprintTopics, getSprintConfig } from "@/services/sprint";
import type { SprintTopic, SprintConfig } from "@/lib/types/sprint";

type SprintData = {
  topics: SprintTopic[];
  config: SprintConfig;
};

async function fetchSprintData(domain?: string): Promise<SprintData> {
  const [topics, config] = await Promise.all([
    getSprintTopics(domain),
    getSprintConfig(),
  ]);
  return { topics, config };
}

export function useSprintTopics(domain?: string) {
  return useQuery<SprintData>({
    queryKey: ["sprint", domain],
    queryFn: () => fetchSprintData(domain),
  });
}
