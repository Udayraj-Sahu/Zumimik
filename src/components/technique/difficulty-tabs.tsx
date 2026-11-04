"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, Zap, ChevronDown, ChevronUp } from "lucide-react";
import type { DifficultyLevel, TechniquePracticeQuestion } from "@/lib/types/technique";
import RendererRouter from "@/components/renderers/renderer-router";
import { exampleToTemplate } from "@/components/renderers/utils/level-to-template";

const LEVEL_COLORS: Record<number, string> = {
  1: "text-chart-3 border-chart-3/30 bg-chart-3/5",
  2: "text-primary border-primary/30 bg-primary/5",
  3: "text-chart-4 border-chart-4/30 bg-chart-4/5",
  4: "text-destructive border-destructive/30 bg-destructive/5",
  5: "text-foreground border-foreground/20 bg-foreground/5",
};

const LEVEL_BG: Record<number, string> = {
  1: "bg-chart-3",
  2: "bg-primary",
  3: "bg-chart-4",
  4: "bg-destructive",
  5: "bg-foreground",
};

export function DifficultyTabs({
  levels,
  techniqueName,
}: {
  levels: Partial<Record<1 | 2 | 3 | 4 | 5, DifficultyLevel>>;
  techniqueName: string;
}) {
  const levelKeys = Object.keys(levels).map(Number) as (1 | 2 | 3 | 4 | 5)[];
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(levelKeys[0] ?? null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevLevel = useRef<1 | 2 | 3 | 4 | 5 | null>(null);

  const handleLevelChange = useCallback((lvl: 1 | 2 | 3 | 4 | 5) => {
    setActiveLevel((prev) => (prev === lvl ? null : lvl));
  }, []);

  useEffect(() => {
    if (contentRef.current && activeLevel !== prevLevel.current) {
      prevLevel.current = activeLevel;
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
      );
    }
  }, [activeLevel]);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin" role="tablist" aria-label="Difficulty levels">
        {levelKeys.map((lvl) => {
          const level = levels[lvl]!;
          const active = activeLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleLevelChange(lvl)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-3 text-[10px] font-bold uppercase tracking-wider outline-none transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? LEVEL_COLORS[lvl]
                  : "border-border/40 bg-card text-muted-foreground hover:border-border hover:text-foreground active:text-foreground",
              )}
            >
              <span className={cn("size-2 rounded-full", active ? LEVEL_BG[lvl] : "bg-muted")} />
              L{lvl} — {level.title}
              {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          );
        })}
      </div>

      {/* Level content */}
      {activeLevel && levels[activeLevel] && (
        <div ref={contentRef} className="mt-4" role="tabpanel">
          <LevelContent level={levels[activeLevel]!} techniqueName={techniqueName} />
        </div>
      )}
    </div>
  );
}

function LevelContent({ level, techniqueName }: { level: DifficultyLevel; techniqueName: string }) {
  const [exampleSteps, setExampleSteps] = useState<number[]>(() => level.examples.map(() => 0));

  useEffect(() => {
    setExampleSteps(level.examples.map(() => 0));
  }, [level]);

  const handleReveal = useCallback((index: number, total: number) => {
    setExampleSteps((prev) => {
      const next = [...prev];
      next[index] = Math.min(next[index] + 1, total);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Explanation */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <p className="text-fluid-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-2">
          Explanation
        </p>
        <p className="text-fluid-sm leading-relaxed text-foreground">{level.explanation}</p>
      </div>

      {/* Examples via TextScaffold (spec-compliant step reveal) */}
      {level.examples.length > 0 && (
        <div>
          <p className="text-fluid-sm font-bold tracking-[0.1em] text-foreground mb-3">
            Examples
          </p>
          <div className="flex flex-col gap-3">
            {level.examples.map((ex, i) => {
              const template = exampleToTemplate(ex, techniqueName, level.level, i);
              return (
                <RendererRouter
                  key={i}
                  template={template}
                  visibleSteps={exampleSteps[i] ?? 0}
                  mode="solve_along"
                  onStepReveal={() => handleReveal(i, ex.steps.length)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Practice Questions */}
      {level.questions.length > 0 && (
        <div>
          <p className="text-fluid-sm font-bold tracking-[0.1em] text-foreground mb-3">
            Practice Questions
          </p>
          <div className="flex flex-col gap-3">
            {level.questions.map((q) => (
              <PracticeQuestionCard key={q.id} question={q} techniqueName={techniqueName} />
            ))}
          </div>
        </div>
      )}

      {/* Common Traps */}
      {level.commonTraps.length > 0 && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-destructive" />
            <p className="text-fluid-xs font-bold uppercase tracking-[0.15em] text-destructive">
              Common Traps
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {level.commonTraps.map((trap, i) => (
              <li key={i} className="flex items-start gap-2 text-fluid-xs text-muted-foreground">
                <span className="text-destructive mt-0.5">•</span>
                {trap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Speed Tips */}
      {level.speedTips.length > 0 && (
        <div className="rounded-xl border border-chart-3/20 bg-chart-3/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-chart-3" />
            <p className="text-fluid-xs font-bold uppercase tracking-[0.15em] text-chart-3">
              Speed Tips
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {level.speedTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-fluid-xs text-muted-foreground">
                <span className="text-chart-3 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PracticeQuestionCard({
  question,
}: {
  question: TechniquePracticeQuestion;
  techniqueName: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  };

  const isCorrect = question.correctIndex !== undefined && selected === question.correctIndex;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <p className="text-fluid-sm font-semibold text-foreground mb-3">{question.text}</p>

      {question.options ? (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => {
            const optSelected = selected === i;
            const optCorrect = question.correctIndex === i;
            let variant = "border-border/40 bg-card text-foreground hover:border-border active:border-border active:bg-accent/40";
            if (revealed) {
              if (optCorrect) variant = "border-primary bg-primary/10 text-primary";
              else if (optSelected) variant = "border-destructive bg-destructive/10 text-destructive";
              else variant = "border-border/20 bg-card/50 text-muted-foreground/40";
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                disabled={revealed}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${variant}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-fluid-xs font-bold text-muted-foreground">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 text-fluid-sm font-medium">{opt}</span>
                {revealed && optCorrect && <Check size={16} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-fluid-xs text-muted-foreground/60">
            Answer: {question.answer}
          </p>
        </div>
      )}

      {revealed && (
        <div className="mt-3 rounded-lg bg-primary/5 p-3 border border-primary/10">
          <p className="text-fluid-xs text-muted-foreground">
            <span className={cn("font-bold", isCorrect ? "text-chart-3" : "text-destructive")}>
              {isCorrect ? "✓ Correct!" : "✗ Not quite."}
            </span>{" "}
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
