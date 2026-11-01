"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { PLANS, type PlanId } from "@/lib/types/onboarding";
import { formatINR } from "@/lib/text";
import { cn } from "@/lib/utils";
import {
  BillingCycleToggle,
  getAnnualSavingsPercent,
  type BillingCycle,
} from "@/components/onboarding/intros/plan-intro";

export type PaywallOption = {
  id: PlanId;
  title: string;
  desc: string;
  note: string;
  cta: string;
  badge?: string;
};

/** Selection copy stays local; all plan IDs and billing values come from PLANS. */
export const PREP_OPTIONS: PaywallOption[] = [
  {
    id: "initiate",
    title: "Free",
    desc: "Ad-free drills · 1 active segment",
    note: "",
    cta: "ACTIVATE FREE TIER",
  },
  {
    id: "single-lane",
    title: "Pro",
    desc: "Full adaptive engine for one exam",
    note: "",
    cta: "ACTIVATE SINGLE LANE",
  },
  {
    id: "dual-lane",
    title: "Build your study stack",
    desc: "Prepare for two or more exams",
    note: "",
    cta: "ACTIVATE DUAL LANE",
    badge: "FULL THROTTLE",
  },
];

const RADIO_KEYS = new Set(["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"]);

export function ClearanceTiers({
  value,
  onChange,
  className,
  billing,
  onBillingChange,
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
  billing?: BillingCycle;
  onBillingChange?: (billing: BillingCycle) => void;
}) {
  const [localBilling, setLocalBilling] = useState<BillingCycle>("annual");
  const idPrefix = useId();
  const currentBilling = billing ?? localBilling;
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedPlan = PLANS.find((plan) => plan.id === value);
  const discountPlan =
    selectedPlan?.id === "initiate"
      ? PLANS.find((plan) => plan.id === "single-lane")!
      : (selectedPlan ?? PLANS.find((plan) => plan.id === "single-lane")!);
  const annualSavings = getAnnualSavingsPercent(
    discountPlan.billing.annual,
    discountPlan.billing.monthly,
  );

  const changeBilling = (next: BillingCycle) => {
    if (onBillingChange) onBillingChange(next);
    else setLocalBilling(next);
  };

  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!RADIO_KEYS.has(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (index + 1) % PREP_OPTIONS.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (index - 1 + PREP_OPTIONS.length) % PREP_OPTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PREP_OPTIONS.length - 1;
    }

    const next = PREP_OPTIONS[nextIndex];
    onChange(next.id);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <section className={cn("mx-auto w-full max-w-[360px]", className)}>
      <header className="flex flex-nowrap items-center justify-between gap-2">
        <h2 className="min-w-0 whitespace-nowrap text-[15px] font-semibold leading-tight tracking-[-0.01em]">
          Choose your plan
        </h2>
        <BillingCycleToggle
          billing={currentBilling}
          onChange={changeBilling}
          annualSavings={annualSavings}
          variant="compact"
          className="ml-auto"
        />
      </header>

      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        Think faster. Speak sharper. Don&apos;t get fooled.
      </p>
      <span aria-hidden="true" className="mt-2.5 block h-1 w-16 rounded-full bg-primary" />

      <div role="radiogroup" aria-label="Clearance tiers" className="mt-3 space-y-2">
        {PREP_OPTIONS.map((option, index) => {
          const active = option.id === value;
          const plan = PLANS.find((candidate) => candidate.id === option.id)!;
          const amount = plan.billing[currentBilling];
          const descriptionId = `${idPrefix}-clearance-description-${option.id}`;

          return (
            <button
              key={option.id}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-controls={descriptionId}
              aria-describedby={active ? descriptionId : undefined}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => selectWithKeyboard(event, index)}
              className={cn(
                "w-full rounded-[11px] border p-3 text-left transition-[background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none",
                active
                  ? "border-[var(--accent-foreground)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_var(--accent-border)]"
                  : "border-border bg-background/40 hover:border-[var(--accent-border)] hover:bg-accent/40",
              )}
            >
              <span className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                    active
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/50 bg-transparent",
                  )}
                >
                  {active && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                </span>

                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span
                      data-plan-title={option.id}
                      className="text-[13px] font-semibold leading-snug text-foreground"
                    >
                      {option.title}
                    </span>
                    {option.badge && (
                      <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.1em] text-accent-foreground">
                        {option.badge}
                      </span>
                    )}
                  </span>
                  <span
                    id={descriptionId}
                    aria-hidden={!active}
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                      active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <span className="min-h-0 overflow-hidden pt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {option.desc}
                    </span>
                  </span>
                </span>

                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap pt-px text-right text-[13px] font-semibold tabular-nums",
                    plan.id === "initiate" ? "text-muted-foreground" : "text-accent-foreground",
                  )}
                  data-plan-price={option.id}
                >
                  {plan.id === "initiate" ? (
                    "Free"
                  ) : (
                    <>
                      {formatINR(amount)}
                      <span className="ml-1 text-[9px] font-normal text-muted-foreground">
                        {currentBilling === "annual" ? "/yr" : "/mo"}
                      </span>
                    </>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
