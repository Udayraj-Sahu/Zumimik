import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import FirstMoveTimes from "@/components/first-move-times/FirstMoveTimes";

describe("FirstMoveTimes", () => {
  it("renders the heading, subtitle and chart caption", () => {
    render(<FirstMoveTimes />);

    expect(screen.getByRole("heading", { name: "It times your first move." })).toBeInTheDocument();
    expect(screen.getByText("Every question. To the tenth of a second.")).toBeInTheDocument();
    expect(screen.getByText("Seconds before the first move, per question")).toBeInTheDocument();
  });

  it("counts stalls and sums the elapsed seconds above the threshold", () => {
    render(<FirstMoveTimes times={[1, 3, 4]} threshold={2.5} />);

    expect(screen.getByText("2 stalls.")).toBeInTheDocument();
    expect(screen.getByText("7.0s gone.")).toBeInTheDocument();
  });

  it("labels the chart for assistive tech and shows a tooltip per question", () => {
    const { container } = render(<FirstMoveTimes times={[1.4, 3.1]} threshold={2.5} />);

    expect(screen.getByRole("img", { name: "1 stalls out of 2 questions" })).toBeInTheDocument();
    expect(container.querySelector('[title="Q1: 1.4s"]')).toBeInTheDocument();
    expect(container.querySelector('[title="Q2: 3.1s"]')).toBeInTheDocument();
  });

  it("stays safe for empty arrays and invalid numbers", () => {
    render(<FirstMoveTimes times={[]} />);
    expect(screen.getByText("0 stalls.")).toBeInTheDocument();
    expect(screen.getByText("0.0s gone.")).toBeInTheDocument();
  });

  it("shows the legend", () => {
    render(<FirstMoveTimes />);
    expect(screen.getByText("On pace")).toBeInTheDocument();
    expect(screen.getByText("Stall")).toBeInTheDocument();
  });
});
