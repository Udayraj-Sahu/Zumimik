import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";

type WalkthroughState = {
  completed: boolean;
  complete: () => void;
  reset: () => void;
};

export const useWalkthroughStore = create<WalkthroughState>()(
  persist(
    (set) => ({
      completed: false,
      complete: () => set({ completed: true }),
      reset: () => set({ completed: false }),
    }),
    {
      name: "zuzumik-walkthrough-v2",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
