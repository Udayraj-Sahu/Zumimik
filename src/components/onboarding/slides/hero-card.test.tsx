import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HeroCard } from "@/components/onboarding/slides/hero-card";

describe("HeroCard", () => {
  it("renders the default hero copy", () => {
    render(<HeroCard />);

    expect(screen.getByRole("heading")).toHaveTextContent("Unfair prep. Zero friction.");
    expect(screen.getByText("Engineered for 99+ %ile.")).toBeInTheDocument();
    expect(
      screen.getByText(/Neon Dojo automates your daily drill volume/),
    ).toBeInTheDocument();
  });

  it("lets callers override the title, accent and body", () => {
    render(<HeroCard title="Ready" accent="Set" body="Go" />);

    expect(screen.getByRole("heading")).toHaveTextContent("Ready");
    expect(screen.getByText("Set")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("hides the decorative diagonal line from assistive tech", () => {
    const { container } = render(<HeroCard />);
    const line = container.querySelector("[aria-hidden]");

    expect(line).not.toBeNull();
  });
});
