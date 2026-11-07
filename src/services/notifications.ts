import type { NotificationItem } from "@/lib/types/notifications";
import { apiGet } from "./api";
import { mapDashboardEventsToNotifications } from "./backend-adapters";
export async function getNotifications(): Promise<NotificationItem[]> {
  const events = await apiGet<
    Array<{
      title: string;
      time: string;
      tag: string;
    }>
  >("/dashboard/events");
  return mapDashboardEventsToNotifications(events);
}
