"use client";

import { Lightbulb, Zap, AlertTriangle, Sigma } from "lucide-react";
import type { QuickReferenceCard } from "@/lib/types/technique";

export function QuickReferenceCard({ card }: { card: QuickReferenceCard }) {
  const items = [
    { icon: Sigma, label: "Formula", value: card.formula, color: "text-primary" },
    { icon: Lightbulb, label: "Key Idea", value: card.keyIdea, color: "text-chart-3" },
    { icon: Zap, label: "Shortcut", value: card.shortcut, color: "text-chart-4" },
    { icon: AlertTriangle, label: "Common Mistake", value: card.commonMistake, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-xl border border-border/40 bg-card p-4 flex items-start gap-3">
            <div className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted", item.color)}>
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-fluid-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
                {item.label}
              </p>
              <p className="text-fluid-sm leading-relaxed text-foreground">{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { cn } from "@/lib/utils";
