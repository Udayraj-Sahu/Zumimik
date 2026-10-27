import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import CompoundChart from "@/components/onboarding/slides/compound-chart";
import styles from "@/components/onboarding/slides/compound-chart.module.css";

/** Forces the reduced-motion branch so the count-up resolves synchronously. */
function withReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string): MediaQueryList =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

const card = (el: HTMLElement) => el.querySelector("section") as HTMLElement;

describe("CompoundChart", () => {
  it("stays in its initial state while the slide is not active", () => {
    const { container } = render(<CompoundChart isActive={false} />);

    expect(card(container).className).not.toContain(styles.play);
    expect(container.textContent).toContain("+0%");
    expect(container.textContent).not.toContain("+312%");
  });

  it("draws in and counts up when it becomes active", () => {
    withReducedMotion();
    const { container, rerender } = render(<CompoundChart isActive={false} />);

    rerender(<CompoundChart isActive />);

    expect(card(container).className).toContain(styles.play);
    expect(container.textContent).toContain("+312%");
  });

  it("resets and replays on each new entry", () => {
    withReducedMotion();
    const { container, rerender } = render(<CompoundChart isActive={false} />);

    rerender(<CompoundChart isActive />);
    expect(container.textContent).toContain("+312%");

    rerender(<CompoundChart isActive={false} />);
    expect(container.textContent).toContain("+0%");
    expect(card(container).className).not.toContain(styles.play);

    rerender(<CompoundChart isActive />);
    expect(container.textContent).toContain("+312%");
  });

  it("namespaces the gradient ids so concurrent charts never collide", () => {
    const { container } = render(
      <>
        <CompoundChart />
        <CompoundChart />
      </>,
    );

    const gradients = [...container.querySelectorAll("linearGradient")];
    const ids = gradients.map((g) => g.id);

    expect(gradients).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    expect(ids.every((id) => /^cc-(stroke|fill)-[a-zA-Z0-9]+$/.test(id))).toBe(true);
  });

  it("keeps the chart description and both series labels", () => {
    const { getByRole, getByText } = render(<CompoundChart />);

    expect(getByRole("img").getAttribute("aria-label")).toBe(
      "Line chart: Neon Dojo routine grows exponentially while Traditional rote drill stays nearly flat. Day 30: 4.8x capacity.",
    );
    expect(getByText("Neon Dojo routine")).toBeInTheDocument();
    expect(getByText("Traditional rote drill")).toBeInTheDocument();
  });
});
