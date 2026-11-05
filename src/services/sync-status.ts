import { db } from "./offline/db";

/** What the learner is told about their progress reaching the server. Read from the real queue on this device. */
export type SyncStatusKind = "synced" | "syncing" | "offline" | "pending" | "attention";

export type QueueCounts = {
  pendingBatches: number;
  pendingEvents: number;
  /** Batches the server refused for good (a parked batch is kept on the device, never deleted). */
  parkedBatches: number;
  parkedEvents: number;
  /** The server's reasons for those, shortened, without repeats. The server never echoes the offending values. */
  reasons: string[];
};

export const EMPTY_COUNTS: QueueCounts = { pendingBatches: 0, pendingEvents: 0, parkedBatches: 0, parkedEvents: 0, reasons: [] };

/**
 * One status from the facts, most urgent first:
 *   syncing   - a batch is being sent right now;
 *   offline   - the device has no connection (queued work waits, nothing is lost);
 *   attention - the server refused some events for good: they are kept and need a look;
 *   pending   - events are queued and will be sent;
 *   synced    - nothing is waiting.
 */
export function deriveSyncKind(f: { online: boolean; syncing: boolean; pendingEvents: number; parkedEvents: number }): SyncStatusKind {
  if (f.syncing) return "syncing";
  if (!f.online) return "offline";
  if (f.parkedEvents > 0) return "attention";
  if (f.pendingEvents > 0) return "pending";
  return "synced";
}

const SHORT = 120;

/** The queue as it stands for one learner. Unreadable storage reads as an empty queue (nothing is claimed, nothing is touched). */
export async function readQueueCounts(userId: string): Promise<QueueCounts> {
  if (!userId) return EMPTY_COUNTS;
  try {
    const batches = await db.eventQueue.where("userId").equals(userId).toArray();
    const pending = batches.filter((b) => b.status === "pending");
    const parked = batches.filter((b) => b.status === "parked");
    const reasons = [...new Set(parked.map((b) => (b.lastError ?? "Rejected by the server").slice(0, SHORT)))];
    return {
      pendingBatches: pending.length,
      pendingEvents: pending.reduce((n, b) => n + b.events.length, 0),
      parkedBatches: parked.length,
      parkedEvents: parked.reduce((n, b) => n + b.events.length, 0),
      reasons,
    };
  } catch {
    return EMPTY_COUNTS;
  }
}
