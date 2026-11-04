export type HabitCategory = "auto" | "manual";

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: HabitCategory;
  createdAt: string;
  reminderTime?: string;
  reminderDays?: number[];
};

export type HabitLog = {
  habitId: string;
  date: string;
  completed: boolean;
};

export type HabitStats = {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number;
};

export type HabitWithLog = Habit & {
  todayCompleted: boolean;
  streak: number;
};
