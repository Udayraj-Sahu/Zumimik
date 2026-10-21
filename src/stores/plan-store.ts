import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";

export type PlanTier = "free" | "pro";

export const FREE_EXTRA_PREPS = 1;
export const FREE_MOCK_LIMIT = 2;

type PlanStoreState = {
  plan: PlanTier;
  mocksTaken: number;
  canAddPrep: (activeCount: number) => boolean;
  canTakeMock: () => boolean;
  setPro: () => void;
  recordMock: () => void;
  resetMocks: () => void;
  reset: () => void;
};

export const usePlanStore = create<PlanStoreState>()(
  persist(
    (set, get) => ({
      plan: "free",
      mocksTaken: 0,

      canAddPrep: (activeCount) => get().plan === "pro" || activeCount <= FREE_EXTRA_PREPS,
      canTakeMock: () => get().plan === "pro" || get().mocksTaken < FREE_MOCK_LIMIT,

      setPro: () => set({ plan: "pro" }),
      recordMock: () => set((s) => ({ mocksTaken: s.mocksTaken + 1 })),
      resetMocks: () => set({ mocksTaken: 0 }),
      reset: () => set({ plan: "free", mocksTaken: 0 }),
    }),
    {
      name: "zuzumik-plan",
      storage: createJSONStorage(() => safeLocalStorage),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<PlanStoreState>) }),
    },
  ),
);