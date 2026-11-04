import { cn } from "@/lib/utils";

type HeroCardProps = {
  title?: string;
  accent?: string;
  body?: string;
  className?: string;
};

const DEFAULT_TITLE = "Unfair prep. Zero friction.";
const DEFAULT_ACCENT = "Engineered for 99+ %ile.";
const DEFAULT_BODY =
  "Stop managing study schedules. Neon Dojo automates your daily drill volume, diagnoses weak spots, and builds effortless calculation instincts.";

/**
 * Brand hero used as the opening slide of the arena intro. The near-black card
 * and neon accent are authored through theme tokens (`--panel`, `--lime`, ...)
 * so the card tracks the active light/dark theme instead of pinning raw hex.
 */
export function HeroCard({
  title = DEFAULT_TITLE,
  accent = DEFAULT_ACCENT,
  body = DEFAULT_BODY,
  className,
}: HeroCardProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-[18px] border border-[var(--glass-border)] bg-[var(--panel)] p-5",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[10%] left-[72%] h-[120%] w-px rotate-[18deg] opacity-60"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--lime) 40%, var(--lime) 60%, transparent)",
        }}
      />
      <h2 className="text-[clamp(20px,6vw,26px)] font-extrabold uppercase leading-[1.05] tracking-tight text-foreground">
        {title}
        <span className="mt-1 block text-[var(--lime)]">{accent}</span>
      </h2>
      <p className="mt-3 max-w-[32ch] text-[13px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
