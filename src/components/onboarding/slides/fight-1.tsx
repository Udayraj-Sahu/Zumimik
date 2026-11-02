"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CLOCK_CYCLE_DURATION_MS,
  getFight1ClockFrame,
  getFight1ProgressAt,
} from "./fight-1-clock";

const TICKS_MINOR = { r: 216, dash: 2.6, gap: 20.02 };
const TICKS_MAJOR = { r: 211, dash: 6, gap: 104.47 };

export function Fight1({ active = false }: { active?: boolean }) {
  const uid = useId();
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const elapsedRef = useRef(0);
  const frame = getFight1ClockFrame(progress);

  useEffect(() => {
    if (!active || progressRef.current >= 1) return;

    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (motionQuery?.matches) {
      elapsedRef.current = CLOCK_CYCLE_DURATION_MS;
      progressRef.current = 1;
      setProgress(1);
      return;
    }

    const elapsedAtStart = elapsedRef.current;
    const startedAt = performance.now();
    let animationFrame = 0;
    let motionFinished = false;

    const finishForReducedMotion = (event: MediaQueryListEvent) => {
      if (!event.matches) return;

      motionFinished = true;
      window.cancelAnimationFrame(animationFrame);
      elapsedRef.current = CLOCK_CYCLE_DURATION_MS;
      progressRef.current = 1;
      setProgress(1);
    };

    motionQuery?.addEventListener("change", finishForReducedMotion);

    const update = (now: number) => {
      const elapsed = Math.min(
        CLOCK_CYCLE_DURATION_MS,
        elapsedAtStart + now - startedAt,
      );
      const nextProgress = getFight1ProgressAt(elapsed);
      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (elapsed < CLOCK_CYCLE_DURATION_MS) {
        animationFrame = window.requestAnimationFrame(update);
      } else {
        elapsedRef.current = CLOCK_CYCLE_DURATION_MS;
      }
    };

    animationFrame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      elapsedRef.current = motionFinished
        ? CLOCK_CYCLE_DURATION_MS
        : Math.min(
            CLOCK_CYCLE_DURATION_MS,
            elapsedAtStart + performance.now() - startedAt,
          );
      motionQuery?.removeEventListener("change", finishForReducedMotion);
    };
  }, [active]);

  return (
    <main className={`card k-fight1 h-full${active ? " is-active" : ""}`}>
      <div className="eyebrow">Beat the clock</div>

      <h1 className="headline">
        <span>Every</span>
        <span>second</span>
        <span>counts</span>
        <span className="highlight">to win.</span>
      </h1>

      <div className="f1-art-wrap">
        <svg
          className="f1-art"
          viewBox="0 0 360 400"
          preserveAspectRatio="xMaxYMax meet"
          role="img"
          aria-labelledby={`${uid}-title ${uid}-description`}
          focusable="false"
        >
          <title id={`${uid}-title`}>The last seconds</title>
          <desc id={`${uid}-description`}>
            A red sector fills across the clock as its hand sweeps to twelve.
          </desc>

          <g className="f1-dial">
            <g aria-hidden="true">
              <circle cx="238" cy="312" r="230" fill="var(--f1-ink)" />
            </g>

            <g aria-hidden="true">
              <circle
                cx="250"
                cy="300"
                r="230"
                fill="var(--f1-paper)"
                stroke="var(--f1-ink)"
                strokeWidth="5"
              />
              <circle
                cx="250"
                cy="300"
                r={TICKS_MINOR.r}
                fill="none"
                stroke="var(--f1-ink)"
                strokeWidth="8"
                strokeDasharray={`${TICKS_MINOR.dash} ${TICKS_MINOR.gap}`}
                strokeDashoffset={TICKS_MINOR.dash / 2}
                transform="rotate(-90 250 300)"
              />
              <circle
                cx="250"
                cy="300"
                r={TICKS_MAJOR.r}
                fill="none"
                stroke="var(--f1-ink)"
                strokeWidth="18"
                strokeDasharray={`${TICKS_MAJOR.dash} ${TICKS_MAJOR.gap}`}
                strokeDashoffset={TICKS_MAJOR.dash / 2}
                transform="rotate(-90 250 300)"
              />
            </g>

            <g aria-hidden="true">
              <path
                d={frame.wedgePath}
                fill="var(--f1-red)"
                stroke="var(--f1-ink)"
                strokeWidth="4"
                strokeLinejoin="round"
                className="f1-wedge"
              />
              <text
                x="250"
                y="152"
                textAnchor="middle"
                fontSize="46"
                fontWeight="900"
                fill="var(--f1-ink)"
                className="f1-num"
              >
                12
              </text>
            </g>

            <g
              aria-hidden="true"
              className="f1-hand"
              transform={`rotate(${frame.handRotation} 250 300)`}
            >
              <polygon points="276,291 276,309 44,304 26,300 44,296" fill="var(--f1-ink)" />
            </g>

            <g aria-hidden="true">
              <circle cx="250" cy="300" r="15" fill="var(--f1-ink)" />
              <circle cx="250" cy="300" r="5" fill="var(--f1-red)" />
            </g>
          </g>

        </svg>
      </div>
    </main>
  );
}

export default Fight1;
