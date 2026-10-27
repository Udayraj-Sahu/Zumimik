"use client";

"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const RISE2_BARS = [
  { height: 22, delay: "0s" },
  { height: 38, delay: "0.1s" },
  { height: 54, delay: "0.2s" },
  { height: 72, delay: "0.3s" },
  { height: 90, delay: "0.4s" },
];

export function Rise2() {
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setRun((r) => r + 1), 5200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card k-rise2 h-full">
      <div className="eyebrow">You vs you</div>
      <h1>
        Beat your own
        <br />
        baseline.
      </h1>
      <div key={run} className="stairs" aria-label="Five progressively taller performance bars">
        {RISE2_BARS.map((b) => (
          <div
            key={b.height}
            className="bar"
            style={{ "--height": b.height, "--delay": b.delay } as CSSProperties}
          />
        ))}
        <div className="baseline">
          <span>Baseline</span>
        </div>
        <div className="dot" />
      </div>
    </div>
  );
}

export default Rise2;
