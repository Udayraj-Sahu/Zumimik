export type FocusMode = "sleep" | "sprint";

export type ReclaimConfig = {
  window: string;
  days: boolean[];
};

export type StoryCommitment = {
  dailyMinutes: number | null;
  reminderTime: string;
  reclaimSlot: string;
  reclaimWindow: string;
  triggerType: string;
  triggerTime: string;
  weekDays: boolean[];
  reclaimConfigs?: Record<string, ReclaimConfig>;
};

export type PlanId = "initiate" | "single-lane" | "dual-lane";

export type VedicUseCaseId = "kid" | "speed" | "exam" | "brain-gym";

export type DrillId = "speed-math" | "lightning-di" | "verbal-sprint" | "logical-reflex";

export const DRILLS: { id: DrillId; label: string; desc: string }[] = [
  { id: "speed-math", label: "Speed Math", desc: "Vedic shortcuts, timed reps" },
  { id: "lightning-di", label: "Lightning DI", desc: "Data interpretation under pressure" },
  { id: "verbal-sprint", label: "Verbal Sprint", desc: "RC + para-jumbles, timed" },
  { id: "logical-reflex", label: "Logical Reflex", desc: "LR pattern recognition" },
];

export const VEDIC_USE_CASES: { id: VedicUseCaseId; label: string; desc: string }[] = [
  { id: "kid", label: "Teaching My Kid", desc: "Guided teaching journey" },
  { id: "speed", label: "Lightning Mental Calc", desc: "Speed + accuracy training" },
  { id: "exam", label: "Competitive Exam", desc: "Speed under exam conditions" },
  { id: "brain-gym", label: "Brain Gym", desc: "Daily mental workout" },
];

export const REMINDER_TIMES = ["07:00", "13:00", "19:00", "22:00"];

export const DAILY_TIME_OPTIONS = [15, 30, 45, 60, 90];

export const PLANS: {
  id: PlanId;
  name: string;
  desc: string;
  lanes: number;
  price: string;
  cadence: string;
  billing: Record<"annual" | "monthly", number>;
  badge?: string;
  /** Free-trial length from the backend (GET /billing/plans). Absent for bundled/mock pricing. */
  trialDays?: number;
  tracks?: string[];
  extra?: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: "initiate",
    name: "Free",
    desc: "Ad-free drills · 1 active segment",
    lanes: 1,
    price: "Free",
    cadence: "forever",
    billing: { annual: 0, monthly: 0 },
    features: ["1 drill per day", "Daily streak tracking", "Basic leaderboard"],
  },
  {
    id: "single-lane",
    name: "Pro",
    desc: "Full adaptive engine for one exam",
    lanes: 1,
    price: "₹399",
    cadence: "/month",
    billing: { annual: 3990, monthly: 399 },
    features: [
      "Unlimited drills, one exam track",
      "Full adaptive engine",
      "Weekly performance report",
    ],
  },
  {
    id: "dual-lane",
    name: "Dual Lane Access",
    desc: "Build your study stack",
    lanes: 2,
    price: "₹649",
    cadence: "/month",
    billing: { annual: 6490, monthly: 649 },
    badge: "MOST POPULAR",
    tracks: ["CAT (Verbal & Quant)", "GMAT Fast-Track"],
    extra: "Prepare for two or more exams",
    features: [
      "Two exam tracks in parallel",
      "Priority drill matching",
      "1:1 mentor check-ins",
    ],
    highlight: true,
  },
];