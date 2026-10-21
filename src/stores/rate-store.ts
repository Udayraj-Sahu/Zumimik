import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";

type RateState = {
  sprintCount: number;
  dismissed: boolean;
  neverShowAgain: boolean;
  increment: () => void;
  dismiss: () => void;
  neverShow: () => void;
  reset: () => void;
};

export const useRateStore = create<RateState>()(
  persist(
    (set) => ({
      sprintCount: 0,
      dismissed: false,
      neverShowAgain: false,
      increment: () => set((s) => ({ sprintCount: s.sprintCount + 1 })),
      dismiss: () => set({ dismissed: true }),
      neverShow: () => set({ neverShowAgain: true, dismissed: true }),
      reset: () => set({ sprintCount: 0, dismissed: false, neverShowAgain: false }),
    }),
    {
      name: "zuzumik-rate",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
