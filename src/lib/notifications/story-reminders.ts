import type { StoryCommitment } from "@/lib/types/onboarding";

async function isNativePlatform(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

const isTime = (v: string) => /^(\d{1,2}):(\d{2})$/.test(v ?? "");

const capWeekday = (idx: number) => ((idx + 1) % 7) + 1; // 1=Sunday … 7=Saturday

async function ensurePermission(): Promise<boolean> {
  if (await isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display === "granted") return true;
      const req = await LocalNotifications.requestPermissions();
      return req.display === "granted";
    } catch {
      return false;
    }
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function cancelStoryNotifications() {
  if (!(await isNativePlatform())) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications
      .filter((n) => n.extra?.source === "story-reminder")
      .map((n) => n.id);
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    }
  } catch {
    /* ignore */
  }
}

function webOneShot(title: string, body: string, time: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m || !("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  const target = new Date();
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();
  setTimeout(() => {
    new Notification(title, { body, icon: "/favicon.svg", badge: "/favicon.svg", tag: "story-reminder" });
  }, delay);
}

export type StoryNotificationResult = {
  requested: boolean;
  granted: boolean;
  scheduled: boolean;
};

export async function applyStoryNotifications(
  commitment: StoryCommitment,
): Promise<StoryNotificationResult> {
  const reminder = isTime(commitment.reminderTime) ? commitment.reminderTime : null;
  const trigger = isTime(commitment.triggerTime) ? commitment.triggerTime : null;
  if (!reminder && !trigger) return { requested: false, granted: false, scheduled: false };

  const granted = await ensurePermission();
  if (!granted) return { requested: true, granted: false, scheduled: false };

  const selectedDays = (commitment.reclaimConfigs?.[commitment.reclaimSlot]?.days ?? commitment.weekDays)
    .map((on, i) => (on ? capWeekday(i) : null))
    .filter((d): d is number => d !== null);
  const allDays = selectedDays.length >= 7;

  if (await isNativePlatform()) {
    try {
      await cancelStoryNotifications();
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const notifications = [];
      const base = (id: number, time: string) => {
        const [h, m] = time.split(":").map(Number);
        const entries = [];
        for (const day of allDays ? [null] : selectedDays) {
          entries.push({
            id,
            title: "Zuzumik",
            body:
              id === 2001
                ? `Prep time — ${commitment.dailyMinutes ?? 30} min today. Let's go.`
                : `Trigger: ${commitment.triggerType || "Focus"} — start now.`,
            schedule: {
              on: { hour: h, minute: m, ...(day ? { weekday: day } : {}) },
              allowWhileIdle: true,
            },
            extra: { source: "story-reminder" },
          });
          id += 1;
        }
        return entries;
      };
      if (reminder) notifications.push(...base(2001, reminder));
      if (trigger) notifications.push(...base(3001, trigger));
      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
      return { requested: true, granted: true, scheduled: true };
    } catch {
      return { requested: true, granted: true, scheduled: false };
    }
  }

  if (reminder) webOneShot("Zuzumik", `Prep time — ${commitment.dailyMinutes ?? 30} min today.`, reminder);
  if (trigger) webOneShot("Zuzumik", `Trigger: ${commitment.triggerType || "Focus"} — start now.`, trigger);
  return { requested: true, granted: true, scheduled: true };
}