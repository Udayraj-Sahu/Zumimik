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

class ZuzumikDB extends Dexie {
  dashboardCache!: Table<DashboardCache, string>;
  feedbackQueue!: Table<QueuedFeedback, string>;
  eventQueue!: Table<QueuedEventBatch, string>;

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
  }
}

export const db = new ZuzumikDB();
