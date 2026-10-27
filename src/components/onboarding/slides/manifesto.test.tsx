import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Manifesto from "@/components/onboarding/slides/manifesto";

describe("Manifesto", () => {
  it("renders the three statements and the default caption", () => {
    render(<Manifesto />);

    expect(
      screen.getByText("Stop letting TikTok lobotomize you. Reclaim your focus."),
    ).toBeInTheDocument();
    expect(screen.getByText("Social feeds steal potential. We build it.")).toBeInTheDocument();
    expect(screen.getByText("Escape the matrix of cheap dopamine.")).toBeInTheDocument();

    expect(
      screen.getByText(
        "Free adaptive learning with ads. Works seamlessly offline. You configure the time, our tutor handles practice, revision, and new topics.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps one hidden tone icon per statement, in cyan / mint / violet order", () => {
    const { container } = render(<Manifesto />);

    const icons = [...container.querySelectorAll("li > span")];

    expect(icons).toHaveLength(3);
    expect(icons.map((el) => el.className)).toEqual([
      expect.stringContaining("cyan"),
      expect.stringContaining("mint"),
      expect.stringContaining("violet"),
    ]);
    expect(container.querySelectorAll("li > span > [aria-hidden='true']")).toHaveLength(3);
  });

  it("accepts a caption override", () => {
    render(<Manifesto caption="Custom caption" />);

    expect(screen.getByText("Custom caption")).toBeInTheDocument();
  });
});
