import { create } from "zustand";
import { AMBER, CTA_LIME, CYAN, ROSE, VIOLET_PURPLE } from "@/lib/theme";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/lib/platform";
import { todayStr } from "@/lib/text";
import type { Habit, HabitLog, HabitStats, HabitWithLog } from "@/lib/types/habit-tracker";

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function subtractDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

const DEFAULT_HABITS: Habit[] = [
  { id: "h1", name: "Complete a sprint", icon: "Zap", color: CTA_LIME, category: "auto", createdAt: "2026-08-01" },
  { id: "h2", name: "Practice speed math", icon: "Calculator", color: CYAN, category: "manual", createdAt: "2026-08-01" },
  { id: "h3", name: "Read for 20 min", icon: "BookOpen", color: VIOLET_PURPLE, category: "manual", createdAt: "2026-08-01" },
  { id: "h4", name: "Review flashcards", icon: "CreditCard", color: AMBER, category: "auto", createdAt: "2026-08-01" },
  { id: "h5", name: "Solve 10 questions", icon: "Target", color: ROSE, category: "manual", createdAt: "2026-08-01" },
];

const SEED_LOGS: HabitLog[] = (() => {
  const logs: HabitLog[] = [];
  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = subtractDays(today, i);
    const ds = dateStr(d);
    DEFAULT_HABITS.forEach((h) => {
      const hash = (h.id.charCodeAt(1) * 31 + d.getDate() * 17 + d.getMonth() * 7) % 100;
      const threshold = h.category === "auto" ? 65 : 45;
      if (hash < threshold) {
        logs.push({ habitId: h.id, date: ds, completed: true });
      }
    });
  }
  return logs;
})();

type HabitState = {
  habits: Habit[];
  logs: HabitLog[];
  addHabit: (name: string, icon: string, color: string) => void;
  removeHabit: (id: string) => void;
  toggleLog: (habitId: string, date?: string) => void;
  setReminder: (habitId: string, time: string | undefined, days?: number[]) => void;
  getTodayLogs: () => string[];
  getHabitsWithToday: () => HabitWithLog[];
  getStreak: (habitId: string) => number;
  getStats: () => HabitStats;
  getLogsForDate: (date: string) => string[];
  getLogsForMonth: (year: number, month: number) => Record<string, number>;
  reset: () => void;
};

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: DEFAULT_HABITS,
      logs: SEED_LOGS,

      addHabit: (name, icon, color) => {
        const id = `h${Date.now()}`;
        set((s) => ({
          habits: [...s.habits, { id, name, icon, color, category: "manual" as const, createdAt: todayStr() }],
        }));
      },

      removeHabit: (id) => {
        set((s) => ({
          habits: s.habits.filter((h) => h.id !== id),
          logs: s.logs.filter((l) => l.habitId !== id),
        }));
      },

      toggleLog: (habitId, date) => {
        const ds = date ?? todayStr();
        set((s) => {
          const existing = s.logs.find((l) => l.habitId === habitId && l.date === ds);
          if (existing) {
            return { logs: s.logs.filter((l) => !(l.habitId === habitId && l.date === ds)) };
          }
          return { logs: [...s.logs, { habitId, date: ds, completed: true }] };
        });
      },

      setReminder: (habitId, time, days) => {
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === habitId
              ? { ...h, reminderTime: time, ...(days ? { reminderDays: days } : {}) }
              : h,
          ),
        }));
      },

      getTodayLogs: () => {
        const today = todayStr();
        return get().logs.filter((l) => l.date === today && l.completed).map((l) => l.habitId);
      },

      getHabitsWithToday: () => {
        const today = todayStr();
        const todayIds = new Set(
          get().logs.filter((l) => l.date === today && l.completed).map((l) => l.habitId),
        );
        return get().habits.map((h) => ({
          ...h,
          todayCompleted: todayIds.has(h.id),
          streak: get().getStreak(h.id),
        }));
      },

      getStreak: (habitId) => {
        const logs = get().logs.filter((l) => l.habitId === habitId && l.completed);
        const dates = new Set(logs.map((l) => l.date));
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = subtractDays(today, i);
          if (dates.has(dateStr(d))) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }
        return streak;
      },

      getStats: () => {
        const logs = get().logs.filter((l) => l.completed);
        const dates = new Set(logs.map((l) => l.date));
        let bestStreak = 0;
        let current = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          if (dates.has(dateStr(subtractDays(today, i)))) {
            current++;
            bestStreak = Math.max(bestStreak, current);
          } else {
            current = 0;
          }
        }
        const thirtyAgo = subtractDays(today, 30);
        const recentLogs = logs.filter((l) => l.date >= dateStr(thirtyAgo));
        const totalHabits = get().habits.length;
        const expectedMax = totalHabits * 30;
        const completionRate = expectedMax > 0 ? Math.round((recentLogs.length / expectedMax) * 100) : 0;
        return {
          currentStreak: current,
          bestStreak,
          totalCompletions: logs.length,
          completionRate: Math.min(100, completionRate),
        };
      },

      getLogsForDate: (date) => {
        return get().logs.filter((l) => l.date === date && l.completed).map((l) => l.habitId);
      },

      getLogsForMonth: (year, month) => {
        const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
        const monthLogs = get().logs.filter((l) => l.date.startsWith(prefix) && l.completed);
        const byDate: Record<string, number> = {};
        monthLogs.forEach((l) => {
          byDate[l.date] = (byDate[l.date] || 0) + 1;
        });
        return byDate;
      },

      reset: () => set({ habits: DEFAULT_HABITS, logs: SEED_LOGS }),
    }),
    {
      name: "zuzumik-habits",
      storage: createJSONStorage(() => safeLocalStorage),
    },
  ),
);
