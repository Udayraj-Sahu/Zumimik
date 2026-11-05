import { db } from "./db";
import { syncDeviceId } from "./device-id";
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
  // The id is the batch's first event id, so storing the same batch twice (a retry, or the pre-queue + the send) is one row, not two.
  const id = typeof events[0]?.event_id === "string" ? (events[0].event_id as string) : crypto.randomUUID();
  try {
    const existing = await db.eventQueue.get(id);
    if (existing) return id;
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

/** One event the server will never store, as POST /sync reports it (HTTP 200 with the rest of the batch accepted). */
export type SyncRejection = { event_id: string | null; index?: number; reason?: string };

/** The per-event rejections in a POST /sync response; none when the response carries none (or is not an object). */
export function rejectionsOf(response: unknown): SyncRejection[] {
  const list = (response as { rejected?: unknown } | null | undefined)?.rejected;
  if (!Array.isArray(list)) return [];
  return list.filter((r): r is SyncRejection => !!r && typeof r === "object");
}

/**
 * The server ANSWERED the batch. HTTP 200 does not mean every event was stored: it lists the ones it never will (`rejected`, each with
 * its event_id, index and reason) and says that resending gets the same answer. Those events are not retried and not thrown away:
 * they move, in the same transaction that removes the acknowledged batch, to a parked row that keeps them and the reason, and they
 * never reach the learner's replayed state. Returns how many were parked.
 */
export async function settleAcknowledged(batch: { id: string | null; userId?: string; events: Array<Record<string, unknown>> }, response: unknown): Promise<number> {
  if (!batch.id) return 0;
  const rejected = rejectionsOf(response);
  const ids = new Set(rejected.map((r) => r.event_id).filter((x): x is string => typeof x === "string"));
  const positions = new Set(rejected.map((r) => r.index).filter((x): x is number => typeof x === "number"));
  const refused = batch.events.filter((e, i) => (typeof e.event_id === "string" && ids.has(e.event_id)) || positions.has(i));
  const userId = batch.userId ?? useAuthStore.getState().user?.id ?? "";
  const reasons = [...new Set(rejected.map((r) => r.reason).filter((x): x is string => typeof x === "string"))].join("; ");
  const batchId = batch.id;
  try {
    await db.transaction("rw", db.eventQueue, async () => {
      if (refused.length > 0) {
        await db.eventQueue.put({
          id: `rejected:${batchId}`,
          userId,
          events: refused,
          createdAt: Date.now(),
          attempts: 0,
          status: "parked",
          lastError: (reasons || "rejected by the server").slice(0, 200),
        });
      }
      await db.eventQueue.delete(batchId);
    });
  } catch {
    return 0; // the batch stays queued and is sent again; the server deduplicates by event id
  }
  return refused.length;
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
  // Oldest first: snapshots reach the server in the order they were made (the primary key is a random id, not a time).
  batches.sort((a, b) => a.createdAt - b.createdAt);
  let sent = 0;
  for (const batch of batches) {
    try {
      const { apiPost } = await import("@/services/api");
      const response = await apiPost("/sync", { events: batch.events, device_id: syncDeviceId() });
      await settleAcknowledged(batch, response);
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

/**
 * Deliver the batches queued BEFORE `batchId` (oldest first), best effort. A new session's batch is sent after the ones it
 * follows, so the server receives them in the order they happened. Stops at the first network/server failure, keeps what it
 * could not deliver, and parks a rejected batch (never deletes it).
 */
export async function flushQueuedBefore(batchId: string | null): Promise<number> {
  const userId = useAuthStore.getState().user?.id;
  if (!batchId || !userId || !useAuthStore.getState().token) return 0;
  let batches: QueuedEventBatch[];
  try {
    const own = await db.eventQueue.get(batchId);
    if (!own) return 0;
    batches = await db.eventQueue.where("userId").equals(userId).filter((b) => b.status === "pending" && b.id !== batchId && b.createdAt <= own.createdAt).toArray();
  } catch {
    return 0;
  }
  batches.sort((a, b) => a.createdAt - b.createdAt);
  let sent = 0;
  for (const batch of batches) {
    try {
      const { apiPost } = await import("@/services/api");
      const response = await apiPost("/sync", { events: batch.events, device_id: syncDeviceId() });
      await settleAcknowledged(batch, response);
      sent += 1;
    } catch (err) {
      if (isPermanentRejection(err)) {
        await parkEventBatch(batch.id, err instanceof Error ? err.message : "rejected");
        continue;
      }
      break;
    }
  }
  return sent;
}

/** Events the server has NOT acknowledged yet (queued, not parked), oldest batch first. Parked batches were rejected and are excluded. */
export async function pendingEvents(): Promise<Array<Record<string, unknown>>> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return [];
  try {
    const batches = await db.eventQueue.where("userId").equals(userId).filter((b) => b.status === "pending").toArray();
    batches.sort((a, b) => a.createdAt - b.createdAt);
    return batches.flatMap((b) => b.events);
  } catch {
    return [];
  }
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
