import { cn } from "@/lib/utils";
import type { TechniqueStateName } from "@vmsg/shared-types";
import { STATE_LABEL } from "@/lib/learning/mastery-view";

const TONE: Record<TechniqueStateName, string> = {
  fractured: "border-[var(--red-soft-25)] text-[var(--red-soft)]",
  fragile: "border-[var(--amber)]/40 text-[var(--amber)]",
  fluid: "border-[var(--cta-lime)]/40 text-[var(--cta-lime)]",
};

/** One of Fractured / Fragile / Fluid, from the learner's own history. Renders nothing when there is none. */
export function MasteryStateChip({ state, className }: { state: TechniqueStateName | undefined; className?: string }) {
  if (!state) return null;
  return (
    <span data-testid="mastery-state" data-state={state} className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", TONE[state], className)}>
      {STATE_LABEL[state]}
    </span>
  );
}
