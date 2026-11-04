"use client";

import { Fragment, useEffect, useState } from "react";
import type { CSSProperties } from "react";

const FIGHT2_BARS: { h: number; loss?: string; marker?: boolean }[] = [
  { h: 38 },
  { h: 64, loss: "+2.1s" },
  { h: 34 },
  { h: 92, loss: "+4.6s" },
  { h: 40 },
  { h: 76, loss: "+3.2s" },
  { h: 36 },
  { h: 78, loss: "+3.3s", marker: true },
  { h: 42 },
  { h: 38 },
];

const STEP = 0.25;
const CYCLE_MS = 6500;

const STALLS = FIGHT2_BARS.flatMap((b, i) =>
  b.loss ? [{ at: (i * STEP + 0.65) * 1000, secs: parseFloat(b.loss) }] : []
);

export function Fight2() {
  const [run, setRun] = useState(0);
  const [stalls, setStalls] = useState(STALLS.length);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timers: ReturnType<typeof setTimeout>[] = [];

    const play = (first: boolean) => {
      timers.forEach(clearTimeout);
      if (!first) setRun((r) => r + 1);
      setStalls(0);
      timers = STALLS.map((s, n) => setTimeout(() => setStalls(n + 1), s.at));
    };

    play(true);
    const loop = setInterval(() => play(false), CYCLE_MS);

    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, []);

  const gone = STALLS.slice(0, stalls).reduce((sum, s) => sum + s.secs, 0);

  return (
    <div className="card k-fight2 h-full">
      <div className="eyebrow">The replay</div>
      <h1>
        The minutes
        <br />
        you never saw leave.
      </h1>

      <section key={run} className="chart" aria-label="Example time lost across ten questions">
        <div className="annotation">
          {stalls} stall{stalls === 1 ? "" : "s"}. {gone.toFixed(1)}s gone.
        </div>
        <div className="usual-pace" />
        <div className="bars">
          {FIGHT2_BARS.map((b, i) => (
            <div
              key={i}
              className={`bar${b.loss ? " loss" : ""}${b.marker ? " marker" : ""}`}
              data-time={b.loss}
              style={{ "--h": b.h, "--i": i } as CSSProperties}
            >
              {b.loss && (
                <span className="loss-label" aria-hidden="true">
                  {b.loss}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="axis">
        <span>Q1</span>
        <span>— usual pace</span>
        <span>Q10</span>
      </div>
    </div>
  );
}

export default Fight2;
