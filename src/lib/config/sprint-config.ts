import type { SprintConfig } from "@/lib/types/sprint";

/** Presentation defaults for the sprint setup screen. The backend has no sprint-configuration endpoint. */
export const SPRINT_CONFIG: SprintConfig = {
  lengths: [5, 10, 15],
  difficulties: ["Adaptive", "Beginner", "Advanced"],
};
