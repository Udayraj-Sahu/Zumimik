import { db } from "./db";
import { useNetworkStore, type QueuedMutation } from "@/stores/network-store";
import { useAuthStore } from "@/stores/auth-store";
import { apiUrl } from "@/lib/platform";
import { mapContentFeedback } from "@/services/backend-adapters";
import type { QueuedEventBatch } from "./db";

const MAX_SYNC_RETRIES = 3;

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function cacheQueryData(key: string, data: unknown, trustStatus?: string): Promise<void> {
  await db.dashboardCache.put({
    id: key,
    data,
    updatedAt: Date.now(),
    trustStatus,
    ttl: trustStatus === "trusted" ? 86_400_000 : trustStatus === "sandbox" ? 3_600_000 : undefined,
  });
}

export async function getCachedQueryData(key: string): Promise<unknown | null> {
  const entry = await db.dashboardCache.get(key);
  if (!entry) return null;
  if (entry.ttl && Date.now() - entry.updatedAt > entry.ttl) {
    await db.dashboardCache.delete(key);
    return null;
  }
  return entry.data;
}

export async function clearExpiredCache(): Promise<void> {
  const now = Date.now();
  const expired = await db.dashboardCache
    .filter((e) => e.ttl !== undefined && now - e.updatedAt > e.ttl!)
    .toArray();
  await Promise.all(expired.map((e) => db.dashboardCache.delete(e.id)));
}

let syncInFlight: Promise<void> | null = null;

export async function syncAll(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSyncAll().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function doSyncAll(): Promise<void> {
  if (!useAuthStore.getState().token) return;
  const { syncQueue } = useNetworkStore.getState();
  const inMemoryIds = new Set(syncQueue.map((m) => m.id));
  if (syncQueue.length) await flushMemoryQueue();
  // After a reload the in-memory queue is empty, but the Dexie queues survive: replay those too.
  await flushFeedbackFromDisk(inMemoryIds);
  await flushEventQueue();
}

async function flushMemoryQueue(): Promise<void> {
  const { syncQueue } = useNetworkStore.getState();
  const { removeFromQueue } = useNetworkStore.getState();

  const results = await Promise.allSettled(
    syncQueue.map(async (mutation: QueuedMutation) => {
      const res = await fetch(apiUrl(`/sync/${mutation.key}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(mutation.payload),
      });
      if (!res.ok) throw new Error(`Sync failed for ${mutation.key}: ${res.status}`);
      return mutation;
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const mutation = result.value;
      removeFromQueue(mutation.id);
      if (mutation.key === "content/feedback") {
        await db.feedbackQueue.delete(mutation.id);
      }
      continue;
    }
    await dropUnrecoverableSyncs(result.reason);
  }
}

async function dropUnrecoverableSyncs(error: unknown): Promise<void> {
  if (!(error instanceof Error)) return;
  const m = /Sync failed for ([\w/]+): (\d+)/.exec(error.message);
  if (!m) return;
  const key = m[1];
  const status = Number(m[2]);
  if (status < 400 || status >= 500) return;
  if (key !== "content/feedback") return;

  const queued = await db.feedbackQueue.toArray();
  for (const f of queued) {
    if (f.parked) continue;
    if (f.retryCount + 1 >= MAX_SYNC_RETRIES) {
      // Stop retrying but keep the item on the device: pending work is never silently discarded.
      await db.feedbackQueue.update(f.id, (entry) => {
        entry.retryCount += 1;
        entry.parked = true;
      });
      useNetworkStore.getState().removeFromQueue(f.id);
    } else {
      await db.feedbackQueue.update(f.id, (entry) => {
        entry.retryCount += 1;
      });
    }
  }
}

// ── Durable queues (survive reloads and app restarts) ───────────────────────

/** Replay queued content feedback that is on disk but no longer in the in-memory queue (e.g. after a reload). */
async function flushFeedbackFromDisk(skipIds: Set<string>): Promise<void> {
  let queued;
  try {
    queued = await db.feedbackQueue.toArray();
  } catch {
    return;
  }
  for (const f of queued) {
    if (f.parked || skipIds.has(f.id)) continue;
    try {
      const body = { ...mapContentFeedback(f.payload), reportedAt: f.createdAt };
      const res = await fetch(apiUrl("/sync/content/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await db.feedbackQueue.delete(f.id);
      } else if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
        await db.feedbackQueue.update(f.id, (entry) => {
          entry.retryCount += 1;
          if (entry.retryCount >= MAX_SYNC_RETRIES) entry.parked = true;
        });
      }
    } catch {
      // offline / transient: stays queued for the next flush
    }
  }
}

/** Store a POST /sync batch before sending it. Returns null when IndexedDB is unavailable (caller then sends directly). */
export async function enqueueEventBatch(events: Array<Record<string, unknown>>): Promise<string | null> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  const id = crypto.randomUUID();
  try {
    await db.eventQueue.put({ id, userId, events, createdAt: Date.now(), attempts: 0, status: "pending" });
    return id;
  } catch {
    return null;
  }
}

export async function removeEventBatch(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await db.eventQueue.delete(id);
  } catch {
    /* ignore */
  }
}

/** Server rejected the batch (4xx): stop retrying but keep it, with the reason. */
export async function parkEventBatch(id: string | null, reason: string): Promise<void> {
  if (!id) return;
  try {
    await db.eventQueue.update(id, (b: QueuedEventBatch) => {
      b.status = "parked";
      b.lastError = reason.slice(0, 200);
    });
  } catch {
    /* ignore */
  }
}

/** Is this error one a retry can never fix? (a validation/authorization rejection, not a network, 401, 408, 429 or 5xx problem) */
export function isPermanentRejection(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && status >= 400 && status < 500 && ![401, 408, 429].includes(status);
}

const REFRESH_KEYS = ["adaptive-state", "dashboard", "account-summary", "sprint", "profile"];

/** Send every pending batch that belongs to the signed-in user. Acked batches are deleted; failures stay queued. */
export async function flushEventQueue(): Promise<number> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId || !useAuthStore.getState().token) return 0;
  let batches: QueuedEventBatch[];
  try {
    batches = await db.eventQueue.where("userId").equals(userId).filter((b) => b.status === "pending").toArray();
  } catch {
    return 0;
  }
  let sent = 0;
  for (const batch of batches) {
    try {
      const { apiPost } = await import("@/services/api");
      await apiPost("/sync", { events: batch.events });
      await db.eventQueue.delete(batch.id);
      sent += 1;
    } catch (err) {
      if (isPermanentRejection(err)) {
        await parkEventBatch(batch.id, err instanceof Error ? err.message : "rejected");
      } else {
        try {
          await db.eventQueue.update(batch.id, (b) => {
            b.attempts += 1;
          });
        } catch {
          /* ignore */
        }
        break; // network/server trouble: try again on the next flush
      }
    }
  }
  if (sent > 0) {
    try {
      const { queryClient } = await import("@/providers/query-provider");
      for (const key of REFRESH_KEYS) void queryClient.invalidateQueries({ queryKey: [key] });
    } catch {
      /* cache refresh is best effort */
    }
  }
  return sent;
}

export async function pendingEventBatchCount(): Promise<number> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return 0;
  try {
    return await db.eventQueue.where("userId").equals(userId).filter((b) => b.status === "pending").count();
  } catch {
    return 0;
  }
}
