"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useNetworkStore } from "@/stores/network-store";
import { isSyncing, subscribeSync } from "@/services/offline/sync-activity";
import {
  deriveSyncKind,
  EMPTY_COUNTS,
  readQueueCounts,
  type QueueCounts,
  type SyncStatusKind,
} from "@/services/sync-status";
const POLL_MS = 3000;
/** The learner's sync status, read from the real queue (Dexie) and the network, refreshed as a sync starts or ends and every few seconds. */
export function useSyncStatus(): {
  kind: SyncStatusKind;
  counts: QueueCounts;
  refresh: () => void;
} {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const online = useNetworkStore((s) => s.isOnline);
  const [counts, setCounts] = useState<QueueCounts>(EMPTY_COUNTS);
  const [syncing, setSyncing] = useState(isSyncing());
  const refresh = useCallback(() => {
    void readQueueCounts(userId).then(setCounts);
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    refresh();
    const unsubscribe = subscribeSync(() => {
      setSyncing(isSyncing());
      refresh(); // a sync starting or ending changes the queue
    });
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [userId, refresh]);
  return {
    kind: deriveSyncKind({
      online,
      syncing,
      pendingEvents: counts.pendingEvents,
      parkedEvents: counts.parkedEvents,
    }),
    counts,
    refresh,
  };
}
