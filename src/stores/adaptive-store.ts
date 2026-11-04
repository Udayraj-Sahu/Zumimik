import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import type { AdaptiveDomainState, SessionOutcome } from "@/lib/types/adaptive";
import { applyOutcome, initialDomainState } from "@/lib/adaptive/engine";

type AdaptiveStoreState = {
  states: Record<string, AdaptiveDomainState>;
  ensureState: (domain: string) => AdaptiveDomainState;
  recordSession: (outcome: SessionOutcome) => AdaptiveDomainState;
  reset: () => void;
};

export const useAdaptiveStore = create<AdaptiveStoreState>()(
  persist(
    (set, get) => ({
      states: {},

      ensureState: (domain) => {
        const existing = get().states[domain];
        if (existing) return existing;
        const fresh = initialDomainState(domain);
        set((s) => ({ states: { ...s.states, [domain]: fresh } }));
        return fresh;
      },

      recordSession: (outcome) => {
        const current = get().ensureState(outcome.domain);
        const next = applyOutcome(current, outcome);
        set((s) => ({ states: { ...s.states, [outcome.domain]: next } }));
        return next;
      },

      reset: () => set({ states: {} }),
    }),
    {
      name: "zuzumik-adaptive",
      storage: createJSONStorage(() => safeLocalStorage),
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<AdaptiveStoreState>) }),
    },
  ),
);