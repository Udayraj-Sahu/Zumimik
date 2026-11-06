import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";


// These suites render the plan screens without a QueryClientProvider (the app always has one at the root): use the bundled pricing.
vi.mock("@/hooks/queries/use-plans", async () => {
  const { STATIC_PRICING } = await import("@/lib/pricing");
  return { usePricedPlans: () => ({ ...STATIC_PRICING, cycle: (requested: "annual" | "monthly") => requested }) };
});
// The carousel reads live dashboard data for the "up next" slide; a non-empty
// list keeps every Arena slide in the flow (Arena 10, Pitch 5).
vi.mock("@/hooks/queries/use-dashboard", () => ({
  useDashboardData: () => ({ data: { upcoming: [{ id: "next-1" }] } }),
}));

import { ArenaIntro } from "@/components/onboarding/intros/arena-intro";
import { PitchIntro } from "@/components/onboarding/intros/pitch-intro";

// jsdom has no Web Animations API; the carousel uses it for the entrance/exit.
beforeAll(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(() => ({
      addEventListener: vi.fn(),
      finished: Promise.resolve(),
      cancel: vi.fn(),
    })) as unknown as typeof Element.prototype.animate;
  }
});

// Slides other than the active one are `aria-hidden`, so include hidden nodes;
// the label filter drops the nested `<article>` cards inside slide bodies.
const slideLabels = () =>
  screen
    .getAllByRole("article", { hidden: true })
    .map((el) => el.getAttribute("aria-label"))
    .filter((label): label is string => /^\d+ of \d+:/.test(label ?? ""));

describe("ArenaIntro", () => {
  it("keeps its ten slides in order", () => {
    render(<ArenaIntro onClose={() => {}} />);

    expect(slideLabels()).toEqual([
      "1 of 10: FIRST 3 SECONDS",
      "2 of 10: FIGHT 1/2",
      "3 of 10: FIGHT 2/2",
      "4 of 10: RANK 1/2",
      "5 of 10: RANK 2/2",
      "6 of 10: RISE 1/2",
      "7 of 10: RISE 2/2",
      "8 of 10: JOIN",
      "9 of 10: REVIEWS",
      "10 of 10: HOW IT WORKS",
    ]);
  });

  it("opens on the first-three-seconds hook", () => {
    render(<ArenaIntro onClose={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Win the first 3 seconds.", hidden: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("lost to stalls")).toBeInTheDocument();
    expect(screen.getByText("after the radar")).toBeInTheDocument();
    expect(screen.queryByText("Race your first ghost")).toBeNull();
  });

  it("tells its story through the Fight, Rank and Rise slides, which the Pitch flow does not have", () => {
    render(<ArenaIntro onClose={() => {}} />);

    const labels = slideLabels().join("|");
    for (const part of ["FIGHT 1/2", "RANK 2/2", "RISE 1/2", "JOIN"]) expect(labels).toContain(part);
    expect(screen.queryByText("TACTICAL FOCUS")).toBeNull();
  });
});

describe("PitchIntro", () => {
  it("opens on the algorithm pitch, first-move times, the sponsor reel, the trap results, the stall timer and the trial timeline", () => {
    render(<PitchIntro onClose={() => {}} />);

    expect(slideLabels()).toEqual([
      "1 of 5: TACTICAL EFFICIENCY",
      "2 of 5: FIRST MOVE",
      "3 of 5: THE TRAP",
      "4 of 5: THE STALL",
      "5 of 5: TRIAL",
    ]);

    expect(screen.getByText("Stop feeding the algorithm.")).toBeInTheDocument();
    expect(screen.getByText("Six hours scrolled. Six minutes that count.")).toBeInTheDocument();
    expect(
      screen.getByText("Free with ads. Works offline. You set the time. We pick the drills."),
    ).toBeInTheDocument();
  });

  it("does not start the stall timer count-up on load", () => {
    render(<PitchIntro onClose={() => {}} />);

    // The overlay portals into document.body, so query the document.
    const timer = screen.getByRole("group", {
      name: "Compare time lost to stalls",
      hidden: true,
    });
    const card = timer.closest("section") as HTMLElement;
    expect(within(card).getByText("0")).toBeInTheDocument();
    expect(within(card).queryByText("9")).toBeNull();
  });

  it("opens on its own hook, not the Arena one", () => {
    render(<PitchIntro onClose={() => {}} />);

    expect(screen.getByRole("heading", { name: "Stop feeding the algorithm.", hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Win the first 3 seconds.", hidden: true })).toBeNull();
  });

  it("has exactly five slides, one per label", () => {
    render(<PitchIntro onClose={() => {}} />);

    expect(slideLabels()).toHaveLength(5);
  });
});
