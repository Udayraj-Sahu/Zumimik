import type { ReclaimConfig, StoryCommitment } from "@/lib/types/onboarding";
import { DAILY_TIME_OPTIONS } from "@/lib/types/onboarding";
import {
  DAY_LABELS,
  TRIGGER_TYPES,
  slotMinutes,
  type ReclaimSlotId,
} from "@/lib/story/story-options";

export type VoiceParse = {
  patch: Partial<StoryCommitment>;
  /** Short chips describing what was understood, so a misheard phrase is
   *  visible before the user trusts the form. */
  labels: string[];
};

const SLOT_KEYWORDS: { id: ReclaimSlotId; words: readonly string[] }[] = [
  {
    id: "Subway Commute",
    words: ["commute", "subway", "metro", "train", "bus", "travel", "cab ride"],
  },
  { id: "Lunch Break", words: ["lunch", "midday", "noon", "lunchtime"] },
  {
    id: "Evening Walk",
    words: ["evening", "walk", "stroll", "after dinner", "cool down", "cooldown"],
  },
];

const WEEKDAY_WORDS: { word: string; index: number }[] = [
  { word: "monday", index: 0 },
  { word: "mon", index: 0 },
  { word: "tuesday", index: 1 },
  { word: "tues", index: 1 },
  { word: "tue", index: 1 },
  { word: "wednesday", index: 2 },
  { word: "wed", index: 2 },
  { word: "thursday", index: 3 },
  { word: "thu", index: 3 },
  { word: "fridays", index: 4 },
  { word: "friday", index: 4 },
  { word: "fri", index: 4 },
  { word: "saturday", index: 5 },
  { word: "sat", index: 5 },
  { word: "sunday", index: 6 },
  { word: "sun", index: 6 },
];

const pad = (n: number) => String(n).padStart(2, "0");

const hhmm = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

const to12h = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
};

/** dailyMinutes is edited through a Stepper over DAILY_TIME_OPTIONS, so a
 *  spoken "25" has to land on an option the form can actually render. */
const snapMinutes = (raw: number) => {
  const clamped = Math.min(240, Math.max(5, raw));
  return DAILY_TIME_OPTIONS.reduce((best, option) =>
    Math.abs(option - clamped) < Math.abs(best - clamped) ? option : best,
  );
};

const detectSlot = (text: string): ReclaimSlotId | null => {
  for (const entry of SLOT_KEYWORDS) {
    if (entry.words.some((word) => text.includes(word))) return entry.id;
  }
  return null;
};

const detectMinutes = (text: string): number | null => {
  const numeric = /(\d{1,3})\s*(?:minutes?|mins?)\b/.exec(text);
  if (numeric) return snapMinutes(Number(numeric[1]));
  if (/\bhalf an hour\b/.test(text)) return 30;
  if (/\b(?:an|one) hour\b/.test(text)) return 60;
  return null;
};

type Clock = { hour: number; minute: number };

/** A bare hour with no am/pm is read against how people actually talk about
 *  study times: "at 6" is almost always evening, not dawn. */
const toClock = (hour: number, minute: number, meridiem: string | undefined): Clock | null => {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  const marker = meridiem?.[0]?.toLowerCase();
  if (marker === "p") {
    if (hour < 1 || hour > 12) return null;
    return { hour: hour === 12 ? 12 : hour + 12, minute };
  }
  if (marker === "a") {
    if (hour < 1 || hour > 12) return null;
    return { hour: hour === 12 ? 0 : hour, minute };
  }
  if (hour < 0 || hour > 23) return null;
  if (hour >= 1 && hour <= 6) return { hour: hour + 12, minute };
  return { hour, minute };
};

const MERIDIEM_TIME = /\b(?:at|around|by)?\s*(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/gi;
const COLON_TIME = /\b(?:at|around|by)?\s*(\d{1,2}):([0-5]\d)\b/g;
const BARE_HOUR = /\b(?:at|around|by)\s*(\d{1,2})\b/gi;

/** Times actually spoken, in order. Deliberately narrow: a plain "30 minutes"
 *  must never be read as 30:00, so every pattern needs an am/pm marker, a
 *  colon, or an explicit preposition. */
const collectTimes = (text: string): Clock[] => {
  const taken: { start: number; end: number }[] = [];
  const found: { at: number; clock: Clock }[] = [];

  const overlaps = (index: number, length: number) =>
    taken.some((t) => index < t.end && t.start < index + length);

  for (const re of [MERIDIEM_TIME, COLON_TIME]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (overlaps(match.index, match[0].length)) continue;
      taken.push({ start: match.index, end: match.index + match[0].length });
      const clock = toClock(Number(match[1]), match[2] ? Number(match[2]) : 0, match[3]);
      if (clock) found.push({ at: match.index, clock });
    }
  }

  BARE_HOUR.lastIndex = 0;
  let bare: RegExpExecArray | null;
  while ((bare = BARE_HOUR.exec(text)) !== null) {
    if (overlaps(bare.index, bare[0].length)) continue;
    taken.push({ start: bare.index, end: bare.index + bare[0].length });
    const clock = toClock(Number(bare[1]), 0, undefined);
    if (clock) found.push({ at: bare.index, clock });
  }

  return found.sort((a, b) => a.at - b.at).map((f) => f.clock);
};

