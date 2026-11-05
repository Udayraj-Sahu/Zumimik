import type { MasterySnapshot } from "@vmsg/psychometrics";
import { safeLocalStorage } from "@/lib/platform";
import { learnerKeys } from "./storage-keys";

/**
 * The last mastery snapshot this device holds for a learner: the base that offline sessions are replayed on. It is read by the
 * learner service and ADVANCED by the sync queue when a batch is acknowledged, which is why it lives in a module with no service
 * imports (the two would otherwise import each other).
 *
 * Why it must advance: once a batch is acknowledged it leaves the queue, so nothing replays it any more. If this copy still predates
 * that batch, an offline restart would build the learner's state without it. The acknowledged session_end carries the whole picture
 * the session produced (technique_states), which is exactly what the server stored, so it becomes the remembered base.
 */

export function rememberSnapshot(userKey: string, snapshot: MasterySnapshot): void {
  if (!userKey) return;
  try {
    safeLocalStorage.setItem(learnerKeys.snapshot(userKey), JSON.stringify(snapshot));
  } catch {
    /* storage full or unavailable: the next online read still works */
  }
}

export function recallSnapshot(userKey: string): MasterySnapshot | null {
  if (!userKey) return null;
  try {
    const raw = safeLocalStorage.getItem(learnerKeys.snapshot(userKey));
    return raw ? (JSON.parse(raw) as MasterySnapshot) : null;
  } catch {
    return null;
  }
}

function asOfMs(snapshot: MasterySnapshot | null): number {
  const v = snapshot?.as_of;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return -Infinity;
}

/**
 * Make an acknowledged session's picture the remembered base, unless the remembered copy is already newer. Only a snapshot the
 * server accepted may be passed in (the caller skips a rejected session_end).
 */
export function advanceSnapshot(userKey: string, techniqueStates: Record<string, unknown>, atMs: number): void {
  if (!userKey || !Number.isFinite(atMs)) return;
  if (asOfMs(recallSnapshot(userKey)) >= atMs) return;
  rememberSnapshot(userKey, { technique_states: techniqueStates, as_of: atMs });
}
