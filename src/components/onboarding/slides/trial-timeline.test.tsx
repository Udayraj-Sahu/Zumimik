import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import TrialTimeline from "@/components/onboarding/slides/trial-timeline";
import { STUDENT_REVIEWS } from "@/lib/mock/reviews";

const timeline = () => screen.getByRole("list", { name: "How the free trial works" });
const stepItems = () => within(timeline()).getAllByRole("listitem");
const detailItems = () =>
  within(screen.getByRole("list", { name: "Trial details" })).getAllByRole("listitem");

describe("TrialTimeline", () => {
  it("leads with the subscribe-when-it-works promise", () => {
    render(<TrialTimeline />);

    expect(
      screen.getByRole("heading", { name: "Subscribe when it works!", level: 2 }),
    ).toBeInTheDocument();
  });

  it("lays out the three trial milestones with their hints", () => {
    render(<TrialTimeline />);

    const steps = stepItems();

    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Free trial starts now");
    expect(steps[0]).toHaveTextContent("Full access unlocked");
    expect(steps[1]).toHaveTextContent("Reminder in 5 days");
    expect(steps[2]).toHaveTextContent("First payment in 7 days");
    expect(steps[2]).toHaveTextContent("Billed automatically");
  });

  it("marks the first milestone as the current one", () => {
    render(<TrialTimeline />);

    const steps = stepItems();

    expect(steps[0]).toHaveAttribute("data-now", "true");
    expect(steps[1]).not.toHaveAttribute("data-now");
    expect(steps[2]).not.toHaveAttribute("data-now");
  });

  it("keeps the cancel-before readout on the billing step", () => {
    render(<TrialTimeline />);

    expect(detailItems()[2]).toHaveTextContent(
      "In 7 days: billed automatically unless you cancel before Oct 28.",
    );
  });

  it("accepts a real cancel date from the caller", () => {
    render(<TrialTimeline cancelBy="Nov 3" />);

    expect(detailItems()[2]).toHaveTextContent("unless you cancel before Nov 3.");
  });

  it("shows the trial access, reminder and billing details", () => {
    render(<TrialTimeline />);

    expect(screen.getByText(/Today: every drill, mock and analysis unlocked\./)).toBeInTheDocument();
    expect(
      screen.getByText(/In 5 days: a heads-up email before anything renews\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/In 7 days: billed automatically unless you cancel before/),
    ).toBeInTheDocument();
  });

  it("reuses the shared review carousel for the verified student reviews", () => {
    render(<TrialTimeline />);

    const reviews = screen.getByRole("region", { name: "Student reviews" });

    // The marquee repeats its group once for the seamless loop.
    for (const review of STUDENT_REVIEWS) {
      expect(within(reviews).getAllByText(review.name)).toHaveLength(2);
      expect(within(reviews).getAllByText(review.title)).toHaveLength(2);
      expect(within(reviews).getAllByText(review.text)).toHaveLength(2);
    }

    // The trial card shows the marquee only; the quote + score stay on the reviews slide.
    expect(within(reviews).queryByText("User rating 4.9/5")).not.toBeInTheDocument();
    expect(within(reviews).queryByRole("blockquote")).not.toBeInTheDocument();
    expect(within(reviews).getAllByRole("article", { hidden: true })).toHaveLength(
      STUDENT_REVIEWS.length * 2,
    );
  });

  it("takes custom steps and per-step icons when given", () => {
    render(
      <TrialTimeline
        steps={[
          { title: "Trial on", hint: "Access open", icon: "lock" },
          { title: "Heads-up", hint: "Day 5", icon: "bell" },
          { title: "Billed", hint: "Day 7", icon: "calendar" },
        ]}
      />,
    );

    const steps = stepItems();

    expect(steps).toHaveLength(3);
    expect(within(timeline()).getByText("Trial on")).toBeInTheDocument();
    expect(within(timeline()).getByText("Heads-up")).toBeInTheDocument();
    expect(within(timeline()).getByText("Billed")).toBeInTheDocument();
    expect(within(timeline()).queryByText("Free trial starts now")).not.toBeInTheDocument();
  });
});
