import type { PlannerDay, PlannerStats } from "@/lib/types/planner";

function day(dateStr: string, label: string, planned: number, completed: number, isToday: boolean): PlannerDay {
  return { date: dateStr, dayLabel: label, planned, completed, isToday };
}

const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function offsetDay(base: Date, offset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function offsetLabel(base: Date, offset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return dayNames[d.getDay()];
}

export const PLANNER_DAYS: PlannerDay[] = [
  day(offsetDay(today, -3), offsetLabel(today, -3), 2, 2, false),
  day(offsetDay(today, -2), offsetLabel(today, -2), 3, 2, false),
  day(offsetDay(today, -1), offsetLabel(today, -1), 2, 2, false),
  day(todayStr, "Today", 3, 1, true),
  day(offsetDay(today, 1), offsetLabel(today, 1), 2, 0, false),
  day(offsetDay(today, 2), offsetLabel(today, 2), 1, 0, false),
  day(offsetDay(today, 3), offsetLabel(today, 3), 2, 0, false),
];

export const PLANNER_STATS: PlannerStats = {
  weekStreak: 3,
  totalPlanned: 15,
  totalCompleted: 7,
  completionRate: 47,
};
