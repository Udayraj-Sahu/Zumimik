"use client";

import { useEffect, useState } from "react";

const CATEGORIES = [
  { name: "Logical Fallacy", count: 12, fix: "Fix: check the premise before the answer" },
  { name: "Cognitive Bias", count: 9, fix: "Fix: ignore the first number you saw" },
  { name: "Cognitive Lag", count: 7, fix: "Fix: break it into two small steps" },
  { name: "Calculation Lag", count: 5, fix: "Fix: use the shortcut, skip long working" },
];

export function Rank1() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % CATEGORIES.length);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card k-rank1 h-full">
      <div className="eyebrow">
        [<b>{CATEGORIES[current].name}</b>] how many, what fixes it
      </div>
      <h1>
        EXPOSE THE TRAP
        <br />
        THAT BROKE YOUR RANK
      </h1>
      <section className="categories" aria-label="Mistake categories">
        {CATEGORIES.map((c, i) => (
          <div
            key={c.name}
            className={`category${i === current ? " active" : ""}`}
            onClick={() => setCurrent(i)}
          >
            <strong>{c.name}</strong>
            <em>{c.count}</em>
            <small>{c.fix}</small>
          </div>
        ))}
      </section>
      <p className="summary">Your last 33 mistakes</p>
    </div>
  );
}

export default Rank1;
