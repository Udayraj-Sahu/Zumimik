export type NotificationItem = {
  id: string;
  type: "sprint_reminder" | "achievement" | "challenge" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
};
