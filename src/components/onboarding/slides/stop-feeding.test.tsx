import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import StopFeeding from "@/components/onboarding/slides/stop-feeding";

describe("StopFeeding", () => {
  it("renders the default copy, tagline and both statistic cards", () => {
    render(<StopFeeding />);

    expect(screen.getByText("Stop feeding")).toBeInTheDocument();
    expect(screen.getByText("The algorithm")).toBeInTheDocument();
    expect(screen.getByText("Tactical efficiency")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /6h wasted/i })).toBeInTheDocument();
    expect(screen.getByText("Brain rot / High fatigue")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /Razor\s*focus/i })).toBeInTheDocument();
    expect(screen.getByText("The weapon / High ROI")).toBeInTheDocument();
  });

  it("lets callers override the heading lines and tagline", () => {
    render(<StopFeeding line1="Stop chasing" line2="The noise" tagline="Sharp focus" />);

    expect(screen.getByText("Stop chasing")).toBeInTheDocument();
    expect(screen.getByText("The noise")).toBeInTheDocument();
    expect(screen.getByText("Sharp focus")).toBeInTheDocument();
  });

  it("hides the decorative statistic icons from assistive tech", () => {
    const { container } = render(<StopFeeding />);
    const icons = container.querySelectorAll("svg[aria-hidden='true']");

    expect(icons).toHaveLength(2);
  });
});
