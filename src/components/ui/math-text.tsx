"use client";
import { useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";

type Katex = { render: (tex: string, element: HTMLElement, options: Record<string, unknown>) => void };

// KaTeX is loaded on first use, so the screens that never show a formula do not pay for it.
let katexPromise: Promise<Katex> | null = null;
function loadKatex(): Promise<Katex> {
  katexPromise ??= import("katex").then((m) => ((m as unknown as { default?: Katex }).default ?? (m as unknown as Katex)));
  return katexPromise;
}

/** Splits "Evaluate $x^2$ and $$y$$" into text and math parts. Everything between single or double dollar signs is math. */
export function splitMath(text: string): Array<{ math: boolean; value: string; display: boolean }> {
  const parts: Array<{ math: boolean; value: string; display: boolean }> = [];
  const re = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ math: false, value: text.slice(last, m.index), display: false });
    parts.push({ math: true, value: (m[1] ?? m[2]).trim(), display: m[1] !== undefined });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, value: text.slice(last), display: false });
  return parts;
}

/** One formula, drawn by KaTeX into its own element. The page never injects an HTML string of its own: the app allows none. */
function Formula({ tex, display, katex }: { tex: string; display: boolean; katex: Katex }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      katex.render(tex, el, { throwOnError: false, displayMode: display, output: "htmlAndMathml", strict: "ignore", trust: false });
    } catch {
      el.textContent = tex; // a formula KaTeX cannot read is shown as the text it was
    }
  }, [tex, display, katex]);
  return <span ref={ref}>{tex}</span>;
}

/**
 * Question and answer text from the backend carries LaTeX between dollar signs ("Evaluate $43^\circ 29' + 27^\circ 43'$"). This shows it
 * as typeset maths, with a MathML copy for screen readers. Text with no dollar sign is returned untouched (and never loads KaTeX).
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const hasMath = text.includes("$");
  const [katex, setKatex] = useState<Katex | null>(null);
  useEffect(() => {
    if (!hasMath) return;
    let alive = true;
    void loadKatex().then((k) => alive && setKatex(k)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [hasMath]);

  if (!hasMath || !katex) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {splitMath(text).map((part, i) =>
        part.math ? <Formula key={i} tex={part.value} display={part.display} katex={katex} /> : <span key={i}>{part.value}</span>,
      )}
    </span>
  );
}
