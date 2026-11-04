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

/** Whether the backend can return topics scoped to one exam. It cannot today. */
export const EXAM_TOPIC_CATALOG_SUPPORTED = false;

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
