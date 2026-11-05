import { apiGet } from "./api";

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
const lead = (v: string) => v.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)[0];

/**
 * The practice skill a reference page belongs to. Reference ids are not linked to skills by the backend, so this is a name match:
 * an identical name first, otherwise a skill that starts with the same word (e.g. "urdhva" for "Urdhva Tiryagbhyam (...)"), accepted
 * only when exactly one skill does. Ambiguous or missing -> undefined (no skill practice is offered).
 */
export function findPracticeSkill<T extends { id: string }>(
  card: { name: string; subtopic_id: string; sutra: string | null },
  skills: readonly T[],
): T | undefined {
  const labels = [card.name, card.subtopic_id, card.sutra ?? ""].filter(Boolean);
  const names = labels.map(norm);
  const exact = skills.find((s) => names.includes(norm(s.id)));
  if (exact) return exact;
  const leads = new Set(labels.map(lead).filter((w): w is string => !!w && w.length >= 4));
  const candidates = skills.filter((s) => leads.has(lead(s.id) ?? ""));
  return candidates.length === 1 ? candidates[0] : undefined;
}

/** The problem-corpus topic a page's topic names (e.g. "Vedic Math" -> "Vedic Mathematics"), by prefix. Undefined when none does. */
export function findCorpusTopic(pageTopic: string, corpusTopics: readonly string[]): string | undefined {
  const want = norm(pageTopic);
  if (want.length < 5) return undefined;
  return corpusTopics.find((t) => norm(t) === want) ?? corpusTopics.find((t) => norm(t).startsWith(want));
}

const words = (v: string) => v.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * The finished reference page that a sub-topic name clearly covers: every word of the page id ("nikhilam_sutra" -> nikhilam, sutra)
 * appears, in order and next to each other, in the sub-topic name ("Squaring Numbers Near a Base (Nikhilam Sutra)"). Only finished
 * pages are considered, so a link never lands on a "not ready" page; the longest id wins. A one-word id must be a whole word.
 */
export function matchReferencePage(
  subtopic: string,
  pages: ReadonlyArray<Pick<ReferencePageSummary, "subtopic_id" | "content_status" | "has_defects">>,
): string | undefined {
  const name = words(subtopic);
  let best: string | undefined;
  for (const p of pages) {
    if (!isReadyPage(p)) continue;
    const id = words(p.subtopic_id);
    if (id.length === 0 || id.join("").length < 6) continue;
    for (let i = 0; i + id.length <= name.length; i++) {
      if (id.every((w, k) => name[i + k] === w)) {
        if (!best || p.subtopic_id.length > best.length) best = p.subtopic_id;
        break;
      }
    }
  }
  return best;
}

/** GET /api/topics (global): the topic labels GET /practice/session?topic= understands. */
export async function getCorpusTopicNames(): Promise<string[]> {
  const res = await apiGet<{ topics?: Array<{ topic?: unknown }> }>("/api/topics");
  return (res?.topics ?? []).map((t) => t.topic).filter((t): t is string => typeof t === "string");
}

/**
 * Reference Library (public reads, no login): short study cards per trick/sutra. See routers/reference.py.
 *   GET /api/subtopics/reference               -> { pages: [...], count }
 *   GET /api/subtopics/{subtopic_id}/reference -> the full card
 * The ids here (e.g. "nikhilam_sutra") are NOT the practice catalog's :Skill names; the backend has no link, so findPracticeSkill
 * matches by name and only when that is unambiguous.
 */
export type ContentStatus = "complete" | "partial" | "coming_soon" | "needs_human_review";

export type ReferencePageSummary = {
  subtopic_id: string;
  topic: string;
  category: string;
  content_status: ContentStatus;
  review_status: string | null;
  has_defects: boolean;
  attached_templates: number;
};

export type ReferenceTechnique = {
  name?: string;
  focus?: string;
  example?: { problem?: string; answer?: string };
  template_count?: number;
};

/** quick_ref is authored content: every part is optional and read defensively. */
export type ReferenceCard = {
  subtopic_id: string;
  name: string;
  topic: string;
  category: string;
  sutra: string | null;
  sutra_sanskrit: string | null;
  translation: string | null;
  quick_ref: {
    the_trick?: { time_saved?: string; difficulty_label?: string; mental_steps?: string[]; formula_latex?: string[] };
    top_traps?: Array<{ name?: string; description?: string; example?: string; prevention?: string }>;
    when_to_use?: { conditions?: string[]; range_rule?: string };
    quick_example?: { problem?: string; answer?: string };
  };
  techniques_by_difficulty: Record<string, ReferenceTechnique[]>;
  total_techniques: number;
  attached_templates: number;
  attached_by_level: Record<string, number>;
  content_status: ContentStatus;
  review_status: string | null;
  has_defects: boolean;
};

export async function getReferencePages(): Promise<ReferencePageSummary[]> {
  const res = await apiGet<{ pages?: ReferencePageSummary[] }>("/api/subtopics/reference");
  return Array.isArray(res?.pages) ? res.pages : [];
}

export async function getReferenceCard(subtopicId: string): Promise<ReferenceCard> {
  return apiGet<ReferenceCard>(`/api/subtopics/${encodeURIComponent(subtopicId)}/reference`);
}

/** Only an approved, finished page is shown as a card; everything else is listed as coming soon. */
export const isReadyPage = (p: Pick<ReferencePageSummary, "content_status" | "has_defects">) =>
  p.content_status === "complete" && !p.has_defects;
