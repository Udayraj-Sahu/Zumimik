"use client";

import { cn } from "@/lib/utils";

type HabitCardProps = {
  seconds?: number;
  delta?: number;
  /** Removes the max-width and glow when the card is hosted inside another surface. */
  bare?: boolean;
  /** Tightens the type scale and spacing so the card fits a fixed-height carousel slide. */
  compact?: boolean;
};

export default function HabitCard({
  seconds = 1.2,
  delta = -0.4,
  bare = false,
  compact = false,
}: HabitCardProps) {
  // Ring progress: faster = fuller ring (capped at 3s scale)
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, 1 - seconds / 3));
  const offset = circumference * (1 - progress);

  // Surface treatment: `bare` is hosted inside the Feature Intro "What's
  // included" carousel and reuses the Core System card surface (lime border,
  // warm panel, lime glow). The standalone cards use the same panel token with
  // the neutral glass border. No hardcoded black: both themes stay readable.
  const shell = bare
    ? "relative w-full overflow-hidden rounded-2xl border border-[var(--lime-40)] bg-[var(--panel-warm)] p-4 text-foreground shadow-[0_0_40px_var(--lime-15)]"
    : compact
      ? "relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--panel-warm)] p-5 text-foreground"
      : "relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--panel-warm)] p-6 text-foreground";

  return (
    <div className={shell}>
      {/* Top label row */}
      {!compact && (
        <div className="mb-4 flex items-center justify-end text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="rounded border border-[var(--glass-border)] px-2 py-0.5 text-[9px] text-muted-foreground/80">
            Core Loop
          </span>
        </div>
      )}

      {/* Headline */}
      <h2
        className={cn(
          "font-extrabold uppercase leading-[1.15] tracking-tight",
          compact ? "text-lg" : "text-xl sm:text-2xl",
        )}
      >
        Automated Habit.
        <br />
        <span className="text-[var(--lime)]">Compounded Speed.</span>
      </h2>

      {/* Velocity panel */}
      <div
        className={cn(
          "rounded-xl border border-[var(--glass-border)] bg-[var(--glass-06)]",
          compact ? "mt-3.5 p-3" : "mt-5 p-4",
        )}
      >
        <p
          className={cn(
            "font-semibold uppercase text-muted-foreground",
            compact ? "text-[9px] tracking-[0.18em]" : "text-[10px] tracking-[0.2em]",
          )}
        >
          Micro-Speed Velocity
        </p>

        <div className={cn("flex items-center", compact ? "mt-2.5 gap-3" : "mt-3 gap-4")}>
          {/* Gauge */}
          <div className={cn("relative shrink-0", compact ? "h-10 w-10" : "h-14 w-14")}>
            <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke="var(--glass-10)"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke="var(--lime)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="drop-shadow-[0_0_4px_rgba(163,230,53,0.35)] transition-all duration-700"
              />
            </svg>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center font-bold",
                compact ? "text-[10px]" : "text-[11px]",
              )}
            >
              {seconds.toFixed(1)}s
            </span>
          </div>

          <div className="min-w-0">
            <p
              className={cn(
                "font-bold text-[var(--lime)]",
                compact ? "text-[13px]" : "text-base sm:text-lg",
              )}
            >
              {seconds.toFixed(1)}s / calculation{" "}
              <span
                className={cn(
                  "font-medium text-[var(--lime)] opacity-70",
                  compact ? "text-[10px]" : "text-xs",
                )}
              >
                ({delta > 0 ? "+" : ""}
                {delta.toFixed(1)}s)
              </span>
            </p>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-06)] font-semibold uppercase tracking-wider text-muted-foreground",
                compact ? "mt-1 px-2 py-0.5 text-[8px]" : "mt-1.5 px-2.5 py-1 text-[9px]",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className={compact ? "h-2.5 w-2.5 fill-[var(--lime)]" : "h-3 w-3 fill-[var(--lime)]"}
                aria-hidden
              >
                <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z" />
              </svg>
              Decay Shield: Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}