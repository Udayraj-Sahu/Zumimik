"use client";

import { useCallback, useMemo, useEffect, useRef, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import gsap from "gsap";
import type { SolveAlongTemplate, RenderMode } from "@/lib/types/template";
import { cn } from "@/lib/utils";
import StepCard from "./step-card";
import HintDrawer from "./hint-drawer";
import TrapBadge from "./trap-badge";
import AnswerInput from "./answer-input";

interface TextScaffoldProps {
  template: SolveAlongTemplate;
  visibleSteps: number;
  mode: RenderMode;
  children?: ReactNode;
  onStepReveal?: () => void;
  onCorrect?: () => void;
  onWrong?: () => void;
  showAnswerInput?: boolean;
  showVisualScaffold?: boolean;
  showStepCards?: boolean;
  onShowFirstStep?: () => void;
  onShowNextStep?: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
}

function extractAnswer(example: {
  solution?: { operation: string; result?: string }[];
  answer?: string;
}): string {
  if (example.answer) return example.answer;
  const steps = example.solution ?? [];
  if (steps.length > 0) {
    const last = steps[steps.length - 1];
    if (last.result) return last.result;
    const eqMatch = last.operation.match(/=\s*([\d,]+)$/);
    if (eqMatch) return eqMatch[1];
  }
  return "";
}

export default function TextScaffold({
  template,
  visibleSteps,
  mode,
  children,
  onStepReveal,
  onCorrect,
  onWrong,
  showAnswerInput = true,
  showVisualScaffold = true,
  showStepCards = true,
  onShowFirstStep,
  onShowNextStep,
  backDisabled,
  nextDisabled,
}: TextScaffoldProps) {
  const example = useMemo(
    () => template.examples?.[0] ?? { solution: [] },
    [template.examples],
  );
  const steps = useMemo(() => example.solution ?? [], [example.solution]);
  const hints = useMemo(() => template.key_reminders ?? [], [template.key_reminders]);
  const traps = useMemo(() => template.common_mistakes ?? [], [template.common_mistakes]);
  const answer = useMemo(() => extractAnswer(example), [example]);
  const totalSteps = steps.length;
  const allRevealed = visibleSteps >= totalSteps;

  const handleReveal = useCallback(() => {
    onStepReveal?.();
  }, [onStepReveal]);

  const rightControlRef = useRef<HTMLDivElement>(null);
  const prevAllRevealed = useRef(allRevealed);

  useEffect(() => {
    if (allRevealed && !prevAllRevealed.current && rightControlRef.current) {
      gsap.fromTo(
        rightControlRef.current,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
      );
    }
    prevAllRevealed.current = allRevealed;
  }, [allRevealed]);

  return (
    <div className="space-y-5">
      {/* L1: PROBLEM */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-fluid-xs font-bold text-primary">
            {template.concept?.technique_name ?? "Practice"}
          </span>
          <span className="text-fluid-xs text-muted-foreground/50">
            Difficulty: {template.difficulty}/5
          </span>
        </div>
        <h2 className="text-fluid-xl font-bold leading-snug text-foreground">
          {example.problem_statement}
        </h2>
      </div>

      {/* L2: STEPS */}
      {mode !== "quick" && steps.length > 0 && (
        <div role="list" className="space-y-2" aria-label="Solution steps">
          {showStepCards &&
            steps.map((step, i) => (
              <StepCard
                key={step.step_num}
                step={step}
                visible={i < visibleSteps}
                isLast={i === steps.length - 1}
              />
            ))}
          {showStepCards ? (
            <>
              {!allRevealed && mode === "solve_along" && (
                <button
                  type="button"
                  onClick={handleReveal}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-3 text-fluid-xs font-bold uppercase tracking-wider text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Show Next Step ({visibleSteps}/{totalSteps})
                </button>
              )}
              {allRevealed && (
                <p className="text-center text-fluid-xs font-bold text-primary">
                  All steps revealed
                </p>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* L3: HINTS */}
      {mode !== "quick" && hints.length > 0 && (
        <HintDrawer hints={hints} />
      )}

      {/* L4: TRAPS */}
      {traps.length > 0 && allRevealed && (
        <TrapBadge traps={traps} userAnswer={null} />
      )}

      {/* L5: VISUAL — renderer canvas */}
      {showVisualScaffold && children && (
        <div
          className="flex min-h-[72px] items-center justify-center overflow-hidden rounded-2xl border border-border/30 bg-card/50 p-4"
          aria-label="Visual scaffold"
        >
          {!showStepCards && visibleSteps === 0 ? (
            <p className="text-center text-fluid-xs font-semibold text-muted-foreground/60">
              Solution steps appear here as you reveal them — tap &quot;Show Next Step&quot; to begin.
            </p>
          ) : (
            children
          )}
        </div>
      )}

      {/* REVEAL CONTROL — outside the visual scaffold, above the answer */}
      {!showStepCards && mode === "solve_along" && (
        <div className="flex items-stretch gap-2">
          {onShowFirstStep && (
            <div
              className={cn(
                "shrink-0 transition-[width,flex-grow,min-width] duration-500 ease-out",
                allRevealed ? "min-w-[120px] flex-1" : "w-[52px]",
              )}
            >
              <button
                type="button"
                onClick={onShowFirstStep}
                disabled={backDisabled}
                aria-label="Show Previous Step"
                className="flex h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 text-fluid-xs font-bold uppercase tracking-wider text-muted-foreground outline-none transition-opacity hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:text-muted-foreground"
              >
                <ChevronLeft size={16} className="shrink-0" />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-500 ease-out",
                    allRevealed ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0",
                  )}
                >
                  Last Step
                </span>
              </button>
            </div>
          )}
          <div ref={rightControlRef} className="flex min-h-[44px] flex-1">
            {!allRevealed ? (
              <button
                type="button"
                onClick={handleReveal}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-3 text-fluid-xs font-bold uppercase tracking-wider text-primary outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Show Next Step ({visibleSteps}/{totalSteps})
              </button>
            ) : (
              <button
                type="button"
                onClick={onShowNextStep}
                disabled={nextDisabled}
                className="flex h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 text-fluid-xs font-bold uppercase tracking-wider text-muted-foreground outline-none transition-opacity hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
              >
                Next Step
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ANSWER INPUT */}
      {showAnswerInput && (
        <AnswerInput
          expectedAnswer={answer}
          onCorrect={() => onCorrect?.()}
          onWrong={() => onWrong?.()}
          disabled={mode === "quick" && allRevealed}
        />
      )}
    </div>
  );
}
