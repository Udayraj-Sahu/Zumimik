"use client";

import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";

import { formatINR } from "@/lib/text";

const inr = formatINR;

export type PaywallOption = {
  id: string;
  title: string;
  desc: string;
  price: string;
  priceSuffix: string;
  note: string;
  cta: string;
  badge?: string;
};

export const PREP_OPTIONS: PaywallOption[] = [
  {
    id: "initiate",
    title: "Free",
    desc: "Ad-free drills · 1 active segment",
    price: "FREE",
    priceSuffix: "forever",
    note: "",
    cta: "ACTIVATE FREE TIER",
  },
  {
    id: "single-lane",
    title: "Pro",
    desc: "Full adaptive engine for one exam",
    price: inr(399),
    priceSuffix: "/mo",
    note: "",
    cta: "ACTIVATE SINGLE LANE",
  },
  {
    id: "dual-lane",
    title: "Build your study stack",
    desc: "Prepare for two or more exams",
    price: inr(649),
    priceSuffix: "/mo",
    note: "",
    cta: "ACTIVATE DUAL LANE",
    badge: "FULL THROTTLE",
  },
] as const;

export function ClearanceTiers({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const light = useThemeStore((s) => s.theme) === "light";
  return (
    <section className={className}>
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[9px] font-bold tracking-[0.2em] text-muted-foreground/80">
          CLEARANCE TIERS
        </h2>
        <span
          className={cn(
            "font-mono text-[8px] font-bold tracking-wider",
            light ? "text-[var(--cyan)]" : "text-cyan-300",
          )}
        >
          SCALABLE ACCESS
        </span>
      </div>

      <div role="radiogroup" aria-label="Clearance tiers" className="mt-3 space-y-2.5">
        {PREP_OPTIONS.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.id)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition",
                active
                  ? "border-[var(--lime)] bg-[var(--lime-05)] shadow-[0_0_24px_var(--lime-18)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                    active ? "border-[var(--lime)]" : "border-muted-foreground/40",
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-[var(--lime)]" />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[12px] font-bold uppercase tracking-wide">{o.title}</h3>
                        {o.badge && (
                          <span className="rounded bg-[var(--lime-solid)] px-1.5 py-px font-mono text-[7px] font-bold tracking-wider text-[var(--on-accent)]">
                            {o.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] leading-snug text-muted-foreground/60">
                        {o.desc}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-right text-[15px] font-bold",
                        o.price === "FREE"
                          ? "text-muted-foreground/80"
                          : "text-[var(--lime)]",
                      )}
                    >
                      {o.price}
                      {o.priceSuffix && o.priceSuffix.trim().toLowerCase() !== "forever" && (
                        <span className="text-[9px] font-normal text-muted-foreground/50">
                          {o.priceSuffix}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "mt-2 font-mono text-[7px] font-bold tracking-wider",
                      active ? "text-[var(--lime)]" : "text-muted-foreground/40",
                    )}
                  >
                    {o.note}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
