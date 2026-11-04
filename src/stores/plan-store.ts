import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { IS_MOCK, safeLocalStorage } from "@/lib/platform";

export type PlanTier = "free" | "pro";

export const FREE_EXTRA_PREPS = 1;
export const FREE_MOCK_LIMIT = 2;

type PlanStoreState = {
  plan: PlanTier;
  mocksTaken: number;
  canAddPrep: (activeCount: number) => boolean;
  canTakeMock: () => boolean;
  setPro: () => void;
  /** Real mode: the ONLY way the plan becomes "pro" — from the backend entitlement. */
  setPlanFromEntitlement: (tier: string) => void;
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

      // Mock/dev only. In real mode a UI choice is never an entitlement.
      setPro: () => {
        if (IS_MOCK) set({ plan: "pro" });
      },
      setPlanFromEntitlement: (tier) => set({ plan: tier === "free" ? "free" : "pro" }),
      recordMock: () => set((s) => ({ mocksTaken: s.mocksTaken + 1 })),
      resetMocks: () => set({ mocksTaken: 0 }),
      reset: () => set({ plan: "free", mocksTaken: 0 }),
    }),
    {
      name: "zuzumik-plan",
      storage: createJSONStorage(() => safeLocalStorage),
      version: 1,
      // A "pro" persisted by the old local-only upgrade is not an entitlement: reset it in real mode.
      migrate: (persisted) => {
        const p = persisted as Partial<PlanStoreState>;
        return IS_MOCK ? p : { ...p, plan: "free" };
      },
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<PlanStoreState>) }),
    },
  ),
);