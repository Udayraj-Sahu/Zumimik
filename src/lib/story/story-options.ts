/**
 * Commitment vocabulary shared by the story form and the voice parser.
 *
 * These live apart from the form component because the parser needs the same
 * slot ids, durations and day order. Keeping one copy stops "30 minutes on my
 * lunch break" from quietly disagreeing with what the card renders.
 */

export type ReclaimSlotId = "Subway Commute" | "Lunch Break" | "Evening Walk";

export type ReclaimTone = "lime" | "cyan" | "fuchsia";

export type ReclaimModuleMeta = {
  id: ReclaimSlotId;
  tone: ReclaimTone;
  slotMin: number;
  sub: string;
};

export const RECLAIM_MODULES: ReclaimModuleMeta[] = [
  { id: "Subway Commute", tone: "lime", slotMin: 10, sub: "Morning & return leg" },
  { id: "Lunch Break", tone: "cyan", slotMin: 15, sub: "Midday refuel" },
  { id: "Evening Walk", tone: "fuchsia", slotMin: 20, sub: "Cool-down laps" },
];

/** Monday-first, matching the native notification weekday mapping in
 *  story-reminders.ts (index 0 -> Monday). */
export const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export const TRIGGER_TYPES = ["Deep Focus Sprint", "Recall Drill", "Mock Test"];

export const slotMinutes = (id: string): number =>
  RECLAIM_MODULES.find((m) => m.id === id)?.slotMin ?? 0;