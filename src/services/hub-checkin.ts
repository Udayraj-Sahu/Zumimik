import { apiPost } from "./api";

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
