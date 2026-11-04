"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type WelcomeCloudProps = {
  /** Whether the cloud has faded/scaled into view. */
  revealed: boolean;
  /**
   * Whether the greeting text is visible. Kept separate from `revealed` so the
   * text never appears before the cloud finishes opening.
   */
  showText?: boolean;
  /** Skip the entrance transitions entirely (reduced motion). */
  reduced?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * A soft cloud-shaped speech bubble. The silhouette is built from a rounded
 * body plus a few "puffs" and a tail, all filled with the theme card colour and
 * wrapped in the `--cloud-shadow-filter` token so the union reads as one cloud.
 * That token draws a --border-coloured rim plus an ambient shadow, which is what
 * keeps the bubble legible when --card and --background are nearly identical in
 * either theme. No colour is hard-coded here.
 */
export function WelcomeCloud({ revealed, showText = true, reduced = false, children, className }: WelcomeCloudProps) {
  return (
    <motion.div
      data-mascot-cloud="true"
      data-revealed={revealed ? "true" : "false"}
      data-text={showText ? "true" : "false"}
      initial={false}
      animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.9 }}
      transition={revealed && !reduced ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      style={{ transformOrigin: "left center" }}
      className={cn("relative min-w-0", className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ filter: "var(--cloud-shadow-filter)" }}
      >
        <div className="absolute inset-0 rounded-[24px] bg-card" />
        <div className="absolute -top-3 left-6 h-7 w-7 rounded-full bg-card" />
        <div className="absolute -top-5 left-[3.25rem] h-9 w-9 rounded-full bg-card" />
        <div className="absolute -top-2 right-8 h-6 w-6 rounded-full bg-card" />
        {/* Tail pointing back at the mascot. */}
        <div className="absolute top-1/2 -left-1.5 h-3.5 w-3.5 -translate-y-1/2 rotate-45 rounded-[3px] bg-card" />
      </div>

      <motion.div
        className="relative px-5 py-3.5 text-card-foreground"
        initial={false}
        animate={{ opacity: showText ? 1 : 0 }}
        transition={{ duration: showText ? 0.25 : 0, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
