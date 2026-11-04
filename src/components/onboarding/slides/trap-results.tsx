"use client";

import { useEffect, useState } from "react";

import styles from "./trap-results.module.css";

type Kind = "right" | "trap" | "other";

type Option = {
  value: string;
  pct: number;
  kind: Kind;
};

const DEFAULT_OPTIONS: Option[] = [
  { value: "15", pct: 58, kind: "right" },
  { value: "25", pct: 31, kind: "trap" },
  { value: "9", pct: 7, kind: "other" },
];

const KIND_CLASS: Record<Kind, string> = {
  right: styles.right,
  trap: styles.trap,
  other: styles.other,
};

const PCT_CLASS: Record<Kind, string> = {
  right: styles.pctRight,
  trap: styles.pctTrap,
  other: "",
};

const KIND_LABEL: Record<Kind, string> = {
  right: "correct answer",
  trap: "common wrong answer",
  other: "other answer",
};

type Props = {
  question?: string;
  options?: Option[];
  fix?: string;
};

/**
 * Pitch intro slide 4. Names the trap after a question is missed: the question,
 * the answers with animated percentage bars (correct / trap / other) and the
 * fix. Bars use theme tokens (`--neon` for the correct answer, `--red` for the
 * trap, `--muted-foreground` for the rest) so the panel tracks the active
 * light/dark theme instead of pinning raw hex.
 */
export default function TrapResults({
  question = "A : B = 3 : 5. Add 10 to each and it becomes 5 : 7. Find A.",
  options = DEFAULT_OPTIONS,
  fix = "The fix, in 10 seconds: write 3k and 5k. Solve for k first, then ask what A is.",
}: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduced) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rows = Array.isArray(options) ? options : [];

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Then it shows you the trap.</h2>
      <p className={styles.sub}>Who fell. How many. What fixes it.</p>

      <div className={styles.panel}>
        <p className={styles.q}>{question}</p>

        <ul className={styles.bars}>
          {rows.map((o) => (
            <li className={styles.row} key={o.value}>
              <span className={styles.val}>{o.value}</span>
              <div
                className={styles.track}
                role="img"
                aria-label={`Answer ${o.value}: ${o.pct} percent, ${KIND_LABEL[o.kind] ?? "answer"}`}
              >
                <div
                  className={`${styles.fill} ${KIND_CLASS[o.kind] ?? styles.other}`}
                  style={{ width: shown ? `${o.pct}%` : 0 }}
                />
              </div>
              <span className={`${styles.pct} ${PCT_CLASS[o.kind] ?? ""}`}>{o.pct}%</span>
            </li>
          ))}
        </ul>

        <div className={styles.fix}>{fix}</div>
      </div>
    </section>
  );
}
