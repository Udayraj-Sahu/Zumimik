"use client";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GLASS_BORDER } from "@/lib/theme";
import { useAccentHex } from "@/hooks/use-accent-hex";

/**
 * The surface every card on the Adaptive Learning tab shares. It is the same one "Your Topics" and "Today's Mission" use: a
 * rounded-3xl blurred panel with a glass border and no fill of its own, an accent-coloured micro label, and rows set in
 * hairline-bordered rounded-2xl boxes (see ROW_CLASS).
 */
export const CARD_CLASS = "rounded-3xl border backdrop-blur-xl p-5";
export const ROW_CLASS = "rounded-2xl border border-white/[0.06] px-4 py-3";

export function CardLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const accent = useAccentHex();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: `${accent}d9` }}>
        {children}
      </p>
      {action}
    </div>
  );
}

export function IconTile({ children }: { children: ReactNode }) {
  const accent = useAccentHex();
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-xl"
      style={{ background: `${accent}14`, color: accent }}
    >
      {children}
    </span>
  );
}

export function AdaptiveCard({
  label,
  action,
  className,
  children,
  ...props
}: { label?: ReactNode; action?: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn(CARD_CLASS, className)} style={{ borderColor: GLASS_BORDER }} {...props}>
      {label && <CardLabel action={action}>{label}</CardLabel>}
      {children}
    </section>
  );
}
