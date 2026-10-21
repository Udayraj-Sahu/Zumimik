import styles from "./FirstMoveTimes.module.css";

/** Seconds before the first move, per question (sample data: replace with real results). */
const SAMPLE = [1.4, 3.1, 1.1, 1.8, 3.8, 1.6, 1.5, 3.0, 1.3, 1.2, 3.3, 1.7];

type Props = {
  /** Seconds before the first move, per question. */
  times?: number[];
  /** A question is a "stall" when its time is above this many seconds. */
  threshold?: number;
};

/**
 * Pitch intro slide 2. Times the first move on every question: a headline, the
 * stall/elapsed summary, a per-question bar chart with a threshold line and a
 * legend. On-pace bars use the accent token (`--neon`), stalls use `--red`, so
 * the chart tracks the active light/dark theme instead of pinning raw hex.
 * Every input is sanitized, so empty arrays or invalid numbers stay safe.
 */
export default function FirstMoveTimes({ times = SAMPLE, threshold = 2.5 }: Props) {
  const safeTimes = (Array.isArray(times) ? times : []).map((t) =>
    Number.isFinite(t) && t > 0 ? t : 0,
  );
  const safeThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 0;

  const stalls = safeTimes.filter((t) => t > safeThreshold);
  const gone = stalls.reduce((sum, t) => sum + t, 0);
  const max = Math.max(...safeTimes, safeThreshold) * 1.1 || 1;

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>It times your first move.</h2>
      <p className={styles.sub}>Every question. To the tenth of a second.</p>

      <div className={styles.chart}>
        <div className={styles.cap}>Seconds before the first move, per question</div>

        <p className={styles.big} aria-live="polite">
          <span className={styles.stall}>
            {stalls.length} {stalls.length === 1 ? "stall" : "stalls"}.
          </span>{" "}
          <span className={styles.gone}>{gone.toFixed(1)}s gone.</span>
        </p>

        <div
          className={styles.plot}
          role="img"
          aria-label={`${stalls.length} stalls out of ${safeTimes.length} questions`}
        >
          {safeThreshold > 0 && (
            <div
              className={styles.line}
              style={{ bottom: `${(safeThreshold / max) * 100}%` }}
              aria-hidden="true"
            />
          )}
          {safeTimes.map((t, i) => (
            <div className={styles.col} key={i}>
              <div
                className={`${styles.bar} ${t > safeThreshold ? styles.barStall : styles.pace}`}
                style={{ height: `${(t / max) * 100}%` }}
                title={`Q${i + 1}: ${t.toFixed(1)}s`}
              />
              <span className={styles.n}>{i + 1}</span>
            </div>
          ))}
        </div>

        <div className={styles.legend}>
          <span>
            <i className={`${styles.swatch} ${styles.pace}`} aria-hidden="true" /> On pace
          </span>
          <span>
            <i className={`${styles.swatch} ${styles.barStall}`} aria-hidden="true" /> Stall
          </span>
        </div>
      </div>
    </section>
  );
}
