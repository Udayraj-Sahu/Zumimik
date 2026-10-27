"use client";

import { useEffect, useState } from "react";

export function Rise1() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(1);
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const score = 9 - (tick % 7);
  const progress = tick === 0 ? 0.15 : 1 - ((score - 3) / 6) * 0.85;

  return (
    <div className="card k-rise1 h-full">
      <div className="eyebrow">Reflex score</div>
      <h1>
        Faster reflexes.
        <br />
        Higher rank.
        <br />
        Rise!
      </h1>
      <div className="score">
        <span>{score}</span>
        <sup>s</sup>
      </div>
      <div
        className="meter"
        role="progressbar"
        aria-label="Reflex improvement"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className="meter-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <p className="note">Time per question, week 1 to week 6</p>
    </div>
  );
}

export default Rise1;
