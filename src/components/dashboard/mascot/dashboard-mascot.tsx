"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * The avatar engine (which lives in the AGPL-licensed `@bible-strong/avatar-react`
 * package - see ./pip-avatar.tsx) touches `window.matchMedia` and a layout effect
 * at mount, so it is loaded as a client-only chunk. The fixed-size frame reserves
 * layout space up front so the mascot never causes a layout shift while the chunk
 * loads, and `overflow-x-hidden` on the page clips the off-screen walk start.
 */
const PipAvatar = dynamic(() => import("./pip-avatar"), {
  ssr: false,
  loading: () => <span className="block h-full w-full" />,
});

/** Where the walk-in starts: just beyond the left edge, so the whole walk stays
 * visible instead of happening mostly off-screen. */
export const MASCOT_WALK_FROM = "-200px";
/** Where the walk-in ends. Must share the `px` unit with the start value,
 * otherwise Framer Motion cannot interpolate and falls back to an instant jump. */
export const MASCOT_WALK_TO = "0px";
/** How long the walk-in takes to cross the screen (kept short and snappy). */
export const MASCOT_WALK_MS = 500;

/**
 * - `before`: parked off-screen, hidden by the parent until the delay elapses.
 * - `walking`: animating from the left edge to the resting spot.
 * - `after`: settled at the resting spot in the idle pose.
 */
export type MascotState = "before" | "walking" | "after";

type DashboardMascotProps = {
  state?: MascotState;
  /** Fired once the walk-in finishes at the resting spot. */
  onArrived?: () => void;
  className?: string;
};

/**
 * Decorative dashboard mascot. When `state` is `walking` it slides in from the
 * left edge with a subtle step-bob and settles into idle; otherwise it rests.
 * Visitors who prefer reduced motion always get a single still frame.
 */
export function DashboardMascot({ state = "after", onArrived, className }: DashboardMascotProps) {
  const reduced = usePrefersReducedMotion();
  const walking = state === "walking" && !reduced;

  return (
    <motion.div
      aria-hidden="true"
      data-mascot="pip"
      data-walking={walking ? "true" : "false"}
      initial={false}
      animate={{ x: state === "before" ? MASCOT_WALK_FROM : MASCOT_WALK_TO }}
      transition={walking ? { duration: MASCOT_WALK_MS / 1000, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      onAnimationComplete={() => {
        if (walking) onArrived?.();
      }}
      className={cn("h-[56px] w-[56px] shrink-0 sm:h-[72px] sm:w-[72px]", className)}
    >
      <motion.div
        className="h-full w-full"
        animate={walking ? { y: [0, -4, 0, -4, 0] } : { y: 0 }}
        transition={
          walking
            ? { duration: MASCOT_WALK_MS / 1000, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.25, ease: "easeOut" }
        }
      >
        {reduced ? <PipAvatar expression="neutral" /> : <PipAvatar animation="idle" />}
      </motion.div>
    </motion.div>
  );
}
