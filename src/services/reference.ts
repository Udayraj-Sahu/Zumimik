import { apiGet } from "./api";

/**
 * Reference Library (public reads, no login): short study cards per trick/sutra. See routers/reference.py.
 *   GET /api/subtopics/reference               -> { pages: [...], count }
 *   GET /api/subtopics/{subtopic_id}/reference -> the full card
 * The ids here (e.g. "nikhilam_sutra") are NOT the practice catalog's :Skill names, so a card is never matched to a skill.
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
