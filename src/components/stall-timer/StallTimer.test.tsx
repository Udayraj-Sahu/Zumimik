import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StallTimer from "@/components/stall-timer/StallTimer";

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

  it("counts up when motion is allowed", async () => {
    const { container } = render(<StallTimer />);

    expect(readout(container)).toHaveTextContent("0");
    await waitFor(() => expect(readout(container)).toHaveTextContent("9"), {
      timeout: 2000,
    });
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
