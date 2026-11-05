import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BreakOverlay } from "./break-overlay";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("break overlay", () => {
  it("a short break can be skipped at once", () => {
    const done = vi.fn();
    render(<BreakOverlay kind="micro" seconds={120} onDone={done} />);
    expect(screen.getByRole("button", { name: "Back to it" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Back to it" }));
    expect(done).toHaveBeenCalledOnce();
  });

  it("a forced break is finite: the button unlocks when the countdown ends", () => {
    render(<BreakOverlay kind="forced" seconds={3} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: "I'm ready" })).toBeDisabled();
    expect(screen.getByTestId("break-timer")).toHaveTextContent("0:03");
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId("break-timer")).toHaveTextContent("0:00");
    expect(screen.getByRole("button", { name: "I'm ready" })).toBeEnabled();
  });

  it("the day-limit stop only offers to finish and shows no countdown", () => {
    render(<BreakOverlay kind="hard_stop" seconds={900} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Finish session" })).toBeEnabled();
    expect(screen.queryByTestId("break-timer")).not.toBeInTheDocument();
  });

  it("speaks to the learner kindly, in plain words", () => {
    render(<BreakOverlay kind="forced" seconds={10} onDone={vi.fn()} />);
    expect(screen.getByRole("dialog").textContent ?? "").not.toMatch(/fatigue|tired|slow|wrong|fail|score|threshold/i);
  });
});
