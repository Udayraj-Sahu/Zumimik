import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adaptive = vi.fn();
const plan = vi.fn();
const summary = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/queries/use-adaptive", () => ({
  useAdaptiveState: () => adaptive(),
  useTodayPlan: () => plan(),
}));
vi.mock("@/hooks/queries/use-account-summary", () => ({ useAccountSummary: () => summary() }));

const STATE = {
  domain: "cat",
  topics: [
    { id: "nikhilam", name: "nikhilam", color: "#fff", mastery: 90, attempts: 12, currentStreak: 9, bestStreak: 9, status: "MASTERED" },
    { id: "vinculum", name: "vinculum", color: "#fff", mastery: 10, attempts: 2, currentStreak: 0, bestStreak: 2, status: "ACTIVE" },
  ],
  lastSession: null,
};

async function renderDashboard(mock: boolean) {
  vi.resetModules();
  const { AdaptiveDashboard } = await import("./adaptive-dashboard");
  return render(<AdaptiveDashboard domain="cat" />);
}

describe("adaptive stats come from real /dashboard data", () => {
  beforeEach(() => {
    localStorage.clear();
    adaptive.mockReturnValue({ data: STATE });
    plan.mockReturnValue({ data: { weakTopic: null, practice: null, mock: null, timeBudget: [] } });
  });

  it("Daily Streak is the real streak in days (not a topic's answer streak) and Time Spent is unknown, not 0h", async () => {
    summary.mockReturnValue({ data: { streakDays: 5, xp: 1, questions: 10, rank: null, accuracy: 70, speed: 12, percentile: 50 } });
    const view = await renderDashboard(false);
    const text = view.container.textContent ?? "";
    expect(text).toContain("Daily Streak");
    expect(text).toContain("5 days");
    expect(text).not.toContain("9 days"); // topic bestStreak must not be shown as a day streak
    expect(text).not.toMatch(/Time Spent\s*0h/);
    expect(text).toContain("Time Spent--");
  });

  it("with no measured streak it shows '--' rather than a number", async () => {
    summary.mockReturnValue({ data: undefined });
    const view = await renderDashboard(false);
    const text = view.container.textContent ?? "";
    expect(text).toContain("Daily Streak--");
    expect(text).not.toContain("8.4");
  });
});
