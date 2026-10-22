import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakXpPill } from "@/components/dashboard/streak-xp-pill";

function pill(props: Partial<React.ComponentProps<typeof StreakXpPill>> = {}) {
  return <StreakXpPill streak={6} xp={2340} done={false} {...props} />;
}

describe("StreakXpPill", () => {
  it("renders the real streak and formatted XP with a live status line", () => {
    render(pill());

    expect(screen.getByText("6D")).toBeInTheDocument();
    expect(screen.getByText("XP")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("6 day streak, 2,340 XP");
  });

  it("floats +XP when the value increases", () => {
    const { rerender } = render(pill());
    expect(screen.queryByText("+XP")).toBeNull();

    rerender(pill({ xp: 2365 }));

    expect(screen.getByText("+XP")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2,365 XP");
  });

  it("celebrates a 1,000-XP threshold in gold", () => {
    const { container, rerender } = render(pill({ xp: 990 }));
    const xp = () => container.querySelector("[data-gold]");

    expect(xp()).toBeNull();

    rerender(pill({ xp: 1010 }));
    expect(xp()).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("1,010 XP");
  });

  it("does not celebrate when XP rises within the same thousand", () => {
    const { container, rerender } = render(pill({ xp: 990 }));
    rerender(pill({ xp: 999 }));

    expect(container.querySelector("[data-gold]")).toBeNull();
  });

  it("marks the pill complete when today's goal is done", () => {
    const { container, rerender } = render(pill());
    const surface = () => container.querySelector("[data-done]");

    expect(surface()).toBeNull();

    rerender(pill({ done: true }));
    expect(surface()).toHaveAttribute("data-done", "true");
  });

  it("does not retrigger the gain float on unchanged XP", () => {
    const { rerender } = render(pill());
    rerender(pill({ streak: 7 }));

    expect(screen.queryByText("+XP")).toBeNull();
    expect(screen.getByText("7D")).toBeInTheDocument();
  });
});
