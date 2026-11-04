"use client";

import { AlertTriangle } from "lucide-react";

interface TrapBadgeProps {
  traps: string[];
  userAnswer: string | null;
}

export default function TrapBadge({ traps, userAnswer }: TrapBadgeProps) {
  if (!traps.length) return null;

  const matched = userAnswer
    ? traps.filter((t) => t.toLowerCase().includes(userAnswer.toLowerCase()))
    : [];

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0 text-destructive"
        />
        <div>
          <p className="text-fluid-xs font-bold uppercase tracking-wider text-destructive">
            Common Mistakes
          </p>
          <ul className="mt-2 space-y-1">
            {traps.map((trap, i) => (
              <li
                key={i}
                className={`rounded-lg px-3 py-1.5 text-fluid-xs ${
                  matched.includes(trap)
                    ? "bg-destructive/10 font-bold text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {matched.includes(trap) && "⚠ "}
                {trap}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
