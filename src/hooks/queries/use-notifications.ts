import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/services/notifications";
import type { NotificationItem } from "@/lib/types/notifications";

export function useNotifications() {
  return useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });
}
