import {
  ArrowDown,
  Ban,
  CircleCheck,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import styles from "@/components/onboarding/slides/how-it-works.module.css";

type Tone = "cyan" | "violet" | "neon";

type Step = {
  tone: Tone;
  title: string;
  description: string;
  done?: boolean;
};

const STEPS: Step[] = [
  { tone: "cyan", title: "1. Play", description: "A worksheet or 5-minute game." },
  { tone: "violet", title: "2. Scan", description: "One tap to read the results." },
  {
    tone: "neon",
    title: "3. Improve",
    description: "Tomorrow's play targets the weakest skill, every day.",
    done: true,
  },
];

type Badge = { icon: LucideIcon; tone: Tone; label: string };

const BADGES: Badge[] = [
  { icon: ShieldCheck, tone: "neon", label: "DPDP & COPPA compliant" },
  { icon: Ban, tone: "cyan", label: "Ad-free" },
  { icon: Trophy, tone: "violet", label: "Olympiad-style problems" },
];

type Props = {
  index?: string;
  label?: string;
  loopLabel?: string;
  title?: string;
  subtitle?: string;
};

/**
 * "How it works" card shown on slide 7 of the arena intro. One bordered card
 * (header row, title, subtitle, three-step loop) with the compliance badges
 * beneath it. Surfaces, borders and the cyan/violet/neon step tones are authored
 * through theme tokens so the card tracks the active light/dark theme instead
 * of pinning the raw hex of the source mock.
 */
export function HowItWorks({
  index = "05",
  label = "Process",
  loopLabel = "3-step loop",
  title = "How it works",
  subtitle = "A lightweight habit that turns daily play into lasting cognitive growth.",
}: Props) {
  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.top}>
          <span className={styles.lead}>
            <span className={styles.num}>{index}</span>
            {label}
          </span>
          <span className={styles.loop}>{loopLabel}</span>
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.sub}>{subtitle}</p>

        <ol className={styles.steps}>
          {STEPS.map((s) => (
            <li key={s.title} className={styles.step}>
              <span className={`${styles.badge} ${styles[s.tone]}`}>{s.title[0]}</span>
              <div className={styles.body}>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.description}</div>
              </div>
              {s.done ? (
                <CircleCheck size={16} className={styles.done} aria-hidden="true" />
              ) : (
                <ArrowDown size={16} className={styles.arrow} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>

        <ul className={styles.foot}>
          {BADGES.map(({ icon: Icon, tone, label }) => (
            <li key={label} className={styles.chip}>
              <Icon size={15} className={styles[`ic_${tone}`]} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
