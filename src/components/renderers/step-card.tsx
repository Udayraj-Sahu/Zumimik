"use client";

import type { SolutionStep } from "@/lib/types/template";
import { cn } from "@/lib/utils";

interface StepCardProps {
  step: SolutionStep;
  visible: boolean;
  isLast: boolean;
}

export default function StepCard({ step, visible, isLast }: StepCardProps) {
  return (
    <div
      role="listitem"
      className={cn(
        "rounded-xl border px-4 py-3 transition-all duration-300",
        visible
          ? "border-primary/30 bg-primary/5 opacity-100"
          : "border-border/30 bg-muted/30 opacity-40",
      )}
    >
      {visible ? (
        <div className="flex items-center gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-fluid-xs font-bold text-primary">
            {step.step_num}
          </span>
          <span className="flex-1 text-fluid-sm font-medium text-foreground">
            {step.operation}
          </span>
          {isLast && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-fluid-xs font-bold text-primary">
              Result
            </span>
          )}
        </div>
      ) : (
        <span className="text-fluid-xs text-muted-foreground/60">
          Step locked — click &quot;Show Next Step&quot;
        </span>
      )}
    </div>
  );
}
