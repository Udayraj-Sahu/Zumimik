"use client";

import { useEffect, useState } from "react";

export type StepsGroup = {
  label: string;
  slideIndexes: number[];
};

type StepsProps = {
  groups: StepsGroup[];
  currentIndex: number;
  onGroupClick: (firstIndex: number) => void;
  disabled?: boolean;
  autoAdvance?: boolean;
  slideDurationMs?: number;
  onAutoAdvance?: () => void;
  reducedMotion?: boolean;
};

export function Steps({ groups, currentIndex, onGroupClick, disabled = false, totalSlides = 1, autoAdvance = false, slideDurationMs = 3000, onAutoAdvance, reducedMotion = false }: StepsProps & { totalSlides?: number }) {
  const [manual, setManual] = useState(disabled || reducedMotion);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setManual(true);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (disabled) setManual(true);
  }, [disabled]);

  useEffect(() => {
    if (!autoAdvance || manual || disabled) return;
    const id = setInterval(() => {
      onAutoAdvance?.();
    }, slideDurationMs);
    return () => clearInterval(id);
  }, [autoAdvance, manual, disabled, slideDurationMs, onAutoAdvance, currentIndex]);

  const gi = groups.findIndex((g) => g.slideIndexes.includes(currentIndex));

  return (
    <div className={"steps steps--swiss" + (manual ? " manual" : "")} role="tablist" aria-label={groups.map((g) => g.label + ".").join(" ")}>
      <style>{css.replace(/:global\([^)]+\)/g, ".light ")}</style>
      {groups.map((g, k) => (
        <button
          key={g.label}
          role="tab"
          aria-selected={k === gi}
          disabled={disabled}
          onClick={() => {
            setManual(true);
            const firstStop = groups.find((x) => x.label === "Stop")?.slideIndexes[0] ?? 0;
            if (g.label === "Join") {
              onGroupClick(firstStop);
              return;
            }
            onGroupClick(g.slideIndexes[0]);
          }}
        >
          <span className="steps__marker" aria-hidden="true" />
          <span className="steps__label">{g.label === "Join" ? "JOIN." : g.label + "."}</span>
          <span className="steps__rule" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

const css = `
.steps--swiss{display:grid;grid-template-columns:repeat(5,1fr);align-items:stretch;gap:0;width:100%;border-top:1px solid rgba(255,255,255,0.28);border-bottom:1px solid rgba(255,255,255,0.28)}
.light .steps--swiss{border-top:1px solid rgba(0,0,0,0.24);border-bottom:1px solid rgba(0,0,0,0.24)}
.steps--swiss button{position:relative;display:flex;align-items:center;gap:10px;flex:none;width:100%;background:none;border:0;color:rgba(255,255,255,0.38);font:700 9px/1 var(--font-inter),Helvetica,Arial,sans-serif;letter-spacing:0.22em;text-transform:uppercase;text-align:left;padding:10px 14px 10px 0;cursor:pointer}
.light .steps--swiss button{color:rgba(0,0,0,0.38)}
.steps--swiss button + button{border-left:1px solid rgba(255,255,255,0.18)}
.light .steps--swiss button + button{border-left:1px solid rgba(0,0,0,0.16)}
.steps--swiss button[aria-selected="true"]{color:#fff}
.light .steps--swiss button[aria-selected="true"]{color:#000}
.steps--swiss button:focus-visible{outline:1px solid currentColor;outline-offset:-4px}
.steps__marker{width:6px;height:6px;flex:0 0 6px;background:currentColor;opacity:0.4}
.steps button[aria-selected="true"] .steps__marker{opacity:1;background:#ff1f1f}
.steps__label{white-space:nowrap}
.steps__rule{margin-left:auto;flex:0 0 14px;height:1px;background:currentColor;opacity:0.22}
.steps button[aria-selected="true"] .steps__rule{opacity:0.6}
.steps.manual .steps__marker{opacity:0.4}
@media (max-width:640px){
  .steps--swiss button{gap:8px;padding:9px 10px 9px 0;font-size:8px;letter-spacing:0.18em}
  .steps__rule{flex-basis:10px}
}
@media (prefers-reduced-motion:reduce){}
`;

export default Steps;
