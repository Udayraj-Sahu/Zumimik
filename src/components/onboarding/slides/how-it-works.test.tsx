import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HowItWorks } from "@/components/onboarding/slides/how-it-works";

describe("HowItWorks", () => {
  it("renders the header defaults and the title as a heading", () => {
    render(<HowItWorks />);

    expect(screen.getByText("05")).toBeInTheDocument();
    expect(screen.getByText("Process")).toBeInTheDocument();
    expect(screen.getByText("3-step loop")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "A lightweight habit that turns daily play into lasting cognitive growth.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all three process steps", () => {
    render(<HowItWorks />);

    expect(screen.getByText("1. Play")).toBeInTheDocument();
    expect(screen.getByText("A worksheet or 5-minute game.")).toBeInTheDocument();
    expect(screen.getByText("2. Scan")).toBeInTheDocument();
    expect(screen.getByText("One tap to read the results.")).toBeInTheDocument();
    expect(screen.getByText("3. Improve")).toBeInTheDocument();
    expect(
      screen.getByText("Tomorrow's play targets the weakest skill, every day."),
    ).toBeInTheDocument();
  });

  it("renders the three footer compliance badges", () => {
    render(<HowItWorks />);

    expect(screen.getByText("DPDP & COPPA compliant")).toBeInTheDocument();
    expect(screen.getByText("Ad-free")).toBeInTheDocument();
    expect(screen.getByText("Olympiad-style problems")).toBeInTheDocument();
  });

  it("honours the header prop overrides", () => {
    render(
      <HowItWorks index="07" label="Flow" loopLabel="Daily cycle" title="The loop" subtitle="Sub" />,
    );

    expect(screen.getByText("07")).toBeInTheDocument();
    expect(screen.getByText("Flow")).toBeInTheDocument();
    expect(screen.getByText("Daily cycle")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The loop" })).toBeInTheDocument();
  });

  it("marks every icon as decorative for assistive tech", () => {
    const { container } = render(<HowItWorks />);

    expect(container.querySelectorAll("svg[aria-hidden]")).toHaveLength(6);
  });
});
