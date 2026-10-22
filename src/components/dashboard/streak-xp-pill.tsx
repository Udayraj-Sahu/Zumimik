"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./streak-xp-pill.module.css";

type Props = {
  streak: number;
  xp: number;
  done: boolean;
  className?: string;
};

function Odometer({ value }: { value: number }) {
  const s = value.toLocaleString("en-US");
  const digits = s.replace(/,/g, "");
  let di = 0;

  return (
    <span className={styles.odo} aria-hidden="true">
      {s.split("").map((c, i) => {
        if (!/\d/.test(c)) return <span key={i}>{c}</span>;
        const idx = di++;
        const total = digits.length;
        return (
          <span className={styles.dg} key={i}>
            <span
              className={styles.col}
              style={{
                transform: `translateY(-${Number(digits[idx]) * 1.25}em)`,
                transitionDelay: `${(total - 1 - idx) * 45}ms`,
              }}
            >
              {Array.from({ length: 10 }, (_, k) => (
                <b key={k}>{k}</b>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

const Flame = ({ filled }: { filled: boolean }) => (
  <svg className={styles.flame} viewBox="0 0 24 24" aria-hidden="true">
    {filled ? (
      <path
        fill="currentColor"
        d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"
      />
    ) : (
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M12 3c1 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"
      />
    )}
  </svg>
);

/**
 * Combined streak + XP readout for the dashboard header. It keeps the existing
 * header row (mascot, mobile mark, appearance trigger) and only upgrades the
 * two separate pills into one inset surface with the reference's odometer,
 * streak bump, +XP float and 1,000-XP gold beat.
 */
export function StreakXpPill({ streak, xp, done, className }: Props) {
  const prevXp = useRef(xp);
  const [gainKey, setGainKey] = useState(0);
  const [gold, setGold] = useState(false);

  useEffect(() => {
    if (xp > prevXp.current) {
      setGainKey((k) => k + 1);
      if (Math.floor(xp / 1000) > Math.floor(prevXp.current / 1000)) {
        setGold(true);
        const timer = setTimeout(() => setGold(false), 1100);
        prevXp.current = xp;
        return () => clearTimeout(timer);
      }
    }
    prevXp.current = xp;
  }, [xp]);

  return (
    <div className={cn(styles.wrap, className)}>
      {gainKey > 0 && (
        <span key={gainKey} className={styles.gain} aria-hidden="true">
          +XP
        </span>
      )}
      <div className={cn(styles.pill, done && styles.done)} data-done={done || undefined}>
        <Flame filled={done} />
        <span className={styles.streak}>
          <span key={streak} className={styles.bump}>{streak}D</span>
        </span>
        <i className={styles.dot} />
        <span className={cn(styles.xp, gold && styles.gold)} data-gold={gold || undefined}>
          <Odometer key={String(xp).length} value={xp} />
        </span>
        <span className={styles.unit}>XP</span>
      </div>
      <span className={styles.sr} role="status" aria-live="polite">
        {streak} day streak, {xp.toLocaleString("en-US")} XP
      </span>
    </div>
  );
}
