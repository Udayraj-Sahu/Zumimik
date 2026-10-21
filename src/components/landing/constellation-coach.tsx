"use client";

import { useEffect, useRef, useState } from "react";
import { AMBER, BLUE, DEEP_BLACK, GLASS_BORDER, LIME_BRIGHT, RED } from "@/lib/theme";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const STARS = [
  { x: 50, y: 20, label: "Mechanics", type: "strength", size: 6 },
  { x: 25, y: 38, label: "Algebra", type: "weak", size: 4 },
  { x: 72, y: 42, label: "Optics", type: "goal", size: 5 },
  { x: 38, y: 58, label: "Organic Chem", type: "strength", size: 5 },
  { x: 62, y: 65, label: "Calculus", type: "goal", size: 6 },
  { x: 18, y: 70, label: "Thermodynamics", type: "weak", size: 4 },
  { x: 82, y: 22, label: "Electrostatics", type: "prediction", size: 7 },
  { x: 45, y: 85, label: "Coordination", type: "weak", size: 3 },
  { x: 88, y: 68, label: "Gravitation", type: "strength", size: 5 },
  { x: 12, y: 25, label: "Trigonometry", type: "goal", size: 4 },
];

const EDGES = [
  [0, 2], [0, 6], [2, 4], [4, 8], [1, 3], [3, 4], [5, 3], [9, 1], [6, 2], [7, 3],
];

const TYPE_COLORS: Record<string, string> = {
  strength: LIME_BRIGHT,
  weak: RED,
  goal: BLUE,
  prediction: AMBER,
};

const TYPE_LABELS: Record<string, string> = {
  strength: "Strength",
  weak: "Needs work",
  goal: "Goal topic",
};

export function ConstellationCoach() {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || prefersReducedMotion) return;
    const start = performance.now();
    const tick = (now: number) => {
      setTime((now - start) / 1000);
      if (visible && !prefersReducedMotion) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, prefersReducedMotion]);

  return (
    <section ref={sectionRef} id="ai-coach" className="relative py-16 md:py-32 px-6 overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-3 tracking-[0.3em] uppercase text-xs text-muted-foreground font-mono">
              Intelligence layer
            </p>
            <h2 className="mb-6 text-foreground font-display"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              Your mind,<br />
              <span style={{ color: BLUE }}>mapped.</span>
            </h2>
            <p className="mb-8 text-muted-foreground font-sans" style={{ fontSize: "clamp(0.9rem, 2.2vw, 1rem)", lineHeight: 1.7 }}>
              The Coach doesn&apos;t give you a study plan. It builds a live map of your
              intelligence — where you&apos;re strong, where you&apos;re fragile, and where the
              exam will hit hardest.
            </p>
            <div className="flex flex-col gap-3">
              {Object.entries(TYPE_COLORS).filter(([type]) => type in TYPE_LABELS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  <span className="text-xs text-secondary-foreground font-mono">{TYPE_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative" style={{ aspectRatio: "1/0.85" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full" style={{ overflow: "visible" }}>
              {Array.from({ length: 80 }, (_, i) => (
                <circle key={i} cx={(i % 10) * 11 + 5} cy={Math.floor(i / 10) * 11 + 5} r="0.2" fill={GLASS_BORDER} />
              ))}
              {EDGES.map(([a, b], i) => {
                const sa = STARS[a];
                const sb = STARS[b];
                const isHighlighted = hoveredStar === a || hoveredStar === b;
                return (
                  <motion.line key={i} x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y}
                    stroke={isHighlighted ? BLUE : GLASS_BORDER}
                    strokeWidth={isHighlighted ? 0.5 : 0.25}
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.2 }} />
                );
              })}
              {STARS.map((star, i) => {
                const color = TYPE_COLORS[star.type];
                const isHovered = hoveredStar === i;
                const pulse = Math.sin(time * 1.5 + i) * 0.5 + 0.5;
                return (
                  <g key={i} role="button" tabIndex={0}
                    aria-label={`${star.label} — ${TYPE_LABELS[star.type] ?? star.type}`}
                    onMouseEnter={() => setHoveredStar(i)}
                    onMouseLeave={() => setHoveredStar(null)}
                    onFocus={() => setHoveredStar(i)}
                    onBlur={() => setHoveredStar(null)}
                    onClick={() => setHoveredStar(i === hoveredStar ? null : i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setHoveredStar(i === hoveredStar ? null : i); }}
                    style={{ cursor: "pointer", outline: "none", WebkitTapHighlightColor: "transparent" }}>
                    <circle cx={star.x} cy={star.y} r={star.size * 1.8} fill={color} opacity={pulse * 0.15 + (isHovered ? 0.2 : 0)} />
                    <circle cx={star.x} cy={star.y} r={star.size * 0.45} fill={color} opacity={0.85 + pulse * 0.15} />
                    {isHovered && (
                      <g>
                        <rect x={star.x + 2} y={star.y - 6} width={star.label.length * 1.8 + 4} height={8} rx="1"
                          fill={DEEP_BLACK} stroke={color} strokeWidth="0.3" strokeOpacity="0.5" />
                        <text x={star.x + 4} y={star.y - 0.5} fontSize="3.5" fill={color} fontFamily="JetBrains Mono, monospace">
                          {star.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
