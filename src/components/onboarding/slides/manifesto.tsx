import { Orbit, Sparkles, Target, type LucideIcon } from "lucide-react";

import styles from "./manifesto.module.css";

type Tone = "cyan" | "mint" | "violet";

type Line = {
  tone: Tone;
  icon: LucideIcon;
  text: string;
};

const LINES: Line[] = [
  {
    tone: "cyan",
    icon: Target,
    text: "Stop letting TikTok lobotomize you. Reclaim your focus.",
  },
  {
    tone: "mint",
    icon: Sparkles,
    text: "Social feeds steal potential. We build it.",
  },
  {
    tone: "violet",
    icon: Orbit,
    text: "Escape the matrix of cheap dopamine.",
  },
];

type Props = {
  caption?: string;
};

/**
 * Pitch intro slide 2. Three tinted manifesto statements (cyan / mint / violet)
 * separated by a rule from the product caption. Every surface, border and accent
 * is authored through theme tokens (`--panel`, `--cyan-*`, `--mint-*`,
 * `--violet-*`, ...) so the card tracks the active light/dark theme instead of
 * pinning raw hex.
 */
export default function Manifesto({
  caption = "Free adaptive learning with ads. Works seamlessly offline. You configure the time, our tutor handles practice, revision, and new topics.",
}: Props) {
  return (
    <section className={styles.wrap}>
      <ul className={styles.list}>
        {LINES.map(({ tone, icon: Icon, text }) => (
          <li key={text} className={styles.row}>
            <span className={`${styles.icon} ${styles[tone]}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <p className={styles.text}>{text}</p>
          </li>
        ))}
      </ul>

      <div className={styles.rule} />

      <p className={styles.caption}>{caption}</p>
    </section>
  );
}
