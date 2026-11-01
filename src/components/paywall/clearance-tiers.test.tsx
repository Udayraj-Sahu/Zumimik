import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlanId } from "@/lib/types/onboarding";
import { ClearanceTiers } from "@/components/paywall/clearance-tiers";
import { BillingCycleToggle } from "@/components/onboarding/intros/plan-intro";

function ControlledClearanceTiers({ onChange = vi.fn() }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState<PlanId>("dual-lane");

  return (
    <ClearanceTiers
      value={value}
      onChange={(id) => {
        setValue(id as PlanId);
        onChange(id);
      }}
    />
  );
}

describe("ClearanceTiers", () => {
  it("renders the compact plan card and expands only the selected description", () => {
    render(<ControlledClearanceTiers />);

    expect(screen.getByRole("heading", { name: "Choose your plan" })).toBeInTheDocument();
    expect(screen.getByText("Think faster. Speak sharper. Don't get fooled.")).toBeInTheDocument();

    const plans = screen.getByRole("radiogroup", { name: "Clearance tiers" });
    const selected = within(plans).getByRole("radio", { name: /Build your study stack/ });
    const free = within(plans).getByRole("radio", { name: /^Free/ });

    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected).toHaveAttribute("aria-describedby", selected.getAttribute("aria-controls"));
    expect(free).not.toHaveAttribute("aria-describedby");
    expect(screen.getByText("Prepare for two or more exams")).not.toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("updates displayed prices when the shared billing cycle toggle changes", () => {
    render(<ControlledClearanceTiers />);

    const billing = screen.getByRole("group", { name: "Billing cycle" });
    expect(within(billing).getByRole("button", { name: /Annual/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("₹6,490")).toBeInTheDocument();

    fireEvent.click(within(billing).getByRole("button", { name: /Monthly/ }));

    expect(within(billing).getByRole("button", { name: /Monthly/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("₹649")).toBeInTheDocument();
    expect(screen.getByText("₹399")).toBeInTheDocument();
  });

  it("changes the selected plan through the radio controls", () => {
    const onChange = vi.fn();
    render(<ControlledClearanceTiers onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /Pro/ }));

    const pro = screen.getByRole("radio", { name: /Pro/ });
    expect(pro).toHaveAttribute("aria-checked", "true");
    expect(pro).toHaveAttribute("aria-describedby", pro.getAttribute("aria-controls"));
    expect(screen.getByText("Full adaptive engine for one exam")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith("single-lane");
  });

  it("supports arrow-key plan navigation and focus movement", () => {
    render(<ControlledClearanceTiers />);
    const selected = screen.getByRole("radio", { name: /Build your study stack/ });

    selected.focus();
    fireEvent.keyDown(selected, { key: "ArrowUp" });

    const pro = screen.getByRole("radio", { name: /Pro/ });
    expect(pro).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(pro);
  });

  it("uses the same accessible billing toggle in its full Plan Intro variant", () => {
    const onChange = vi.fn();
    render(<BillingCycleToggle billing="annual" onChange={onChange} annualSavings={17} />);

    const billing = screen.getByRole("group", { name: "Billing cycle" });
    const annual = within(billing).getByRole("button", { name: /Annual.*SAVE 17%/ });
    const monthly = within(billing).getByRole("button", { name: "Monthly" });
    expect(annual).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(monthly);
    expect(onChange).toHaveBeenCalledWith("monthly");
  });
});
