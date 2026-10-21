"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./StallTimer.module.css";

const COUNT_MS = 650;

type ModeId = "today" | "zuzumik";

type Mode = {
  id: ModeId;
  label: string;
  /** Minutes lost to stalls in this run. */
  minutes: number;
  /** Tone token: the unassisted run reads red, the assisted one reads lime. */
  tone: "red" | "neon";
  line: string;
};

/** The two runs compared on the slide. */
const MODES: Mode[] = [
  {
    id: "today",
    label: "Today",
    minutes: 9,
    tone: "red",
    line: "Six left. The clock is winning.",
  },
  {
    id: "zuzumik",
    label: "With zuzumik",
    minutes: 3,
    tone: "neon",
    line: "Stalls found. Time back.",
  },
];

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

/** Spells small counts out ("Six questions left") and falls back to digits. */
function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/**
 * Counts toward `target` while the slide is active. Leaving the active state
 * resets to 0 so the next visit replays, a target change animates from the
 * value currently on screen (so switching runs never jumps), and reduced motion
 * jumps straight to the final value.
 */
function useCountTo(target: number, isActive: boolean): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      fromRef.current = 0;
      setValue(0);
      return;
    }

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const from = fromRef.current;
    if (reduced || from === target) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / COUNT_MS, 1);
      const next = from + (target - from) * (1 - (1 - t) ** 3);
      fromRef.current = next;
      setValue(next);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setValue(target);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isActive, target]);

  return value;
}

export type StallTimerProps = {
  /** Minutes left in the section being graded. */
  sectionMinutes?: number;
  /** Questions still unanswered in the section. */
  questionsLeft?: number;
  /**
   * Drives the count-up. The carousel passes the live slide state (true only
   * while this slide is the active one) so nothing animates while the card is
   * merely mounted off-screen. Defaults to true for standalone use.
   */
  isActive?: boolean;
};

/**
 * Pitch intro slide 5. Counts the minutes a section loses to stalls and lets
 * the reader compare the run they would have today against the run with
 * zuzumik: a red readout for the unassisted run, a lime one for the assisted
 * run, a proportional bar and a plain-language verdict. Every surface, border
 * and accent comes from theme tokens (`--panel`, `--tile`, `--neon`, `--red`,
 * ...) so the card tracks the active light/dark theme instead of pinning raw
 * hex.
 */
export default function StallTimer({
  sectionMinutes = 12,
  questionsLeft = 6,
  isActive = true,
}: StallTimerProps) {
  const [modeId, setModeId] = useState<ModeId>("today");

  const minutes = Number.isFinite(sectionMinutes)
    ? Math.max(0, Math.floor(sectionMinutes))
    : 12;
  const questions = Number.isFinite(questionsLeft)
    ? Math.max(0, Math.floor(questionsLeft))
    : 6;

  // A run can never lose more minutes than the section has.
  const modes = MODES.map((m) => ({ ...m, minutes: Math.min(m.minutes, minutes) }));
  const mode = modes.find((m) => m.id === modeId) ?? modes[0];
  const worst = Math.max(1, ...modes.map((m) => m.minutes));

  const value = useCountTo(mode.minutes, isActive);
  const shown = Math.round(value);
  const ratio = Math.max(0, Math.min(1, value / worst));
  const left = Math.max(0, minutes - shown);

  return (
    <section className={styles.card}>
      <p className={styles.head}>
        Section ends in {minutes} minutes. {numberWord(questions)} questions left.
      </p>

      <div className={styles.seg} role="group" aria-label="Compare time lost to stalls">
        {modes.map((m) => {
          const on = m.id === modeId;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => setModeId(m.id)}
              className={`${styles.chip} ${on ? styles.chipOn : ""}`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className={styles.body}>
        <div className={styles.figure}>
          <b className={`${styles.value} ${mode.tone === "red" ? styles.red : styles.neon}`}>
            {shown}
          </b>
          <span className={styles.caption}>minutes lost to stalls</span>
        </div>

        <div className={styles.detail}>
          <div
            className={styles.track}
            role="img"
            aria-label={`${shown} of ${worst} minutes lost to stalls`}
          >
            <div
              className={`${styles.fill} ${mode.tone === "red" ? styles.fillRed : styles.fillNeon}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <h2 className={styles.message} aria-live="polite">
            {mode.line}
          </h2>
        </div>
      </div>

      <dl className={styles.stats} aria-label="Section breakdown">
        <div>
          <dt>Section time</dt>
          <dd>{minutes} min</dd>
        </div>
        <div>
          <dt>Lost to stalls</dt>
          <dd className={mode.tone === "red" ? styles.red : styles.neon}>{shown} min</dd>
        </div>
        <div>
          <dt>Left to solve</dt>
          <dd>{left} min</dd>
        </div>
      </dl>

      <p className={styles.footnote}>
        A stall is any question where the clock runs but no answer lands.
      </p>
    </section>
  );
}
