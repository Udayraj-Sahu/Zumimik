import { Skull, Zap, type LucideIcon } from "lucide-react";

import styles from "./stop-feeding.module.css";

type Tone = "cyan" | "neon";

type Stat = {
  tone: Tone;
  icon: LucideIcon;
  title: string[];
  caption: string;
};

const STATS: Stat[] = [
  {
    tone: "cyan",
    icon: Skull,
    title: ["6h wasted"],
    caption: "Brain rot / High fatigue",
  },
  {
    tone: "neon",
    icon: Zap,
    title: ["Razor", "focus"],
    caption: "The weapon / High ROI",
  },
];

type Props = {
  line1?: string;
  line2?: string;
  tagline?: string;
};

/**
 * Pitch intro opener. Closing card for the arena's "stop feeding the algorithm"
 * hook: a headline pair, a tagline, a rule and two tinted stat cards (cyan =
 * cost, neon = payoff). Every surface, border and accent is authored through
 * theme tokens (`--panel`, `--cyan-*`, `--neon-*`, ...) so the card tracks the
 * active light/dark theme instead of pinning raw hex.
 */
export default function StopFeeding({
  line1 = "Stop feeding",
  line2 = "The algorithm",
  tagline = "Tactical efficiency",
}: Props) {
  return (
    <section className={styles.wrap}>
      <h2 className={styles.line1}>{line1}</h2>
      <h2 className={styles.line2}>{line2}</h2>
      <p className={styles.tagline}>{tagline}</p>
      <div className={styles.rule} />

      <div className={styles.grid}>
        {STATS.map(({ tone, icon: Icon, title, caption }) => (
          <article key={title.join(" ")} className={`${styles.card} ${styles[tone]}`}>
            <Icon size={22} className={styles.icon} aria-hidden="true" />
            <h3 className={styles.cardTitle}>
              {title.map((t, i) => (
                <span key={i} className={styles.titleLine}>
                  {t}
                </span>
              ))}
            </h3>
            <p className={styles.caption}>{caption}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
