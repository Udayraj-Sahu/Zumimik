import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FeatureList } from "@/components/onboarding/slides/feature-list";

describe("FeatureList", () => {
  it("renders the eyebrow and all four feature titles", () => {
    render(<FeatureList />);

    expect(screen.getByText("// Critical systems")).toBeInTheDocument();
    expect(screen.getByText("Adaptive Neural Engine")).toBeInTheDocument();
    expect(screen.getByText("Automated Daily Practice")).toBeInTheDocument();
    expect(screen.getByText("Unlimited Full Mocks & Analytics")).toBeInTheDocument();
    expect(screen.getByText("Autonomic Habit Tracker")).toBeInTheDocument();
  });

  it("renders the compact tags for each feature", () => {
    render(<FeatureList />);

    for (const tag of ["Core", "Daily", "Mocks", "Habit"]) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it("marks icons as decorative for assistive tech", () => {
    const { container } = render(<FeatureList />);

    expect(container.querySelectorAll("svg[aria-hidden]")).toHaveLength(4);
  });
});
