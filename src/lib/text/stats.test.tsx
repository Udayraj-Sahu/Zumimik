import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { HistoryEntry } from "@/lib/types/history";
import { ExamDateModal } from "@/components/dashboard/exam-date-modal";
import { computeRecent, computeStreak } from "@/lib/text";
import { useOnboardingStore } from "@/stores/onboarding-store";

vi.mock("gsap", () => ({
  default: { fromTo: vi.fn(), from: vi.fn(), to: vi.fn() },
}));

if (typeof Element !== "undefined" && typeof Element.prototype.scrollTo !== "function") {
  Element.prototype.scrollTo = () => {};
}

const DAY = 86_400_000;
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const T0 = new Date(2031, 2, 15, 10, 0, 0);

const isoOfLocal = (y: number, m: number, d: number, h = 0, min = 0, s = 0) =>
  new Date(y, m, d, h, min, s).toISOString();

const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const isoOfDateObj = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const pickerLabel = (d: Date) => `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

const entry = (completedAt: string): HistoryEntry => ({
  id: "t",
  topic: "ps",
  topicLabel: "PS",
  difficulty: "Beginner",
  score: 1,
  total: 1,
  accuracy: 100,
  xpEarned: 10,
  totalTimeSpent: 60,
  completedAt,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("date & time edge cases", () => {
  it("1. date picker: opens 90 days ahead by default and confirms that ISO", () => {
    const onConfirm = vi.fn();
    render(<ExamDateModal open onConfirm={onConfirm} onClose={vi.fn()} />);

    const expected = new Date(T0.getTime() + 90 * DAY);
    expect(screen.getByText(pickerLabel(expected))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set date" }));
    expect(onConfirm).toHaveBeenCalledWith(isoOfDateObj(expected));
  });

  it("2. invalid date: a day larger than the target month snaps to the month's last day (Feb 31 -> Feb 28)", () => {
    const onConfirm = vi.fn();
    render(<ExamDateModal open initialValue="2031-03-15" onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "31" }));
    fireEvent.click(screen.getByRole("button", { name: "Feb" }));

    expect(screen.getByText("Feb 28, 2031")).toBeInTheDocument();
  });

  it("2b. invalid date: a 31 in any 30-day month snaps to 30 (Apr 31 -> Apr 30)", () => {
    const onConfirm = vi.fn();
    render(<ExamDateModal open initialValue="2031-03-15" onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "31" }));
    fireEvent.click(screen.getByRole("button", { name: "Apr" }));

    expect(screen.getByText("Apr 30, 2031")).toBeInTheDocument();
  });

  it("2c. invalid date: the non-existent 2023-02-29 rolls to March 1 per the JS Date spec", () => {
    const d = new Date("2023-02-29T12:00:00.000Z");
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCDate()).toBe(1);

    vi.setSystemTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0));
    expect(computeStreak([entry(d.toISOString())]).current).toBe(1);
  });

  it("3. minimum date: a date in the past is rejected with the future-date error", () => {
    const onConfirm = vi.fn();
    render(<ExamDateModal open initialValue="2020-05-05" onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Set date" }));
    expect(screen.getByText(/Pick a future date/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("3b. minimum date: today itself is rejected (exam date must be strictly after today)", () => {
    const onConfirm = vi.fn();
    const todayIso = isoOfDateObj(new Date(T0));
    render(<ExamDateModal open initialValue={todayIso} onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Set date" }));
    expect(screen.getByText(/Pick a future date/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("3c. minimum date: a clearly future date passes validation and confirms its ISO", () => {
    const onConfirm = vi.fn();
    const futureIso = isoOfDateObj(new Date(T0.getTime() + 45 * DAY));
    render(<ExamDateModal open initialValue={futureIso} onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Set date" }));
    expect(onConfirm).toHaveBeenCalledWith(isoOfDateObj(new Date(futureIso)));
  });

  it("4. maximum date: the year column offers the current year through current + 5, and no further", () => {
    const onConfirm = vi.fn();
    render(<ExamDateModal open onConfirm={onConfirm} onClose={vi.fn()} />);

    const yearButtons = screen
      .getAllByRole("button")
      .map((b) => b.textContent ?? "")
      .filter((t) => /^\d{4}$/.test(t));

    const nowYear = new Date(T0).getFullYear();
    for (let i = 0; i <= 5; i++) {
      expect(yearButtons).toContain(String(nowYear + i));
    }
    expect(yearButtons).not.toContain(String(nowYear + 6));
  });

  it("5. same start/end time: an equal from/to pair is stored as-entered; forced +15 min clamping lives in the UI layer (story-intro.tsx clampWindow)", () => {
    const hoop = useOnboardingStore.getState();
    hoop.setReclaimWindow("08:30 - 08:30");
    expect(useOnboardingStore.getState().reclaimWindow).toBe("08:30 - 08:30");
  });

  it("6. start > end time: a cross-midnight pair (22:30 -> 00:30) is stored as-entered; UI caps the window at 23:45", () => {
    const hoop = useOnboardingStore.getState();
    hoop.setReclaimWindow("22:30 - 00:30");
    expect(useOnboardingStore.getState().reclaimWindow).toBe("22:30 - 00:30");
  });

  it("7. timezone: streak day keys are derived from the device-local calendar day of the ISO instant", () => {
    const instant = new Date(Date.UTC(2024, 6, 1, 0, 30));
    const local = new Date(instant);
    const localKey = dateKey(local);
    const utcKey = `2024-6-1`;

    if (utcKey !== localKey) {
      expect(localKey).not.toBe(utcKey);
    }

    const onLocalDay = new Date(local.getFullYear(), local.getMonth(), local.getDate(), 12, 0);
    vi.setSystemTime(onLocalDay);
    expect(computeStreak([entry(instant.toISOString())]).current).toBe(1);
  });

  it("8. midnight: two entries on the same local day (00:01 and 23:59) count once, not twice", () => {
    const entries = [
      entry(isoOfLocal(2031, 2, 15, 0, 1)),
      entry(isoOfLocal(2031, 2, 15, 23, 59)),
    ];
    expect(computeStreak(entries).current).toBe(1);
  });

  it("8b. midnight: a 23:59 entry and the next day's 00:01 entry are two distinct streak days", () => {
    vi.setSystemTime(new Date(2031, 2, 16, 10, 0, 0));
    const entries = [
      entry(isoOfLocal(2031, 2, 15, 23, 59)),
      entry(isoOfLocal(2031, 2, 16, 0, 1)),
    ];
    expect(computeStreak(entries).current).toBe(2);
  });

  it("8c. midnight: relative time reports sub-minute activity as 'Just now'", () => {
    vi.setSystemTime(new Date(2031, 2, 15, 12, 0, 0));
    const time = computeRecent([entry(new Date(2031, 2, 15, 11, 59, 45).toISOString())])[0].time;
    expect(time).toBe("Just now");
  });

  it("9. month boundary: a streak tolerates the Jan 31 -> Feb 1 transition", () => {
    const entries = [
      entry(isoOfLocal(2031, 0, 30)),
      entry(isoOfLocal(2031, 0, 31)),
      entry(isoOfLocal(2031, 1, 1)),
    ];
    vi.setSystemTime(new Date(2031, 1, 1, 23, 59));
    expect(computeStreak(entries).current).toBe(3);
  });

  it("9b. month boundary: relative time crosses a month edge with plain day math", () => {
    vi.setSystemTime(new Date(2031, 2, 2, 12, 0, 0));
    const time = computeRecent([entry(isoOfLocal(2031, 1, 28, 12, 0, 0))])[0].time;
    expect(time).toBe("2d ago");
  });

  it("10. year boundary: a streak spans Dec 31 -> Jan 1 without a reset", () => {
    const entries = [
      entry(isoOfLocal(2030, 11, 30)),
      entry(isoOfLocal(2030, 11, 31)),
      entry(isoOfLocal(2031, 0, 1)),
    ];
    vi.setSystemTime(new Date(2031, 0, 1, 8, 0));
    expect(computeStreak(entries).current).toBe(3);
  });

  it("11. leap year: Feb 29 exists as a real, distinct streak day in 2032", () => {
    const entries = [
      entry(isoOfLocal(2032, 1, 28)),
      entry(isoOfLocal(2032, 1, 29)),
    ];
    vi.setSystemTime(new Date(2032, 1, 29, 12, 0));
    expect(computeStreak(entries).current).toBe(2);
  });

  it("11b. leap year: the date picker offers 29 days in February 2032 and snaps 31 to 29", () => {
    const onConfirm = vi.fn();
    render(<ExamDateModal open initialValue="2032-03-15" onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "31" }));
    fireEvent.click(screen.getByRole("button", { name: "Feb" }));

    expect(screen.getByText("Feb 29, 2032")).toBeInTheDocument();
  });

  it("12. past date: entries older than the 7-day streak window do not extend the current streak", () => {
    const entries = [
      entry(isoOfLocal(2030, 11, 30)),
      entry(isoOfLocal(2031, 0, 3)),
    ];
    vi.setSystemTime(new Date(2031, 0, 10, 12, 0));
    expect(computeStreak(entries).current).toBe(0);
  });

  it("12b. past date: relative time buckets far-past activity into 'Nd ago' and 'Yesterday'", () => {
    vi.setSystemTime(new Date(2031, 2, 15, 12, 0, 0));
    expect(computeRecent([entry(isoOfLocal(2031, 1, 13, 12, 0, 0))])[0].time).toBe("30d ago");
    expect(computeRecent([entry(isoOfLocal(2031, 2, 13, 12, 0, 0))])[0].time).toBe("2d ago");
    expect(computeRecent([entry(isoOfLocal(2031, 2, 14, 11, 0, 0))])[0].time).toBe("Yesterday");
  });

  it("13. future date: future-dated entries never inflate the current streak", () => {
    const entries = [entry(isoOfLocal(2031, 2, 20))];
    vi.setSystemTime(new Date(2031, 2, 15, 12, 0));
    expect(computeStreak(entries).current).toBe(0);
  });

  it("13b. future date: the picker defaults to +90 days for the countdown", () => {
    const expected = new Date(T0.getTime() + 90 * DAY);
    render(<ExamDateModal open onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(pickerLabel(expected))).toBeInTheDocument();
  });
});