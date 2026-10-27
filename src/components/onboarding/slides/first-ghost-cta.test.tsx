import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import FirstGhostCta, { type FirstGhostCtaProps } from "./first-ghost-cta";
import styles from "./first-ghost-cta.module.css";

const PROPS: FirstGhostCtaProps = {
  title: "Win the first 3 seconds.",
  tagline: "Quant. LRDI. VARC. One arena.",
  stats: [
    { value: "9 min", label: "lost to stalls", tone: "bad" },
    { value: "3 min", label: "after the radar", tone: "good" },
  ],
  points: [
    "Know exactly where your seconds leak.",
    "See the trap that fooled the field.",
    "Race the ghost until you're the benchmark.",
  ],
  note: "Works offline. Sample data shown.",
};

describe("FirstGhostCta", () => {
  it("renders the hook copy, both stats and the three promises", () => {
    render(<FirstGhostCta {...PROPS} />);

    expect(screen.getByRole("heading", { name: "Win the first 3 seconds." })).toBeInTheDocument();
    expect(screen.getByText("Quant. LRDI. VARC. One arena.")).toBeInTheDocument();

    ["9 min", "3 min"].forEach((value) =>
      expect(screen.getByText(value)).toBeInTheDocument(),
    );
    expect(screen.getByText("lost to stalls")).toBeInTheDocument();
    expect(screen.getByText("after the radar")).toBeInTheDocument();

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Know exactly where your seconds leak.")).toBeInTheDocument();
    expect(screen.getByText("See the trap that fooled the field.")).toBeInTheDocument();
    expect(screen.getByText("Race the ghost until you're the benchmark.")).toBeInTheDocument();
  });

  it("tones the before and after stats apart", () => {
    const { container } = render(<FirstGhostCta {...PROPS} />);

    const stats = Array.from(container.querySelectorAll("div")).filter((el) =>
      el.classList.contains(styles.stat),
    );
    expect(stats).toHaveLength(2);
    expect(stats[0]).toHaveClass(styles.bad);
    expect(stats[0]).toHaveTextContent("9 min");
    expect(stats[1]).toHaveClass(styles.good);
    expect(stats[1]).toHaveTextContent("3 min");
  });

  it("shows the sample-data note and no CTA of its own", () => {
    render(<FirstGhostCta {...PROPS} />);

    expect(screen.getByText("Works offline. Sample data shown.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("blockquote")).toBeNull();
  });

  it("labels its section by the title", () => {
    render(<FirstGhostCta {...PROPS} />);

    const heading = screen.getByRole("heading", { name: "Win the first 3 seconds." });
    const section = heading.closest("section");
    expect(section).toHaveAttribute("aria-labelledby", heading.id);
  });
});
