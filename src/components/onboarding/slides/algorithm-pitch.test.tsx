import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import AlgorithmPitch from "@/components/onboarding/slides/algorithm-pitch";

describe("AlgorithmPitch", () => {
  it("renders the heading, subtitle and both statistics", () => {
    render(<AlgorithmPitch />);

    expect(screen.getByRole("heading", { name: "Stop feeding the algorithm." })).toBeInTheDocument();
    expect(screen.getByText("Six hours scrolled. Six minutes that count.")).toBeInTheDocument();

    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("scrolled, nothing kept")).toBeInTheDocument();
    expect(screen.getByText("6 min")).toBeInTheDocument();
    expect(screen.getByText("ranked, faster tomorrow")).toBeInTheDocument();
  });

  it("renders all three points and the supporting copy", () => {
    render(<AlgorithmPitch />);

    expect(
      screen.getByText("Your feed trains you to scroll. We train you to think."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Social feeds take your attention. We hand it back."),
    ).toBeInTheDocument();
    expect(screen.getByText("Cheap dopamine fades. Faster hands don’t.")).toBeInTheDocument();
    expect(
      screen.getByText("Free with ads. Works offline. You set the time. We pick the drills."),
    ).toBeInTheDocument();
  });

  it("hides the decorative point dots from assistive tech", () => {
    const { container } = render(<AlgorithmPitch />);
    expect(container.querySelectorAll("i[aria-hidden='true']")).toHaveLength(3);
  });
});
