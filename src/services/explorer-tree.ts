import type { TopicNode } from "@/lib/types/technique";
import type { BackendTechniqueSummaryResponse, BackendTopicCatalogResponse } from "./backend-adapters";

// ── Explorer: the GLOBAL catalog as a tree ──────────────────────────────────
// Sources (both unfiltered; neither carries an exam):
//   GET /api/practice/techniques → :Skill nodes {name, topic, sub_topic, is_root, problem_count}
//     (`name` is the same vocabulary as /practice/catalog `skill`, so a match is a practicable skill)
//   GET /api/topics              → problem-bank topics {topic, problems, subtopics}
// The two topic vocabularies differ (Skill.topic "NumberTheory" vs bank "Number Theory"), so they are never merged:
// each gets its own subject, and a skill with no `topic` is shown as such rather than guessed into one.

export const EXPLORER_UNCATEGORISED_ID = "subject:uncategorised";
export const EXPLORER_PROBLEM_BANK_ID = "subject:problem-bank";

type Skill = BackendTechniqueSummaryResponse["techniques"][number];

const slugOf = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const titleOf = (value: string) => value.replace(/[_-]+/g, " ");

function skillNode(t: Skill): TopicNode {
  return {
    id: t.name,
    type: "technique",
    title: titleOf(t.name),
    slug: slugOf(t.name),
    description: `${t.problem_count} problems`,
    techniqueId: t.name,
  };
}

export function buildGlobalExplorerTree(
  topics: BackendTopicCatalogResponse,
  techniques: BackendTechniqueSummaryResponse,
  /**
   * Whether a problem-bank topic can open Practice (GET /practice/session?topic= matches the corpus label exactly). True for the
   * global list. For an exam's topics the backend returns its own display names ("Quantitative Aptitude") which are not corpus
   * labels, so they return no questions; those nodes are shown but not linked.
   */
  options: { linkBankTopics?: boolean } = {},
): TopicNode[] {
  const linkBankTopics = options.linkBankTopics ?? true;
  const byTopic = new Map<string, Skill[]>();
  const uncategorised: TopicNode[] = [];
  for (const t of techniques.techniques) {
    if (!t.topic) {
      uncategorised.push(skillNode(t));
      continue;
    }
    byTopic.set(t.topic, [...(byTopic.get(t.topic) ?? []), t]);
  }

  const subjects: TopicNode[] = [...byTopic.entries()].map(([topic, skills]) => {
    const direct: TopicNode[] = [];
    const bySub = new Map<string, TopicNode[]>();
    for (const t of skills) {
      // A skill whose sub_topic is its own name is just that skill; only real groupings become a sub-topic node.
      if (t.sub_topic && t.sub_topic !== t.name) {
        bySub.set(t.sub_topic, [...(bySub.get(t.sub_topic) ?? []), skillNode(t)]);
      } else {
        direct.push(skillNode(t));
      }
    }
    const groups: TopicNode[] = [...bySub.entries()].map(([sub, children]) => ({
      id: `${topic}::${sub}`,
      type: "subtopic" as const,
      title: titleOf(sub),
      slug: slugOf(`${topic}-${sub}`),
      children,
    }));
    return {
      id: `subject:${topic}`,
      type: "subject" as const,
      title: titleOf(topic),
      slug: slugOf(topic),
      children: [...direct, ...groups],
    };
  });

  if (uncategorised.length > 0) {
    subjects.push({
      id: EXPLORER_UNCATEGORISED_ID,
      type: "subject",
      title: "Other skills",
      slug: "other-skills",
      description: "Skills the server has not assigned to a topic",
      children: uncategorised,
    });
  }

  if (topics.topics.length > 0) {
    subjects.push({
      id: EXPLORER_PROBLEM_BANK_ID,
      type: "subject",
      title: "Problem bank",
      slug: "problem-bank",
      description: "All topics in the problem bank (global)",
      children: topics.topics.map(({ topic, problems, subtopics }) => ({
        id: `bank:${topic}`,
        type: "topic" as const,
        ...(linkBankTopics ? { bankTopic: topic } : {}),
        title: titleOf(topic),
        slug: slugOf(`bank-${topic}`),
        description: `${problems} problems · ${subtopics} subtopics`,
      })),
    });
  }
  return subjects;
}
