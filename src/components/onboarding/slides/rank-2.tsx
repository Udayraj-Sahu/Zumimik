"use client";

import { Fragment, useEffect, useState } from "react";
import type { CSSProperties } from "react";

const ANSWERS = [
  { value: "2,491", percent: 62, correct: true },
  { value: "2,481", percent: 27 },
  { value: "2,391", percent: 7 },
  { value: "2,381", percent: 4 },
];

const RANK2_START = 0.5;
const RANK2_STEP = 0.4;
const RANK2_GROW = 0.9;
const RANK2_LAG = 0.15;
const RANK2_CYCLE_MS = 7000;

export function Rank2() {
  const [run, setRun] = useState(0);
  const [elapsed, setElapsed] = useState(Infinity);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let start = performance.now();
    setRun((r) => r + 1);

    const frame = (now: number) => {
      let e = now - start;
      if (e >= RANK2_CYCLE_MS) {
        start = now;
        e = 0;
        setRun((r) => r + 1);
      }
      setElapsed(Math.max(0, e) / 1000);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="card k-rank2 h-full">
      <div className="eyebrow">Case file</div>
      <h1>
        Then it shows
        <br />
        you the trap.
      </h1>

      <Fragment key={run}>
        <div className="question">43 × 57</div>

        {ANSWERS.map((a, i) => {
          const d = RANK2_START + i * RANK2_STEP;
          const x = Math.min(1, Math.max(0, (elapsed - d - RANK2_LAG) / RANK2_GROW));
          const shown = Math.round(a.percent * (1 - Math.pow(1 - x, 3)));

          return (
            <div
              key={a.value}
              className={`answers${a.correct ? " correct" : ""}`}
              style={{ "--d": `${d}s` } as CSSProperties}
            >
              <span>{a.value}</span>
              <div className="bar" style={{ "--width": `${a.percent}%` } as CSSProperties}>
                <i />
              </div>
              <span>{shown}%</span>
            </div>
          );
        })}

        <div className="fix">Fix: 43 × 50 + 43 × 7 = 2,150 + 301</div>
        <div className="fix-trap">EXPOSE THE TRAP THAT BROKE YOUR RANK</div>
      </Fragment>
    </div>
  );
}

export default Rank2;
