"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ScrollColumnItem = { value: string; label: string };

type Props = {
  items: ScrollColumnItem[];
  selected: string;
  onSelect: (value: string) => void;
  label: string;
  fadeFrom?: string;
};

export function ScrollColumn({ items, selected, onSelect, label, fadeFrom = "var(--card)" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_H = 36;
  const VISIBLE = 3;
  const PAD = Math.floor(VISIBLE / 2);

  useEffect(() => {
    if (!containerRef.current) return;
    const idx = items.findIndex((i) => i.value === selected);
    if (idx >= 0) {
      containerRef.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }
  }, [selected, items]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (items[clamped]?.value !== selected) {
      onSelect(items[clamped].value);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-center text-[9px] font-bold tracking-[0.14em] text-muted-foreground/70 pt-2 pb-1">
        {label}
      </p>
      <div className="relative" style={{ height: ITEM_H * VISIBLE }}>
        <div
          className="absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, ${fadeFrom}, transparent)` }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-8 z-10 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${fadeFrom}, transparent)` }}
        />
        <div
          className="absolute left-1 right-1 h-10 rounded-xl border z-0 pointer-events-none"
          style={{ top: PAD * ITEM_H, background: "var(--accent-08)", borderColor: "var(--accent-25)" }}
        />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollBehavior: "smooth" }}
        >
          <div style={{ height: PAD * ITEM_H }} />
          {items.map((item) => {
            const isActive = item.value === selected;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onSelect(item.value);
                  const idx = items.findIndex((i) => i.value === item.value);
                  containerRef.current?.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
                }}
                className={cn(
                  "w-full flex items-center justify-center snap-center transition-all duration-200",
                  isActive ? "text-primary font-bold text-[15px]" : "text-muted-foreground/50 text-[13px] font-medium",
                )}
                style={{ height: ITEM_H }}
              >
                {item.label}
              </button>
            );
          })}
          <div style={{ height: PAD * ITEM_H }} />
        </div>
      </div>
    </div>
  );
}
