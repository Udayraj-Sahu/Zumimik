import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { sendSyncBatch } from "@/services/telemetry";
import { flushEventQueue } from "./sync";
import { syncDeviceId } from "./device-id";
import { useAuthStore } from "@/stores/auth-store";

const apiPost = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiPost: (...a: unknown[]) => apiPost(...a) }));

const EVENTS = [{ event_id: "e1", event_type: "session_end", client_timestamp: Date.now(), metadata: {} }];

describe("the device id sent with every sync", () => {
  beforeEach(async () => {
    apiPost.mockReset().mockResolvedValue({ accepted: 1, rejected: [] });
    localStorage.clear();
    await db.eventQueue.clear();
    useAuthStore.setState({ user: { id: "u1", name: "A", email: "a@x.com", role: "user" }, token: "t", isAuthenticated: true });
  });

  it("is created once, stays the same, and is short enough for the server's column", () => {
    const first = syncDeviceId();
    expect(first).toBeTruthy();
    expect(first!.length).toBeLessThanOrEqual(100);
    expect(syncDeviceId()).toBe(first);
    expect(localStorage.getItem("zuzumik:device-id")).toBe(first);
  });

  it("two installs of the same learner get different ids", () => {
    const a = syncDeviceId();
    localStorage.clear(); // a different browser profile or phone
    expect(syncDeviceId()).not.toBe(a);
  });

  it("travels with a direct send and with the background flush, so the server can keep each device's snapshot apart", async () => {
    await sendSyncBatch(EVENTS);
    const id = syncDeviceId();
    expect((apiPost.mock.calls[0] as unknown as [string, { device_id: string }])[1].device_id).toBe(id);

    apiPost.mockRejectedValueOnce(new Error("offline"));
    await sendSyncBatch([{ ...EVENTS[0], event_id: "e2" }]);
    apiPost.mockClear();
    await flushEventQueue();
    expect((apiPost.mock.calls[0] as unknown as [string, { device_id: string }])[1].device_id).toBe(id);
  });

  it("survives logout and account switches (it names the install, not the person)", async () => {
    const id = syncDeviceId();
    const { resetAppState } = await import("@/lib/platform");
    await resetAppState();
    expect(syncDeviceId()).toBe(id);
  });
});
