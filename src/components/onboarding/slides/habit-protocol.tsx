import { Gauge, RefreshCw, Shield, type LucideIcon } from "lucide-react";

type Tone = "amber" | "green";

type HabitItem = {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
  tag?: string;
};

const ITEMS: HabitItem[] = [
  {
    icon: Gauge,
    tone: "amber",
    title: "Micro-skills acceleration",
    tag: "Reflex mode",
    description: "Sub-second mental calculation drills calibrated to reflex speed.",
  },
  {
    icon: RefreshCw,
    tone: "green",
    title: "Automated spaced revision",
    description: "Dynamic auto-scheduling before retention drops below 90%.",
  },
  {
    icon: Shield,
    tone: "amber",
    title: "Skill depreciation sentinel",
    description: "Real-time telemetry flagging vulnerable formula nodes.",
  },
];

/**
 * Habit-protocol card shown on slide 5 of the arena intro. Mirrors the slide-2
 * feature list: one bordered card surface with divided rows (no nested cards).
 * Surfaces, borders and the amber/green accents are authored through theme
 * tokens (`--panel`, `--amber`, `--emerald`, ...) so the card tracks the active
 * light/dark theme instead of pinning the raw hex of the source mock.
 */
const TONE: Record<Tone, string> = {
  amber: "border-[var(--amber-30)] bg-[var(--amber-08)] text-[var(--amber)]",
  green: "border-[var(--emerald-30)] bg-[var(--emerald-12)] text-[var(--emerald)]",
};

export function HabitProtocol() {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[14px] border border-[var(--glass-border)] bg-[var(--panel)] px-3 py-3 sm:px-4 sm:py-4">
      <header className="mb-2 flex shrink-0 items-center justify-between gap-2 sm:mb-3">
        <h2 className="text-[12px] font-medium uppercase leading-none tracking-[0.14em] text-muted-foreground sm:text-[13px]">
          Habit protocol
        </h2>
        <span className="font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-[var(--amber)] sm:text-[11px]">
          Autonomous pipeline
        </span>
      </header>

      <ul className="flex min-h-0 flex-1 flex-col justify-center divide-y divide-[var(--glass-border)]">
        {ITEMS.map(({ icon: Icon, tone, title, description, tag }) => (
          <li
            key={title}
            className="flex min-h-0 flex-1 items-center gap-2.5 overflow-hidden py-2.5 sm:gap-3 sm:py-3"
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg border sm:size-9 ${TONE[tone]}`}
            >
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3 className="text-[13px] font-bold uppercase leading-snug tracking-[0.04em] text-foreground sm:text-[15px]">
                  {title}
                </h3>
                {tag && (
                  <span className="font-mono text-[10px] uppercase leading-none tracking-[0.06em] text-[var(--amber)]">
                    {tag}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground sm:mt-1 sm:text-[12px]">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
