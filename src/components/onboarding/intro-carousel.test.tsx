import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// The carousel reads live dashboard data for the "up next" slide; a non-empty
// list keeps every Arena slide in the flow (Arena 7, Pitch 6: sponsor + 5 Pitch-only).
vi.mock("@/hooks/queries/use-dashboard", () => ({
  useDashboardData: () => ({ data: { upcoming: [{ id: "next-1" }] } }),
}));

import { ArenaIntro } from "@/components/onboarding/arena-intro";
import { PitchIntro } from "@/components/onboarding/pitch-intro";

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
  it("keeps its seven slides in order", () => {
    render(<ArenaIntro onClose={() => {}} />);

    expect(slideLabels()).toEqual([
      "1 of 7: ACTIVE LANES",
      "2 of 7: FEATURES",
      "3 of 7: SPONSOR REEL",
      "4 of 7: SPEED",
      "5 of 7: HABIT",
      "6 of 7: REVIEWS",
      "7 of 7: HOW IT WORKS",
    ]);
  });

  it("keeps the Arena badge and hero heading", () => {
    render(<ArenaIntro onClose={() => {}} />);

    expect(screen.getByText("ARENA")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The arena is live." })).toBeInTheDocument();
  });
});

describe("PitchIntro", () => {
  it("opens on the algorithm pitch, first-move times, the sponsor reel, the trap results, the stall timer and the trial timeline", () => {
    render(<PitchIntro onClose={() => {}} />);

    expect(slideLabels()).toEqual([
      "1 of 6: TACTICAL EFFICIENCY",
      "2 of 6: FIRST MOVE",
      "3 of 6: SPONSOR REEL",
      "4 of 6: THE TRAP",
      "5 of 6: THE STALL",
      "6 of 6: TRIAL",
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

  it("shows the Pitch badge and hero heading instead of the Arena ones", () => {
    render(<PitchIntro onClose={() => {}} />);

    expect(screen.getByText("TACTICAL FOCUS")).toBeInTheDocument();
    expect(screen.queryByText("ARENA")).toBeNull();
    expect(screen.getByRole("heading", { name: "Your focus compounds." })).toBeInTheDocument();
  });

  it("renders one indicator per slide", () => {
    render(<PitchIntro onClose={() => {}} />);

    expect(screen.getAllByRole("button", { name: /Go to slide/ })).toHaveLength(6);
    expect(screen.getByRole("button", { name: /Go to slide 1 of 6/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to slide 6 of 6/ })).toBeInTheDocument();
  });
});
