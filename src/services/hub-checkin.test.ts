import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const apiPost = vi.hoisted(() => vi.fn());
vi.mock("./api", () => ({ apiPost: (...a: unknown[]) => apiPost(...a) }));
const native = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/native/is-native", () => ({ isNativeRuntime: () => native.on }));

import { requestLocationPermissionOnce, resetSilentCheckInThrottle, silentHubCheckIn } from "./hub-checkin";

const getCurrentPosition = vi.fn();
function setPositionOk() {
  getCurrentPosition.mockImplementation((ok: (p: unknown) => void) => ok({ coords: { latitude: 28.6, longitude: 77.2 } }));
}

describe("hub check-in services", () => {
  beforeEach(() => {
    apiPost.mockReset();
    getCurrentPosition.mockReset();
    resetSilentCheckInThrottle();
    localStorage.clear();
    native.on = false;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: vi.fn().mockResolvedValue({ state: "prompt" }) } });
  });
  afterEach(() => vi.restoreAllMocks());

  describe("requestLocationPermissionOnce", () => {
    it("asks once when the installed app starts, and not again on the next start", () => {
      native.on = true;
      requestLocationPermissionOnce();
      requestLocationPermissionOnce();
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    });
    it("never asks in a browser", () => {
      requestLocationPermissionOnce();
      expect(getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  describe("silentHubCheckIn", () => {
    it("does nothing for a player with no hub", async () => {
      native.on = true;
      setPositionOk();
      await silentHubCheckIn([]);
      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(apiPost).not.toHaveBeenCalled();
    });
    it("in the app, sends the position for the player's hub", async () => {
      native.on = true;
      setPositionOk();
      apiPost.mockResolvedValue({});
      await silentHubCheckIn(["h1"]);
      expect(apiPost).toHaveBeenCalledWith("/location/checkin", { hub_id: "h1", latitude: 28.6, longitude: 77.2 });
    });
    it("tries the next hub when one refuses, and stops at the first that accepts", async () => {
      native.on = true;
      setPositionOk();
      apiPost.mockRejectedValueOnce(new Error("too far")).mockResolvedValueOnce({});
      await silentHubCheckIn(["h1", "h2", "h3"]);
      expect(apiPost).toHaveBeenCalledTimes(2);
      expect(apiPost).toHaveBeenLastCalledWith("/location/checkin", { hub_id: "h2", latitude: 28.6, longitude: 77.2 });
    });
    it("never throws or prompts: a refused permission or a failing backend is swallowed", async () => {
      native.on = true;
      getCurrentPosition.mockImplementation((_ok: unknown, err: (e: unknown) => void) => err({ code: 1 }));
      await expect(silentHubCheckIn(["h1"])).resolves.toBeUndefined();
      expect(apiPost).not.toHaveBeenCalled();
    });
    it("in a browser, stays silent unless location is already allowed (it must not trigger a prompt)", async () => {
      setPositionOk();
      await silentHubCheckIn(["h1"]);
      expect(getCurrentPosition).not.toHaveBeenCalled();
      resetSilentCheckInThrottle();
      Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: vi.fn().mockResolvedValue({ state: "granted" }) } });
      apiPost.mockResolvedValue({});
      await silentHubCheckIn(["h1"]);
      expect(apiPost).toHaveBeenCalledWith("/location/checkin", { hub_id: "h1", latitude: 28.6, longitude: 77.2 });
    });
    it("does not repeat an attempt within a few minutes", async () => {
      native.on = true;
      setPositionOk();
      apiPost.mockResolvedValue({});
      await silentHubCheckIn(["h1"]);
      await silentHubCheckIn(["h1"]);
      expect(apiPost).toHaveBeenCalledTimes(1);
    });
  });
});
