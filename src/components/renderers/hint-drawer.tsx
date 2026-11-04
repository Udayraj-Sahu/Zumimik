"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface HintDrawerProps {
  hints: string[];
}

export default function HintDrawer({ hints }: HintDrawerProps) {
  const [open, setOpen] = useState(false);

  if (!hints.length) return null;

  return (
    <div className="rounded-xl border border-chart-3/20 bg-chart-3/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-h-[44px] items-center gap-2 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <Lightbulb size={16} className="shrink-0 text-chart-3" />
        <span className="flex-1 text-fluid-xs font-bold uppercase tracking-wider text-chart-3">
          {open ? "Hide Hints" : `${hints.length} Hint${hints.length > 1 ? "s" : ""}`}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-chart-3 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-3">
          {hints.map((hint, i) => (
            <p
              key={i}
              className="rounded-lg bg-card/50 px-3 py-2 text-fluid-xs text-muted-foreground"
            >
              <span className="font-bold text-chart-3">{i + 1}.</span> {hint}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
