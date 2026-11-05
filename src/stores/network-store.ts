import { create } from "zustand";

export type QueuedMutation = {
  id: string;
  key: string;
  payload: unknown;
  timestamp: number;
};

/** What the last silent GET /ready check found (see services/health). Never shown to the learner. */
export type ServerState = "unknown" | "ready" | "degraded" | "unreachable";

type NetworkState = {
  isOnline: boolean;
  serverState: ServerState;
  setServerState: (state: ServerState) => void;
  syncQueue: QueuedMutation[];
  setOnline: (online: boolean) => void;
  addToQueue: (mutation: QueuedMutation) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  reset: () => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  serverState: "unknown",
  setServerState: (serverState) => set({ serverState }),
  syncQueue: [],
  setOnline: (online) => set({ isOnline: online }),
  addToQueue: (mutation) =>
    set((s) => ({ syncQueue: [...s.syncQueue, mutation] })),
  removeFromQueue: (id) =>
    set((s) => ({ syncQueue: s.syncQueue.filter((m) => m.id !== id) })),
  clearQueue: () => set({ syncQueue: [] }),
  reset: () => set({ isOnline: true, serverState: "unknown", syncQueue: [] }),
}));
