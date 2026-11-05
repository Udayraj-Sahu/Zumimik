import Dexie, { type Table } from "dexie";
import type { ContentFeedbackRequest } from "@/lib/types/content-feedback";

export interface DashboardCache {
  id: string;
  data: unknown;
  updatedAt: number;
  trustStatus?: string;
  ttl?: number;
}

export interface QueuedFeedback {
  id: string;
  payload: ContentFeedbackRequest;
  createdAt: number;
  retryCount: number;
  /** Stopped retrying after repeated server rejections. Kept on the device (never silently deleted). */
  parked?: boolean;
}

/** One POST /sync batch. The event ids are fixed at creation, so re-sending is idempotent on the backend. */
export interface QueuedEventBatch {
  id: string;
  /** Owner. A batch is only ever sent while the same user is signed in. */
  userId: string;
  events: Array<Record<string, unknown>>;
  createdAt: number;
  attempts: number;
  status: "pending" | "parked";
  lastError?: string;
}

/**
 * One row per technique per finished session in which the learner's mastery label for it changed (or appeared for the first time).
 * Written from the learner-state pipeline's own before/after states, never reconstructed from the current snapshot, so the timeline only
 * contains what really happened on this device from the day it was introduced. The id (session id + technique) makes a repeat a no-op.
 */
export interface MasteryHistoryRow {
  id: string;
  userId: string;
  skill: string;
  /** Device time of the session end (UNIX ms). */
  at: number;
  sessionId: string;
  /** Undefined when the learner had no history with the technique before this session. */
  before?: "fractured" | "fragile" | "fluid";
  after: "fractured" | "fragile" | "fluid";
  engineVersion?: number;
}

class ZuzumikDB extends Dexie {
  dashboardCache!: Table<DashboardCache, string>;
  feedbackQueue!: Table<QueuedFeedback, string>;
  eventQueue!: Table<QueuedEventBatch, string>;
  masteryHistory!: Table<MasteryHistoryRow, string>;

  constructor() {
    super("ZuzumikDB");
    this.version(2).stores({
      dashboardCache: "id, updatedAt, trustStatus",
      feedbackQueue: "id, createdAt, retryCount",
    });
    this.version(3).stores({
      dashboardCache: "id, updatedAt, trustStatus",
      feedbackQueue: "id, createdAt, retryCount",
      eventQueue: "id, userId, createdAt, status",
    });
    this.version(4).stores({
      dashboardCache: "id, updatedAt, trustStatus",
      feedbackQueue: "id, createdAt, retryCount",
      eventQueue: "id, userId, createdAt, status",
      masteryHistory: "id, userId, [userId+skill], at",
    });
  }
}

export const db = new ZuzumikDB();
