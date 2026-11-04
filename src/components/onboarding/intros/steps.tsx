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
    <div className={"steps" + (manual ? " manual" : "")} role="tablist" aria-label={groups.map((g) => g.label + ".").join(" ")}>
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
          <i>
            {g.slideIndexes.map((s) => (
              <u key={s} className={k < gi ? "a" : k > gi ? "" : s < currentIndex ? "a" : s === currentIndex ? "c" : ""} />
            ))}
          </i>
          {g.label === "Join" ? "JOIN." : g.label + "."}
        </button>
      ))}
    </div>
  );
}

const css = `
.steps{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;width:100%}
.steps button{flex:1;background:none;border:0;color:rgba(255,255,255,0.5);font:600 10px/1.2 var(--font-jakarta),system-ui,sans-serif;letter-spacing:0.12em;text-transform:uppercase;text-align:left;padding:0;cursor:pointer}
.light .steps button{color:rgba(0,0,0,0.5)}
.steps button[aria-selected="true"]{color:rgba(255,255,255,0.9)}
.light .steps button[aria-selected="true"]{color:rgba(0,0,0,0.9)}
.steps button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.steps i{display:flex;gap:6px;margin-bottom:6px;height:4px}
.steps i u{flex:1;background:rgba(255,255,255,0.18);border-radius:2px;position:relative;overflow:hidden}
.light .steps i u{background:rgba(0,0,0,0.18)}
.steps i u.a:after,.steps i u.c:after{content:"";position:absolute;inset:0;background:var(--lime,#c8ff5a)}
.light .steps i u.a:after,.light .steps i u.c:after{background:var(--lime-solid,#9fd42f)}
.steps i u.c:after{transform-origin:left;animation:pf 3s linear both}
.steps.manual i u.c:after{animation:none;transform:scaleX(1)}
@keyframes pf{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (prefers-reduced-motion:reduce){.steps i u.c:after{animation:none;transform:scaleX(1)}}
`;

export default Steps;
