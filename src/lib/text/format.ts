/**
 * Shared date/time formatting helpers. These were previously copy-pasted into
 * five page modules; keep new call sites importing from here.
 */

/** Seconds → compact clock, e.g. `12:05`, `0:47`. */
export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Seconds → human chunk, e.g. `2h 5m`, `45m`. */
export function formatHoursMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Minutes → human chunk, e.g. `45 min`, `1 hour`, `2 hr 5 min`. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} hr ${m} min`;
}

/** Local calendar day as `YYYY-MM-DD` (UTC-based, matches habit log keys). */
export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
