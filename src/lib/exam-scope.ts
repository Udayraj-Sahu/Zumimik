export const ACTIVE_PATHS = ["core_math_vedic", "vedic_standalone", "exam_prep"] as const;
export type ActivePath = (typeof ACTIVE_PATHS)[number];

export type BackendTargetExam = "CAT" | "GMAT" | "GRE" | "School";

const EXAM_ID_TO_BACKEND: Record<string, BackendTargetExam> = {
  cat: "CAT",
  gmat: "GMAT",
  gre: "GRE",
};

/** Frontend exam id → backend `users.target_exam`, or null when it has no backend value (e.g. "vedic-math"). */
export function toBackendTargetExam(examId: string | null | undefined): BackendTargetExam | null {
  return examId ? (EXAM_ID_TO_BACKEND[examId] ?? null) : null;
}

export function isActivePath(value: unknown): value is ActivePath {
  return typeof value === "string" && (ACTIVE_PATHS as readonly string[]).includes(value);
}

/**
 * Whether the backend can return topics scoped to one exam. It can: GET /api/topics?domain=, GET /api/practice/techniques?domain=
 * and GET /dashboard/topics?domain= (verified on staging). It only knows the exams in EXAM_SCOPED_DOMAINS; any other domain gets
 * the global catalog back.
 */
export const EXAM_TOPIC_CATALOG_SUPPORTED = true;

/** The domains the backend scopes topics for. Anything else (e.g. "school") is answered with the global catalog. */
export const EXAM_SCOPED_DOMAINS = ["cat", "gmat", "gre", "banking", "vedic-math"] as const;

export function isExamScopedDomain(domain: string | null | undefined): boolean {
  return !!domain && (EXAM_SCOPED_DOMAINS as readonly string[]).includes(domain);
}

/** Notice for any screen that lists global topics while an exam is selected. */
export function globalTopicsNotice(examLabel: string | null | undefined): string {
  return examLabel
    ? `Exam-specific topic lists for ${examLabel} aren't available yet. These topics are shared across all exams.`
    : "These topics are shared across all exams.";
}

/** Notice for screens showing the learner's mastery rather than a catalog. */
export function masteryNotice(examLabel: string | null | undefined): string {
  return examLabel
    ? `Your overall mastery across all topics. It is not a ${examLabel} syllabus.`
    : "Your overall mastery across all topics.";
}

/** Notice for mastery fetched for one exam (GET /dashboard/topics?domain=): the learner's progress on that exam's topics. */
export function examMasteryNotice(examLabel: string): string {
  return `Your mastery across ${examLabel} topics.`;
}

/**
 * What the Explorer may claim about its data for the current selection. Exam and learning path are independent inputs;
 * neither changes which topics the backend returns today.
 */
export type ExplorerScope = {
  exam: string | null;
  activePath: ActivePath | null;
  /** "global": the catalog is the same for every exam. "exam": the backend scopes it to the selected exam. */
  catalog: "global" | "exam";
  /** True when an exam is selected but the backend has no exam-specific catalog for it (it answers with the global one). */
  examCatalogUnavailable: boolean;
};

export function resolveExplorerScope(
  exam: string | null | undefined,
  activePath: ActivePath | null | undefined,
): ExplorerScope {
  const selected = exam || null;
  const scoped = EXAM_TOPIC_CATALOG_SUPPORTED && isExamScopedDomain(selected);
  return {
    exam: selected,
    activePath: activePath ?? null,
    catalog: scoped ? "exam" : "global",
    examCatalogUnavailable: !!selected && !scoped,
  };
}

/**
 * Cache-key part for explorer data. Global data must not be cached separately (or re-fetched) per exam, so the exam
 * is part of the key only when the backend can scope the data to it, or in mock mode whose fixtures are per exam.
 */
export function explorerScopeKey(
  exam: string | null | undefined,
  perExamData: boolean,
  catalogSupported: boolean = EXAM_TOPIC_CATALOG_SUPPORTED,
): string {
  return catalogSupported || perExamData ? (exam ?? "") : "global";
}
