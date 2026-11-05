import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import type { AdaptiveDomainState, SessionOutcome } from "@/lib/types/adaptive";
import { applyOutcome, initialDomainState } from "@/lib/adaptive/engine";

/**
 * LEGACY, mock-era state. Nothing in the app reads or writes it any more: the Adaptive Learning tab shows the learner model
 * (see docs/ADAPTIVE_LEARNING_ARCHITECTURE.md) and the server holds the mastery. It is only cleared on reset, and its persisted key is
 * still removed so old installs do not keep it. Left in place, rather than deleted, because the store tests still exercise it; it can
 * go together with applyOutcome in lib/adaptive/engine.ts.
 */
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