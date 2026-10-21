import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type SpeedCardProps = {
  seconds?: number;
  delta?: number;
  progress?: number;
  className?: string;
};

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Speed slide for the arena intro (slide 4). Card surfaces, borders and the
 * amber accent are authored through theme tokens (`--panel`, `--amber`,
 * `--lime`, ...) so the card tracks the active light/dark theme instead of
 * pinning raw hex.
 */
export function SpeedCard({
  seconds = 1.2,
  delta = 0.4,
  progress = 0.75,
  className,
}: SpeedCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 rounded-[18px] border border-[var(--glass-border)] bg-[var(--panel)] p-[18px] sm:p-5",
        className,
      )}
    >
      <div className="shrink-0 space-y-2">
        <h3 className="text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-foreground sm:text-[18px]">
          Automated habit. <span className="text-[var(--amber)]">Compounded speed.</span>
        </h3>

        <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-[12px]">
          Adaptive spaced reps and neuro-decay monitoring engineered for frictionless sub-second
          mental calculations.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-4 rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-02)] p-4 sm:p-5">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <div className="relative size-24 sm:size-28">
            <svg viewBox="0 0 64 64" aria-hidden="true" className="size-full">
              <circle
                cx="32"
                cy="32"
                r={RADIUS}
                fill="none"
                stroke="var(--border)"
                strokeWidth={5}
              />
              <circle
                cx="32"
                cy="32"
                r={RADIUS}
                fill="none"
                stroke="var(--amber)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
                transform="rotate(-90 32 32)"
                style={{ transition: "stroke-dasharray 500ms ease" }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[14px] font-bold text-foreground sm:text-[16px]">
              {seconds.toFixed(1)}s
            </span>
          </div>
          <span className="font-mono text-[9px] uppercase leading-none tracking-[0.12em] text-muted-foreground">
            Sub-second goal
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 sm:gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">
            Micro-speed velocity
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-bold text-foreground sm:text-[16px]">
              {seconds.toFixed(1)}s / calculation
            </span>
            <span className="font-mono text-[12px] font-semibold text-[var(--lime)] sm:text-[13px]">
              (-{delta.toFixed(1)}s)
            </span>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--amber-30)] bg-[var(--amber-08)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.04em] text-[var(--amber)]">
            <ShieldCheck size={13} aria-hidden="true" />
            Decay shield: active
          </span>
        </div>
      </div>
    </div>
  );
}
