import { create } from "zustand";
import { safeSessionStorage } from "@/lib/platform";

/**
 * Tracks whether the dashboard welcome (the mascot walking in + the cloud
 * greeting) should play.
 *
 * State lives in `sessionStorage` on purpose: it survives a page refresh inside
 * the same app session (so a reload never replays the welcome) but is cleared
 * when the app is closed and reopened (so returning users get it again).
 *
 *  - `idle`    → nothing queued yet this session
 *  - `pending` → a welcome is queued and not played yet
 *  - `played`  → already played this session, do not replay
 */
export type WelcomeStatus = "idle" | "pending" | "played";

const STORAGE_KEY = "zuzumik-welcome";

function readStoredStatus(): WelcomeStatus {
  const raw = safeSessionStorage.getItem(STORAGE_KEY);
  if (!raw) return "idle";
  try {
    const parsed = JSON.parse(raw) as { status?: unknown };
    return parsed?.status === "pending" || parsed?.status === "played" ? parsed.status : "idle";
  } catch {
    return "idle";
  }
}

function writeStoredStatus(status: WelcomeStatus): void {
  if (status === "idle") {
    safeSessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  safeSessionStorage.setItem(STORAGE_KEY, JSON.stringify({ status }));
}

type WelcomeState = {
  status: WelcomeStatus;
  /** Cold app open — queue a welcome only if none played this session. */
  requestOnAppOpen: () => void;
  /** Fresh sign-up — always queue a welcome, even if one already played. */
  requestOnSignup: () => void;
  /** The dashboard has played (or intentionally skipped) the welcome. */
  consume: () => void;
  reset: () => void;
};

export const useWelcomeStore = create<WelcomeState>((set) => ({
  status: readStoredStatus(),
  requestOnAppOpen: () =>
    set((s) => {
      if (s.status !== "idle") return s;
      writeStoredStatus("pending");
      return { status: "pending" };
    }),
  requestOnSignup: () => {
    writeStoredStatus("pending");
    set({ status: "pending" });
  },
  consume: () => {
    writeStoredStatus("played");
    set({ status: "played" });
  },
  reset: () => {
    writeStoredStatus("idle");
    set({ status: "idle" });
  },
}));
