import { db } from "./db";
import { useNetworkStore, type QueuedMutation } from "@/stores/network-store";
import { useAuthStore } from "@/stores/auth-store";
import { apiUrl } from "@/lib/platform";

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
  const { syncQueue } = useNetworkStore.getState();
  if (!syncQueue.length) return;

  const { removeFromQueue } = useNetworkStore.getState();
  if (!useAuthStore.getState().token) return;

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
    if (f.retryCount + 1 >= MAX_SYNC_RETRIES) {
      await db.feedbackQueue.delete(f.id);
      useNetworkStore.getState().removeFromQueue(f.id);
    } else {
      await db.feedbackQueue.update(f.id, (entry) => {
        entry.retryCount += 1;
      });
    }
  }
}
