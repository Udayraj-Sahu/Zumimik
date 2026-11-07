import { apiPost } from "./api";
import { isNativeRuntime } from "@/lib/native/is-native";
import { safeLocalStorage } from "@/lib/platform";

/**
 * Hub check-in: POST /location/checkin { hub_id, latitude, longitude }. Standing within 20 m of one of your hubs earns double XP for
 * an hour (backend flag `location_gamification`). The server checks the coordinates and drops them. A refusal (not a member, too far,
 * feature off) comes back as an ApiError whose message is shown as is.
 */
export async function checkInToHub(hubId: string, latitude: number, longitude: number): Promise<void> {
  await apiPost("/location/checkin", { hub_id: hubId, latitude, longitude });
}

export type PositionFailure = "denied" | "unavailable" | "timeout" | "unsupported";

export class PositionError extends Error {
  constructor(public reason: PositionFailure) {
    super(reason);
    this.name = "PositionError";
  }
}

/**
 * The device position, asked for only when the learner taps Check in. The browser (web) or the Android/iOS WebView shows the system
 * permission prompt on the first call.
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new PositionError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) =>
        reject(new PositionError(err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export function positionMessage(reason: PositionFailure): string {
  switch (reason) {
    case "denied":
      return "Location is turned off for Zuzumik. Allow it in your browser or phone settings, then try again.";
    case "timeout":
      return "Couldn't get your location in time. Move to open sky or check your connection, then try again.";
    case "unsupported":
      return "This device can't share its location.";
    default:
      return "Couldn't work out where you are. Turn on location services and try again.";
  }
}

const ASKED_KEY = "zuzumik-location-asked";

/**
 * The installed app asks for location permission once, when it starts, so the Duel never has to interrupt a player later. The
 * position itself is thrown away: reading it is what makes Android show its permission dialog. A browser is never asked up front.
 */
export function requestLocationPermissionOnce(): void {
  if (!isNativeRuntime() || typeof navigator === "undefined" || !navigator.geolocation) return;
  try {
    if (safeLocalStorage.getItem(ASKED_KEY)) return;
    safeLocalStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* storage unavailable: ask anyway */
  }
  navigator.geolocation.getCurrentPosition(
    () => {},
    () => {},
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 },
  );
}

const RETRY_AFTER_MS = 5 * 60 * 1000;
let lastAttemptAt = 0;

/** Whether the position may be read without showing a prompt: always in the app (asked at start), only if already allowed in a browser. */
async function canReadPositionQuietly(): Promise<boolean> {
  if (isNativeRuntime()) return true;
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return status?.state === "granted";
  } catch {
    return false;
  }
}

/**
 * Tells the backend where the player is when they start a duel, so a hub member standing at their hub earns double XP. It never
 * blocks or interrupts anything: no UI, and every failure (no permission, no GPS, too far from the hub, feature off) is dropped.
 * The hubs are tried in turn until one accepts; a recent attempt is not repeated for a few minutes.
 */
export async function silentHubCheckIn(hubIds: string[]): Promise<void> {
  if (hubIds.length === 0) return;
  const now = Date.now();
  if (now - lastAttemptAt < RETRY_AFTER_MS) return;
  lastAttemptAt = now;
  try {
    if (!(await canReadPositionQuietly())) return;
    const { latitude, longitude } = await getCurrentPosition();
    for (const id of hubIds) {
      try {
        await checkInToHub(id, latitude, longitude);
        return;
      } catch {
        /* not at this hub: try the next */
      }
    }
  } catch {
    /* no position: nothing to send */
  }
}

/** Test hook: forget the last attempt. */
export function resetSilentCheckInThrottle(): void {
  lastAttemptAt = 0;
}