/** "from 8 to 9" / "8:30 till 9:30" — the window the preset lives in. */
const parseWindowPair = (text: string): { window: string; start: Clock } | null => {
  const re =
    /\b(?:from\s*)?(\d{1,2})(?::([0-5]\d))?\s*(?:to|until|till|-|–|—)\s*(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const meridiem = match[5];
    // Require a real clock time on at least one side so "2 to 3 sprints" is
    // not mistaken for a window.
    if (!meridiem && !match[2] && !match[4]) continue;
    const start = toClock(Number(match[1]), match[2] ? Number(match[2]) : 0, meridiem);
    const end = toClock(Number(match[3]), match[4] ? Number(match[4]) : 0, meridiem);
    if (!start || !end) continue;
    if (end.hour * 60 + end.minute <= start.hour * 60 + start.minute) continue;
    return {
      window: `${hhmm(start.hour, start.minute)} - ${hhmm(end.hour, end.minute)}`,
      start,
    };
  }
  return null;
};

const detectDays = (text: string): boolean[] | null => {
  if (/\b(?:every ?day|daily|all days|each day)\b/.test(text)) return DAY_LABELS.map(() => true);
  if (/\bweekends?\b/.test(text)) return DAY_LABELS.map((_, i) => i >= 5);
  if (/\bweek ?days\b|\bmonday to friday\b|\bmon to fri\b|\bworking days\b/.test(text)) {
    return DAY_LABELS.map((_, i) => i < 5);
  }
  const picked = new Set<number>();
  for (const { word, index } of WEEKDAY_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(text)) picked.add(index);
  }
  if (picked.size === 0) return null;
  return DAY_LABELS.map((_, i) => picked.has(i));
};

const detectTrigger = (text: string): string | null =>
  TRIGGER_TYPES.find((t) => text.includes(t.toLowerCase())) ?? null;

const describeDays = (days: boolean[]): string => {
  const on = days.filter(Boolean).length;
  if (on === days.length) return "Every day";
  if (on === 0) return "No days";
  if (on === 5 && days.slice(0, 5).every(Boolean)) return "Weekdays";
  if (on === 2 && days.slice(5).every(Boolean)) return "Weekends";
  return `${on} day${on === 1 ? "" : "s"}/week`;
};

const currentWindow = (current: StoryCommitment, slot: string) =>
  current.reclaimConfigs?.[slot]?.window ?? current.reclaimWindow ?? "00:00 - 00:00";

/**
 * Turns one spoken phrase into a patch for the story form. Every rule is
 * additive and independent, so a partial phrase updates only what it clearly
 * said and leaves the rest of the commitment alone.
 *
 * `current` is required rather than optional: reclaimConfigs is a record keyed
 * by slot, and a patch that carried a whole new map would drop the windows and
 * cadence the user had already set on the other two presets.
 */
export function parseCommitmentSpeech(raw: string, current: StoryCommitment): VoiceParse {
  const text = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const patch: Partial<StoryCommitment> = {};
  const labels: string[] = [];
  if (!text) return { patch, labels };

  const slot = detectSlot(text);
  const minutes = detectMinutes(text);
  const days = detectDays(text);
  const triggerType = detectTrigger(text);
  const windowPair = parseWindowPair(text);
  const times = collectTimes(text);

  if (minutes !== null) {
    patch.dailyMinutes = minutes;
    labels.push(`${minutes} min/day`);
  }

  if (slot) {
    patch.reclaimSlot = slot;
    labels.push(slot);
  }

  if (days) {
    patch.weekDays = days;
    labels.push(describeDays(days));
  }

  if (triggerType) {
    patch.triggerType = triggerType;
    labels.push(triggerType);
  }

  if (windowPair) {
    patch.reclaimWindow = windowPair.window;
    labels.push(`Window ${to12h(windowPair.window.slice(0, 5))}`);
  }

  if (times.length > 0) {
    const [first, second] = times;
    const wantsReminder = /\b(remind|reminder|alarm|nudge)\b/.test(text);
    const wantsTrigger = /\b(trigger|start|begin)\b/.test(text);

    if (wantsReminder) {
      patch.reminderTime = hhmm(first.hour, first.minute);
      labels.push(`Reminder ${to12h(patch.reminderTime)}`);
      if (second) {
        patch.triggerTime = hhmm(second.hour, second.minute);
        labels.push(`Trigger ${to12h(patch.triggerTime)}`);
      }
    } else if (wantsTrigger) {
      patch.triggerTime = hhmm(first.hour, first.minute);
      labels.push(`Trigger ${to12h(patch.triggerTime)}`);
    } else if (slot && !windowPair) {
      // A time with a slot but no range means "start my lunch break at 1", so
      // the end comes from the preset's own length rather than a second number.
      const endMin = Math.min(24 * 60 - 1, first.hour * 60 + first.minute + slotMinutes(slot));
      const startText = hhmm(first.hour, first.minute);
      const endText = hhmm(Math.floor(endMin / 60), endMin % 60);
      patch.reclaimWindow = `${startText} - ${endText}`;
      labels.push(`Starts ${to12h(startText)}`);
    } else {
      patch.reminderTime = hhmm(first.hour, first.minute);
      labels.push(`Reminder ${to12h(patch.reminderTime)}`);
    }
  }

  // Only rewrite the spoken slot, and only when it gained something. The other
  // two presets keep whatever the user already configured.
  if (slot && (days || windowPair)) {
    const configs: Record<string, ReclaimConfig> = { ...(current.reclaimConfigs ?? {}) };
    configs[slot] = {
      window: patch.reclaimWindow ?? currentWindow(current, slot),
      days: days ?? configs[slot]?.days ?? current.weekDays,
    };
    patch.reclaimConfigs = configs;
  }

  return { patch, labels };
}

/** A phrase that changed nothing is worth saying out loud rather than silently
 *  leaving the form untouched. */
export const isEmptyVoiceParse = (parse: VoiceParse) => parse.labels.length === 0;

export const VOICE_EXAMPLE = "30 minutes on my lunch break, weekdays, remind me at 1 pm";