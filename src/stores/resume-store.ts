import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import type { Question } from "@/lib/types/sprint-session";
import type { AnswerEntry } from "@/stores/sprint-store";

export type ResumeSnapshot = {
  kind: "sprint" | "mock";
  paperId?: string;
  mockId?: string;
  topic: string;
  topicLabel: string;
  difficulty: string;
  totalTime: number;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, AnswerEntry>;
  questionStartTime: number | null;
  sessionStartTime: number;
  timeLeft: number;
  isAdaptive: boolean;
  domain?: string;
  savedAt: number;
};

type ResumeStoreState = {
  snapshot: ResumeSnapshot | null;
  saveSnapshot: (s: ResumeSnapshot) => void;
  clearSnapshot: () => void;
  reset: () => void;
};

export const useResumeStore = create<ResumeStoreState>()(
  persist(
    (set) => ({
      snapshot: null,
      saveSnapshot: (s) => set({ snapshot: s }),
      clearSnapshot: () => set({ snapshot: null }),
      reset: () => set({ snapshot: null }),
    }),
    {
      name: "zuzumik-resume",
      storage: createJSONStorage(() => safeLocalStorage),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<ResumeStoreState>) }),
    },
  ),
);