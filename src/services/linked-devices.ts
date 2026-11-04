import type { LinkedDevice } from "@/lib/types/linked-devices";
import { apiGet, apiPost } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getLinkedDevices(): Promise<LinkedDevice[]> {
  if (IS_MOCK) {
    const { LINKED_DEVICES } = await import("@/lib/mock/linked-devices");
    const { delay } = await import("@/lib/mock/delay");

    await delay(250);
    return LINKED_DEVICES;
  }
  return apiGet<LinkedDevice[]>("/pairing/sessions", {
    headers: { Accept: "application/json" },
  });
}

export async function revokeDevice(deviceId: string): Promise<void> {
  if (IS_MOCK) {
    const { delay } = await import("@/lib/mock/delay");

    await delay(300);
    return;
  }
  await apiPost<void>(`/pairing/session/${deviceId}/revoke`, {});
}