"use client";

import { useEffect, useId, useState } from "react";

import styles from "./compound-chart.module.css";

const DRAW_MS = 2000;

type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  metric?: string;
  gain?: number;
  tooltip?: string;
  routineLabel?: string;
  roteLabel?: string;
  /**
   * Drives the count-up and the draw-in. The carousel passes the live slide
   * state (true only while this slide is the active one) so nothing animates
   * while the card is merely mounted off-screen. Defaults to true for
   * standalone use.
   */
  isActive?: boolean;
};

/**
 * Counts from 0 to `gain` while active. Leaving the active state resets to 0 so
 * the next visit replays; reduced motion jumps straight to the final value.
 */
function useCountUp(isActive: boolean, gain: number): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCount(0);
      return;
    }

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduced) {
      setCount(gain);
      return;
    }

    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / DRAW_MS, 1);
      setCount(Math.round(gain * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isActive, gain]);

  return count;
}

/**
 * Pitch intro slide 4. Compound-interest line chart for the adaptive routine vs
 * a traditional rote drill, with a count-up gain readout. Every stroke, fill and
 * surface comes from theme tokens so the card reads in light and dark mode, and
 * the gradients are namespaced per instance so several charts never collide.
 */
export default function CompoundChart({
  eyebrow = "The compound effect",
  title = "Science of Consistency",
  subtitle = "Why 6 daily minutes beats 2 hours of weekend studying.",
  metric = "Calculation processing speed",
  gain = 312,
  tooltip = "Day 30: 4.8x capacity",
  routineLabel = "Neon Dojo routine",
  roteLabel = "Traditional rote drill",
  isActive = true,
}: Props) {
  const count = useCountUp(isActive, gain);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const strokeId = `cc-stroke-${uid}`;
  const fillId = `cc-fill-${uid}`;

  return (
    <section className={`${styles.card} ${isActive ? styles.play : ""}`}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.sub}>{subtitle}</p>

      <div className={styles.panel}>
        <div className={styles.top}>
          <div className={styles.metric}>{metric}</div>
          <div className={styles.gain}>
            <b>+{count}%</b>
            Compound
          </div>
        </div>

        <div className={styles.chart}>
          <svg
            viewBox="0 0 300 150"
            role="img"
            aria-label={`Line chart: ${routineLabel} grows exponentially while ${roteLabel} stays nearly flat. ${tooltip}.`}
          >
            <defs>
              <linearGradient
                id={strokeId}
                gradientUnits="userSpaceOnUse"
                x1="10"
                y1="0"
                x2="290"
                y2="0"
              >
                <stop className={styles.stopCyan} offset="0" />
                <stop className={styles.stopNeon} offset="1" />
              </linearGradient>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop className={styles.stopNeon} offset="0" stopOpacity="0.38" />
                <stop className={styles.stopNeon} offset="1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* traditional rote drill */}
            <path
              className={styles.rote}
              d="M10 126 C100 121 200 111 290 99"
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* area under the routine curve */}
            <path
              className={styles.area}
              d="M10 128 C80 126 150 118 200 92 C240 70 265 40 290 18 L290 150 L10 150 Z"
              fill={`url(#${fillId})`}
            />

            {/* routine line */}
            <path
              className={styles.line}
              pathLength={1}
              d="M10 128 C80 126 150 118 200 92 C240 70 265 40 290 18"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              stroke={`url(#${strokeId})`}
            />

            {/* end point */}
            <circle className={styles.pulse} cx="290" cy="18" r="5" />
            <circle className={styles.dot} cx="290" cy="18" r="5" />
          </svg>

          <div className={styles.tip}>{tooltip}</div>
        </div>

        <div className={styles.legend}>
          <span className={styles.routine}>
            <i />
            {routineLabel}
          </span>
          <span className={styles.roteKey}>
            <i />
            {roteLabel}
          </span>
        </div>
      </div>
    </section>
  );
}
