"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRINT_CONFIG } from "@/lib/mock/sprint";

const PAGE_SIZE = SPRINT_CONFIG.lengths[SPRINT_CONFIG.lengths.length - 1];

interface QuestionNavigatorProps {
  count: number;
  currentIndex: number;
  answered: boolean[];
  onSelect: (index: number) => void;
  progress?: number;
}

export function QuestionNavigator({
  count,
  currentIndex,
  answered,
  onSelect,
  progress,
}: QuestionNavigatorProps) {
  const pct = Math.max(
    0,
    Math.min(
      100,
      typeof progress === "number" ? progress : (answered.filter(Boolean).length / count) * 100,
    ),
  );
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(Math.floor(currentIndex / PAGE_SIZE));
  }, [currentIndex]);

  const rangeStart = page * PAGE_SIZE;
  const rangeEnd = Math.min(count, rangeStart + PAGE_SIZE);
  const hasPrevPage = page > 0;
  const hasNextPage = page < pageCount - 1;

  return (
    <div className="pt-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
          Question
        </p>
        <span className="font-mono text-[10px] font-bold text-muted-foreground/40">
          {answered.filter(Boolean).length}/{count} done
        </span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={!hasPrevPage}
            aria-label="Previous questions"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-mono text-[11px] font-bold text-foreground/80">
            {rangeStart + 1}–{rangeEnd} / {count}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={!hasNextPage}
            aria-label="Next questions"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))" }}>
        {Array.from({ length: rangeEnd - rangeStart }, (_, k) => rangeStart + k).map((i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = !!answered[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Question ${i + 1}${isAnswered ? " (answered)" : isCurrent ? " (current)" : ""}`}
              className={cn(
                "grid size-9 place-items-center rounded-lg text-micro font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent
                  ? "border border-primary bg-chrome-active text-primary"
                  : isAnswered
                    ? "bg-primary/20 text-primary"
                    : "border border-white/[0.06] bg-white/[0.02] text-muted-foreground/50 hover:text-muted-foreground",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}