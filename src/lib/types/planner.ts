export type PlannerDay = {
  date: string;
  dayLabel: string;
  planned: number;
  completed: number;
  isToday: boolean;
};

export type PlannerStats = {
  weekStreak: number;
  totalPlanned: number;
  totalCompleted: number;
  completionRate: number;
};
