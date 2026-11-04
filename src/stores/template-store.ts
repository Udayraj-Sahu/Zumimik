import { create } from "zustand";
import type { RenderMode, SolveAlongTemplate, StepProgress } from "@/lib/types/template";

type TemplateState = {
  visibleSteps: number;
  totalSteps: number;
  showHint: boolean;
  userAnswer: string;
  isCorrect: boolean | null;
  mode: RenderMode;
  templates: SolveAlongTemplate[];
  currentIndex: number;
  stepProgress: Record<string, StepProgress>;
  sessionId: string | null;

  setMode: (mode: RenderMode) => void;
  loadTemplate: (template: SolveAlongTemplate) => void;
  loadTemplates: (templates: SolveAlongTemplate[], sessionId?: string) => void;
  revealNextStep: () => void;
  revealAllSteps: () => void;
  resetSteps: () => void;
  setAnswer: (val: string) => void;
  setCorrect: (val: boolean) => void;
  nextTemplate: () => void;
  prevTemplate: () => void;
  completeCurrent: (correct: boolean) => void;
  getCurrentTemplate: () => SolveAlongTemplate | null;
  reset: () => void;
};

export const useTemplateStore = create<TemplateState>((set, get) => ({
  visibleSteps: 0,
  totalSteps: 0,
  showHint: false,
  userAnswer: "",
  isCorrect: null,
  mode: "solve_along",
  templates: [],
  currentIndex: 0,
  stepProgress: {},
  sessionId: null,

  setMode: (mode) => set({ mode }),

  loadTemplate: (template) => {
    const totalSteps = template.examples?.[0]?.solution?.length ?? 0;
    const id = template.id;
    const existing = get().stepProgress[id];
    set({
      visibleSteps: existing?.visibleSteps ?? 0,
      totalSteps,
      showHint: false,
      userAnswer: "",
      isCorrect: existing?.correct ?? null,
    });
  },

  loadTemplates: (templates, sessionId) => {
    const stepProgress: Record<string, StepProgress> = {};
    for (const t of templates) {
      stepProgress[t.id] = {
        visibleSteps: 0,
        completed: false,
        correct: null,
        timeSpent: 0,
      };
    }
    set({
      templates,
      currentIndex: 0,
      stepProgress,
      sessionId: sessionId ?? null,
      visibleSteps: 0,
      totalSteps: templates[0]?.examples?.[0]?.solution?.length ?? 0,
      isCorrect: null,
    });
  },

  revealNextStep: () =>
    set((state) => {
      const next = Math.min(state.visibleSteps + 1, state.totalSteps);
      return { visibleSteps: next };
    }),

  revealAllSteps: () =>
    set((state) => ({ visibleSteps: state.totalSteps })),

  resetSteps: () => set({ visibleSteps: 0, isCorrect: null, userAnswer: "" }),

  setAnswer: (val) => set({ userAnswer: val }),

  setCorrect: (val) => set({ isCorrect: val }),

  nextTemplate: () =>
    set((state) => {
      const next = state.currentIndex + 1;
      if (next >= state.templates.length) return state;
      const t = state.templates[next];
      return {
        currentIndex: next,
        visibleSteps: state.stepProgress[t.id]?.visibleSteps ?? 0,
        totalSteps: t.examples?.[0]?.solution?.length ?? 0,
        isCorrect: state.stepProgress[t.id]?.correct ?? null,
        userAnswer: "",
      };
    }),

  prevTemplate: () =>
    set((state) => {
      const prev = state.currentIndex - 1;
      if (prev < 0) return state;
      const t = state.templates[prev];
      return {
        currentIndex: prev,
        visibleSteps: state.stepProgress[t.id]?.visibleSteps ?? 0,
        totalSteps: t.examples?.[0]?.solution?.length ?? 0,
        isCorrect: state.stepProgress[t.id]?.correct ?? null,
        userAnswer: "",
      };
    }),

  completeCurrent: (correct) =>
    set((state) => {
      const current = state.templates[state.currentIndex];
      if (!current) return state;
      const progress: StepProgress = {
        visibleSteps: state.totalSteps,
        completed: true,
        correct,
        timeSpent: 0,
      };
      return {
        isCorrect: correct,
        stepProgress: { ...state.stepProgress, [current.id]: progress },
      };
    }),

  getCurrentTemplate: () => {
    const state = get();
    return state.templates[state.currentIndex] ?? null;
  },

  reset: () =>
    set({
      visibleSteps: 0,
      totalSteps: 0,
      showHint: false,
      userAnswer: "",
      isCorrect: null,
      templates: [],
      currentIndex: 0,
      stepProgress: {},
      sessionId: null,
    }),
}));
