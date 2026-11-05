import type { TopicNode } from "@/lib/types/technique";
import type { BackendTechniqueSummaryResponse, BackendTopicCatalogResponse } from "./backend-adapters";
import { matchReferencePage, type ReferencePageSummary } from "./reference";

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

/**
 * Marks the sub-topics under "Topics" that a finished reference page clearly covers (matchReferencePage) so they open that
 * technique page. Everything else is returned unchanged; the input is not mutated.
 */
export function linkReferencePages(subjects: TopicNode[], pages: ReadonlyArray<ReferencePageSummary>): TopicNode[] {
  if (pages.length === 0) return subjects;
  const link = (node: TopicNode): TopicNode => {
    const children = node.children?.map(link);
    const referenceId = node.type === "subtopic" && !node.bankTopic ? matchReferencePage(node.title, pages) : undefined;
    return { ...node, ...(children ? { children } : {}), ...(referenceId ? { referenceId } : {}) };
  };
  return subjects.map((s) => (s.id === EXPLORER_PROBLEM_BANK_ID ? link(s) : s));
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
      title: "Topics",
      slug: "topics",
      description: linkBankTopics ? "All topics and subtopics in the problem bank" : "Topics and subtopics for this exam",
      children: topics.topics.map(({ topic, problems, subtopics, subtopic_list }) => {
        // A topic opens into its sub-topics. Practice filters on the topic label only (the sub-topic is not a filter on the
        // fixed bank), so the sub-topics are display-only and a global topic gets one explicit "practise the whole topic" leaf.
        const practise: TopicNode[] = linkBankTopics
          ? [{ id: `topic:${topic}::practise`, type: "subtopic" as const, title: `Practise all ${titleOf(topic)}`, slug: slugOf(`topic-${topic}-practise`), bankTopic: topic }]
          : [];
        const subs: TopicNode[] = (subtopic_list ?? []).map((sub) => ({
          id: `topic:${topic}::${sub}`,
          type: "subtopic" as const,
          title: titleOf(sub),
          slug: slugOf(`${topic}-${sub}`),
        }));
        return {
          id: `topic:${topic}`,
          type: "topic" as const,
          title: titleOf(topic),
          slug: slugOf(`topic-${topic}`),
          description: `${problems} problems · ${subtopics} subtopics`,
          children: [...practise, ...subs],
        };
      }),
    });
  }
  return subjects;
}
