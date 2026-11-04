export const TOPIC_TO_CATEGORY: Record<string, Record<string, string[]>> = {
  gmat: {
    ps: ["problem_solving"],
    ds: ["data_sufficiency"],
    sc: ["sentence_correction"],
    cr: ["critical_reasoning"],
    rc: ["reading_comp"],
  },
  cat: {
    qa: ["quantitative_aptitude"],
    lrdi: ["lr_di"],
    va: ["verbal_ability"],
  },
  gre: {
    qc: ["quant_comparison"],
    ps: ["problem_solving"],
    tc: ["text_completion"],
    se: ["sentence_equivalence"],
    rc: ["reading_comp"],
  },
  banking: {
    numerical: ["numerical_ability"],
    reasoning: ["reasoning"],
    english: ["english"],
    ga: ["general_awareness"],
    computer: ["computer_knowledge"],
  },
};

export function getTemplateCategoriesForTopic(domain: string, topicId: string): string[] {
  return TOPIC_TO_CATEGORY[domain]?.[topicId] ?? ["core"];
}
