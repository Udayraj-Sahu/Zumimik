import styles from "./AlgorithmPitch.module.css";

const POINTS = [
  "Your feed trains you to scroll. We train you to think.",
  "Social feeds take your attention. We hand it back.",
  "Cheap dopamine fades. Faster hands don’t.",
];

/**
 * Pitch intro slide 1. The "stop feeding the algorithm" opener: a headline, a
 * green subtitle, two rounded statistic tiles (red = cost, green = payoff), a
 * list of three points and the supporting caption. Every surface, border and
 * accent is authored through theme tokens (`--panel`, `--tile`, `--neon`,
 * `--red`, ...) so the card tracks the active light/dark theme instead of
 * pinning raw hex.
 */
export default function AlgorithmPitch() {
  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.title}>Stop feeding the algorithm.</h2>
        <p className={styles.sub}>Six hours scrolled. Six minutes that count.</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <b className={`${styles.statValue} ${styles.statValueRed}`}>6h</b>
          <span className={styles.statLabel}>scrolled, nothing kept</span>
        </div>
        <div className={styles.stat}>
          <b className={`${styles.statValue} ${styles.statValueGreen}`}>6 min</b>
          <span className={styles.statLabel}>ranked, faster tomorrow</span>
        </div>
      </div>

      <ul className={styles.points}>
        {POINTS.map((point) => (
          <li key={point} className={styles.point}>
            <i className={styles.dot} aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <p className={styles.fine}>
        Free with ads. Works offline. You set the time. We pick the drills.
      </p>
    </section>
  );
}
