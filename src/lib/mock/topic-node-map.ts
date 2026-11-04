export const TOPIC_TO_TECHNIQUE: Record<string, Record<string, string[]>> = {
  gmat: {
    ps: ["work-rate", "speed-distance"],
    ds: ["data-sufficiency"],
    sc: ["sentence-correction-parallelism"],
    cr: [],
    rc: [],
  },
  cat: {
    qa: ["work-rate", "speed-distance"],
    lrdi: [],
    va: ["sentence-correction-parallelism"],
  },
  gre: {
    qc: ["quant-comparison"],
    ps: ["speed-distance", "work-rate"],
    tc: [],
    se: [],
    rc: [],
  },
  banking: {
    numerical: ["percentage-tricks"],
    reasoning: [],
    english: ["sentence-correction-parallelism"],
    ga: [],
    computer: [],
  },
};

export function getTechniqueIdsForTopic(domain: string, topicId: string): string[] {
  return TOPIC_TO_TECHNIQUE[domain]?.[topicId] ?? [];
}
