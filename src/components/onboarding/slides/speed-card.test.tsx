import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SpeedCard } from "@/components/onboarding/slides/speed-card";

describe("SpeedCard", () => {
  it("renders the default speed copy", () => {
    render(<SpeedCard />);

    expect(screen.getByRole("heading")).toHaveTextContent("Automated habit. Compounded speed.");
    expect(screen.getByText("1.2s / calculation")).toBeInTheDocument();
    expect(screen.getByText("(-0.4s)")).toBeInTheDocument();
    expect(screen.getByText("Decay shield: active")).toBeInTheDocument();
  });

  it("reflects the seconds and delta props", () => {
    render(<SpeedCard seconds={0.8} delta={0.6} progress={0.9} />);

    expect(screen.getAllByText("0.8s").length).toBeGreaterThan(0);
    expect(screen.getByText("0.8s / calculation")).toBeInTheDocument();
    expect(screen.getByText("(-0.6s)")).toBeInTheDocument();
  });

  it("hides the ring from assistive tech", () => {
    const { container } = render(<SpeedCard />);

    expect(container.querySelector("svg[aria-hidden]")).not.toBeNull();
  });
});
