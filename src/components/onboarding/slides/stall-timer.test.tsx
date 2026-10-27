import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StallTimer from "@/components/onboarding/slides/stall-timer";

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

const readout = (container: HTMLElement) => container.querySelector("b") as HTMLElement;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("StallTimer", () => {
  it("states the time left in the section and the questions still open", () => {
    render(<StallTimer />);

    expect(
      screen.getByText("Section ends in 12 minutes. Six questions left."),
    ).toBeInTheDocument();
  });

  it("opens on the unassisted run with the red readout", () => {
    withReducedMotion();
    const { container } = render(<StallTimer />);

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "With zuzumik" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(readout(container)).toHaveTextContent("9");
    expect(
      screen.getByRole("heading", { name: "Six left. The clock is winning." }),
    ).toBeInTheDocument();
  });

  it("switches to the assisted run on click", async () => {
    withReducedMotion();
    const { container } = render(<StallTimer />);

    await userEvent.click(screen.getByRole("button", { name: "With zuzumik" }));

    expect(screen.getByRole("button", { name: "With zuzumik" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(readout(container)).toHaveTextContent("3");
    expect(
      screen.getByRole("heading", { name: "Stalls found. Time back." }),
    ).toBeInTheDocument();
  });

  it("exposes the bar as an image with a spoken label", () => {
    withReducedMotion();
    render(<StallTimer />);

    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "9 of 9 minutes lost to stalls",
    );
  });

  it("announces the verdict politely", () => {
    render(<StallTimer />);

    expect(
      screen.getByRole("heading", { name: "Six left. The clock is winning." }),
    ).toHaveAttribute("aria-live", "polite");
  });

  it("spells the questions left and honours the given section time", () => {
    render(<StallTimer sectionMinutes={8} questionsLeft={3} />);

    expect(
      screen.getByText("Section ends in 8 minutes. Three questions left."),
    ).toBeInTheDocument();
  });

  it("waits for the slide to be active before counting up", () => {
    withReducedMotion();
    const { container, rerender } = render(<StallTimer isActive={false} />);

    expect(readout(container)).toHaveTextContent("0");

    rerender(<StallTimer isActive />);

    expect(readout(container)).toHaveTextContent("9");
  });

  it("resets and replays on each new entry", () => {
    withReducedMotion();
    const { container, rerender } = render(<StallTimer isActive={false} />);

    rerender(<StallTimer isActive />);
    expect(readout(container)).toHaveTextContent("9");

    rerender(<StallTimer isActive={false} />);
    expect(readout(container)).toHaveTextContent("0");

    rerender(<StallTimer isActive />);
    expect(readout(container)).toHaveTextContent("9");
  });

  it("never loses more minutes than the section has", () => {
    withReducedMotion();
    const { container } = render(<StallTimer sectionMinutes={4} />);

    expect(readout(container)).toHaveTextContent("4");
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "4 of 4 minutes lost to stalls",
    );
  });

  it("counts up when motion is allowed, then settles on the assisted run", async () => {
    const { container } = render(<StallTimer />);

    expect(readout(container)).toHaveTextContent("0");
    await waitFor(
      () => expect(Number(readout(container).textContent)).toBeGreaterThan(0),
      { timeout: 1000 },
    );
    await waitFor(() => expect(readout(container)).toHaveTextContent("3"), {
      timeout: 2000,
    });
  });

  it("hands off to the assisted run on its own after the reading beat", () => {
    vi.useFakeTimers();
    withReducedMotion();
    const { container } = render(<StallTimer />);

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(readout(container)).toHaveTextContent("9");

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole("button", { name: "With zuzumik" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(readout(container)).toHaveTextContent("3");
    expect(
      screen.getByRole("heading", { name: "Stalls found. Time back." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "3 of 9 minutes lost to stalls",
    );
  });

  it("keeps a manual pick and cancels the auto hand-off", () => {
    vi.useFakeTimers();
    withReducedMotion();
    const { container } = render(<StallTimer />);

    fireEvent.click(screen.getByRole("button", { name: "With zuzumik" }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("button", { name: "With zuzumik" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(readout(container)).toHaveTextContent("3");

    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(readout(container)).toHaveTextContent("9");
  });

  it("clears the hand-off when the slide goes inactive and restarts on return", () => {
    vi.useFakeTimers();
    withReducedMotion();
    const { container, rerender } = render(<StallTimer isActive />);

    rerender(<StallTimer isActive={false} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(readout(container)).toHaveTextContent("0");

    rerender(<StallTimer isActive />);

    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(readout(container)).toHaveTextContent("9");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole("button", { name: "With zuzumik" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("survives rapid mode changes", async () => {
    const { container } = render(<StallTimer />);

    await userEvent.click(screen.getByRole("button", { name: "With zuzumik" }));
    await userEvent.click(screen.getByRole("button", { name: "Today" }));

    await waitFor(() => expect(readout(container)).toHaveTextContent("9"), {
      timeout: 2000,
    });
  });
});
