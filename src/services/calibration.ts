import { safeLocalStorage } from "@/lib/platform";
import type { CalibrationRecord, WarmupDraft } from "@/lib/learning/calibration";
import { loadLearnerStates } from "./learner";
import { learnerKeys } from "@/lib/learning/storage-keys";
import { needsCalibration } from "@/lib/learning/calibration";
/**
 * The warm-up's result and its in-progress draft, kept on this device per learner so they survive a reload or an app restart.
 * The server has no place for either yet (users.active_path and the priors have no write route), so this is the learner's record;
 * the result is also sent once as a calibration_completed event with the warm-up session.
 */
const RECORD_KEY = learnerKeys.calibration;
const DRAFT_KEY = learnerKeys.warmupDraft;
function read<T>(key: string): T | null {
  try {
    const raw = safeLocalStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): void {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
export function loadCalibration(userKey: string): CalibrationRecord | null {
  if (!userKey) return null;
  const r = read<CalibrationRecord>(RECORD_KEY(userKey));
  return r && (r.status === "completed" || r.status === "partial" || r.status === "skipped")
    ? r
    : null;
}
export function saveCalibration(userKey: string, record: CalibrationRecord): void {
  if (userKey) write(RECORD_KEY(userKey), record);
}
export function loadWarmupDraft(userKey: string): WarmupDraft | null {
  if (!userKey) return null;
  const d = read<WarmupDraft>(DRAFT_KEY(userKey));
  return d && Array.isArray(d.questions) && Array.isArray(d.attempts) ? d : null;
}
export function saveWarmupDraft(userKey: string, draft: WarmupDraft): void {
  if (userKey) write(DRAFT_KEY(userKey), draft);
}
export function clearWarmupDraft(userKey: string): void {
  if (!userKey) return;
  try {
    safeLocalStorage.removeItem(DRAFT_KEY(userKey));
  } catch {}
}
export type WarmupOffer = "start" | "resume" | "none";
/**
 * Should the app offer the warm-up now?
 *   resume - a draft exists and the warm-up was not finished or skipped;
 *   start  - the learner is new (the server has no mastery for them) and never completed or skipped it;
 *   none   - everyone else: completed, skipped, an established learner, demo mode, or history that cannot be read.
 */
export async function getWarmupOffer(userKey: string): Promise<WarmupOffer> {
  if (!userKey) return "none";
  const record = loadCalibration(userKey);
  if (record && record.status !== "partial") return "none";
  if (loadWarmupDraft(userKey)) return "resume";
  const states = await loadLearnerStates(userKey);
  return needsCalibration(record, states) ? "start" : "none";
}
