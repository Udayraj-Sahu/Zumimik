"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

export interface NumberTickerProps extends Omit<React.ComponentPropsWithRef<"span">, "children"> {
  /** Target value to count up to. */
  value: number;
  decimalPlaces?: number;
  /** Value the count-up starts from. */
  startValue?: number;
  /** Delay in seconds before the count-up begins. */
  delay?: number;
  /** Duration of the count-up in seconds. */
  duration?: number;
  /**
   * Hold the count-up until this becomes true, then play it once. Use when the
   * element mounts off-screen (carousels, collapsed panels) and would otherwise
   * finish animating before it is ever seen. The value stays correct and
   * readable while inactive.
   */
  active?: boolean;
}

// Matches an ease-out-quint curve: fast start, long soft settle.
function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

export function NumberTicker({
  value,
  decimalPlaces = 0,
  startValue = 0,
  delay = 0,
  duration = 1,
  active = true,
  className,
  ...props
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const hasPlayed = React.useRef(false);

  const format = React.useCallback(
    (latest: number) =>
      Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(latest.toFixed(decimalPlaces))),
    [decimalPlaces],
  );

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Keep the real value on screen while idle, and whenever the animation is
    // skipped or interrupted, so the ticker can never show a stale/zero count.
    node.textContent = format(value);

    if (!active || hasPlayed.current) return;
    hasPlayed.current = true;

    if (reducedMotion || value === startValue) return;

    let frame = 0;
    let timer = 0;

    const wait = Math.max(0, delay * 1000);
    const span = Math.max(1, duration * 1000);
    const startedAt = performance.now() + wait;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      if (elapsed < 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, elapsed / span);
      node.textContent = format(startValue + (value - startValue) * easeOutQuint(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else node.textContent = format(value);
    };

    node.textContent = format(startValue);
    if (wait > 0) {
      timer = window.setTimeout(() => {
        frame = requestAnimationFrame(tick);
      }, wait);
    } else {
      frame = requestAnimationFrame(tick);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [active, delay, duration, format, reducedMotion, startValue, value]);

  return (
    <span
      ref={ref}
      className={cn("inline-block tabular-nums", className)}
      {...props}
    />
  );
}
