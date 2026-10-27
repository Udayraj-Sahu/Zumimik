"use client";

import styles from "./first-ghost-cta.module.css";

export type FirstGhostStat = {
  value: string;
  label: string;
  tone: "bad" | "good";
};

export type FirstGhostCtaProps = {
  title: string;
  tagline: string;
  stats: [FirstGhostStat, FirstGhostStat];
  points: string[];
  note: string;
};

const TITLE_ID = "first-ghost-cta-title";

/**
 * Arena intro slide 1: the first-three-seconds hook. A comparison of the time a
 * section loses to stalls before and after the radar, then the three promises.
 * The card owns its surface through theme tokens (`--panel`, `--tile`,
 * `--neon`, `--red`, ...), so it tracks the active light/dark theme instead of
 * pinning raw hex. One vertical column at every width.
 */
export default function FirstGhostCta({
  title,
  tagline,
  stats,
  points,
  note,
}: FirstGhostCtaProps) {
  return (
    <section className={styles.card} aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className={styles.title}>
        {title}
      </h2>
      <p className={styles.tagline}>{tagline}</p>

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${styles.stat} ${stat.tone === "bad" ? styles.bad : styles.good}`}
          >
            <b className={styles.statValue}>{stat.value}</b>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <ul className={styles.points}>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <p className={styles.note}>{note}</p>
    </section>
  );
}
