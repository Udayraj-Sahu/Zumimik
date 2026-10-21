"use client";

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { GLASS_BG, GLASS_BORDER } from "@/lib/theme";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  radius?: "2xl" | "3xl";
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { radius = "3xl", className, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative border backdrop-blur-xl",
        radius === "3xl" ? "rounded-3xl" : "rounded-2xl",
        // Glass cards are near-white on the off-white light page; without a
        // shadow the delta is too subtle to read as elevation. Owned here
        // instead of globals.css scraping [style*="--glass-bg"].
        "light:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_rgba(16,24,40,0.05)]",
        className,
      )}
      style={{ borderColor: GLASS_BORDER, background: GLASS_BG, ...style }}
      {...props}
    />
  );
});