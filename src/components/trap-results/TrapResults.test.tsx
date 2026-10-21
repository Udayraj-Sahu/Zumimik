import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import TrapResults from "@/components/trap-results/TrapResults";

describe("TrapResults", () => {
  it("renders the heading, subtitle, question and fix", () => {
    render(<TrapResults />);

    expect(screen.getByRole("heading", { name: "Then it shows you the trap." })).toBeInTheDocument();
    expect(screen.getByText("Who fell. How many. What fixes it.")).toBeInTheDocument();
    expect(screen.getByText("A : B = 3 : 5. Add 10 to each and it becomes 5 : 7. Find A.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The fix, in 10 seconds: write 3k and 5k. Solve for k first, then ask what A is.",
      ),
    ).toBeInTheDocument();
  });

  it("renders three answer options with their percentages", () => {
    render(<TrapResults />);

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("58%")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("31%")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("7%")).toBeInTheDocument();
  });

  it("labels each bar with its answer, share and kind", () => {
    render(<TrapResults />);

    expect(
      screen.getByRole("img", { name: "Answer 15: 58 percent, correct answer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Answer 25: 31 percent, common wrong answer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Answer 9: 7 percent, other answer" }),
    ).toBeInTheDocument();
  });

  it("accepts custom options", () => {
    render(
      <TrapResults
        question="Custom question?"
        options={[{ value: "7", pct: 100, kind: "right" }]}
        fix="Custom fix."
      />,
    );

    expect(screen.getByText("Custom question?")).toBeInTheDocument();
    expect(screen.getByText("Custom fix.")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
