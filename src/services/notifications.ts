import type { NotificationItem } from "@/lib/types/notifications";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getNotifications(): Promise<NotificationItem[]> {
  if (IS_MOCK) {
    const { NOTIFICATIONS } = await import("@/lib/mock/notifications");
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    return NOTIFICATIONS;
  }
  return apiGet<NotificationItem[]>("/notifications");
}
