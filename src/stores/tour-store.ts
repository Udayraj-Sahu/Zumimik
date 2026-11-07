import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";

/**
 * Who should see the first-run walkthrough. Only an account that has just been created is queued (markNewAccount); it is shown once,
 * then the account is recorded as seen. This lives under its own key that sign-out and "reset app" do NOT clear, so signing in again
 * never replays the tour (the old single device-wide flag was wiped by every sign-out).
 */
type TourState = {
  pending: string[];
  seen: string[];
  markNewAccount: (userId: string | undefined | null) => void;
  finish: (userId: string | undefined | null) => void;
};

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      pending: [],
      seen: [],
      markNewAccount: (userId) => {
        if (!userId || get().seen.includes(userId) || get().pending.includes(userId)) return;
        set((s) => ({ pending: [...s.pending, userId] }));
      },
      finish: (userId) => {
        if (!userId) return;
        set((s) => ({
          pending: s.pending.filter((id) => id !== userId),
          seen: s.seen.includes(userId) ? s.seen : [...s.seen, userId],
        }));
      },
    }),
    { name: "zuzumik-tour", storage: createJSONStorage(() => safeLocalStorage) },
  ),
);
