import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HabitProtocol } from "@/components/onboarding/slides/habit-protocol";

describe("HabitProtocol", () => {
  it("renders the heading, pipeline label and all three feature titles", () => {
    render(<HabitProtocol />);

    expect(screen.getByText("Habit protocol")).toBeInTheDocument();
    expect(screen.getByText("Autonomous pipeline")).toBeInTheDocument();
    expect(screen.getByText("Micro-skills acceleration")).toBeInTheDocument();
    expect(screen.getByText("Automated spaced revision")).toBeInTheDocument();
    expect(screen.getByText("Skill depreciation sentinel")).toBeInTheDocument();
  });

  it("renders the descriptions and the reflexive tag", () => {
    render(<HabitProtocol />);

    expect(
      screen.getByText("Sub-second mental calculation drills calibrated to reflex speed."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dynamic auto-scheduling before retention drops below 90%."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Real-time telemetry flagging vulnerable formula nodes."),
    ).toBeInTheDocument();
    expect(screen.getByText("Reflex mode")).toBeInTheDocument();
  });

  it("marks icons as decorative for assistive tech", () => {
    const { container } = render(<HabitProtocol />);

    expect(container.querySelectorAll("svg[aria-hidden]")).toHaveLength(3);
  });
});
