import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ReviewCarousel } from "@/components/onboarding/slides/review-carousel";

describe("ReviewCarousel", () => {
  it("renders the supporting quote and the aggregate rating", () => {
    render(<ReviewCarousel />);

    expect(screen.getByText(/Arena replaced my scattered note apps/)).toBeInTheDocument();
    expect(screen.getByText("User rating 4.9/5")).toBeInTheDocument();
  });

  it("renders each review once visibly and once as an aria-hidden duplicate", () => {
    render(<ReviewCarousel />);

    expect(screen.getAllByText("Arnav James")).toHaveLength(2);
    expect(screen.getAllByText("Solid with a few quirks")).toHaveLength(2);

    const [visible, duplicate] = screen.getAllByText("Solid with a few quirks");
    expect(visible.closest('[aria-hidden="true"]')).toBeNull();
    expect(duplicate.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("drives the marquee loop duration from the seconds prop", () => {
    const { container, rerender } = render(<ReviewCarousel />);
    const wrap = container.firstElementChild as HTMLElement;

    expect(wrap.style.getPropertyValue("--loop")).toBe("24s");

    rerender(<ReviewCarousel seconds={12} />);
    expect(wrap.style.getPropertyValue("--loop")).toBe("12s");
  });

  it("marks the verified badge icons as decorative", () => {
    const { container } = render(<ReviewCarousel />);

    expect(container.querySelectorAll("svg[aria-hidden]").length).toBeGreaterThan(0);
  });
});
