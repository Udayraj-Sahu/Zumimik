import { Brain, Flame, Layers, Timer, type LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description?: string;
  tag?: string;
};

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: "Adaptive Neural Engine",
    description: "Finds your weak spots and drills them.",
    tag: "Core",
  },
  {
    icon: Timer,
    title: "Automated Daily Practice",
    description: "Daily micro-drills, no decisions needed.",
    tag: "Daily",
  },
  {
    icon: Layers,
    title: "Unlimited Full Mocks & Analytics",
    description: "CAT, GMAT & GRE mocks with analytics.",
    tag: "Mocks",
  },
  {
    icon: Flame,
    title: "Autonomic Habit Tracker",
    description: "Tracks streaks and locks in the habit.",
    tag: "Habit",
  },
];

/**
 * Critical-systems feature list shown on slide 2 of the arena intro. Card
 * surfaces, borders and the neon accent are authored through theme tokens so
 * the list tracks the active light/dark theme instead of pinning raw hex.
 */
export function FeatureList() {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[14px] border border-[var(--glass-border)] bg-[var(--panel)] px-3 py-3 sm:px-4 sm:py-4">
      <p className="mb-2 shrink-0 text-right font-mono text-[9px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--lime)] sm:mb-3 sm:text-[10px]">
        {"// Critical systems"}
      </p>
      <ul className="flex min-h-0 flex-1 flex-col justify-center divide-y divide-[var(--glass-border)]">
        {FEATURES.map(({ icon: Icon, title, description, tag }) => (
          <li
            key={title}
            className="flex min-h-0 flex-1 items-center gap-2.5 overflow-hidden py-2.5 sm:gap-3 sm:py-3"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--lime-25)] bg-[var(--lime-07)] text-[var(--lime)] sm:size-9">
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-foreground sm:text-[15px]">
                  {title}
                </h3>
                {tag && (
                  <span className="shrink-0 rounded-md bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-[9px] uppercase leading-none tracking-[0.08em] text-muted-foreground sm:px-2 sm:py-[3px] sm:text-[10px]">
                    {tag}
                  </span>
                )}
              </div>
              {description && (
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground sm:mt-1 sm:text-[12px]">
                  {description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
