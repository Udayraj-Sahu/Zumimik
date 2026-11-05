import { safeLocalStorage } from "@/lib/platform";

const KEY = "zuzumik:device-id";
/** POST /sync stores device_id in a VARCHAR(100) and ignores a longer one. */
const MAX = 100;

/**
 * A stable id for this install (browser profile or Android app), sent with every POST /sync batch.
 * The backend keeps each device's latest mastery snapshot and then picks, per technique, the entry with the latest practice, so two
 * devices of one learner merge instead of the newest snapshot overwriting the other's progress. Without an id every device looks
 * like the same one and only the single newest snapshot would count. Not personal data: it names the install, not the person, and
 * it survives logout and account switches.
 */
export function syncDeviceId(): string | undefined {
  try {
    const existing = safeLocalStorage.getItem(KEY);
    if (existing && existing.length <= MAX) return existing;
    const created = crypto.randomUUID();
    safeLocalStorage.setItem(KEY, created);
    return created;
  } catch {
    return undefined; // storage unavailable: sync still works, the server just cannot tell this device apart
  }
}
