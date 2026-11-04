"use client";

import { useEffect, useRef, useState } from "react";
import { AMBER, LIME_BRIGHT, LIME_BRIGHT_04, RED, WHITE } from "@/lib/theme";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

interface Insight {
  label: string;
  type: "weak" | "strong" | "revision" | "opportunity";
  x: number;
  y: number;
}

const INSIGHTS: Insight[] = [
  { label: "Weak Topic Found", type: "weak", x: 20, y: 15 },
  { label: "High Potential Chapter", type: "strong", x: 65, y: 35 },
  { label: "Revision Needed", type: "revision", x: 35, y: 55 },
  { label: "Rank Opportunity", type: "opportunity", x: 72, y: 75 },
  { label: "Weak Topic Found", type: "weak", x: 15, y: 90 },
];

function typeColor(t: Insight["type"]) {
  if (t === "weak") return RED;
  if (t === "strong") return LIME_BRIGHT;
  if (t === "revision") return AMBER;
  return LIME_BRIGHT;
}

export function AIScanLine() {
  const ref = useRef<HTMLDivElement>(null);
  const [scanY, setScanY] = useState(-10);
  const [visible, setVisible] = useState(false);
  const [revealedInsights, setRevealedInsights] = useState<number[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || prefersReducedMotion) return;
    let y = -10;
    const interval = setInterval(() => {
      y += 0.6;
      if (y > 100) y = 0;
      setScanY(y);
      INSIGHTS.forEach((ins, i) => {
        if (Math.abs(ins.y - y) < 3 && !revealedInsights.includes(i)) {
          setRevealedInsights((prev) => [...prev, i]);
        }
      });
    }, 30);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, prefersReducedMotion]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: "clamp(300px, 50vh, 500px)" }}>
      <div style={{
        position: "absolute", left: 0, right: 0, top: `${scanY}%`, height: "1px",
        background: `linear-gradient(to right, transparent, ${LIME_BRIGHT} 20%, ${LIME_BRIGHT} 80%, transparent)`,
        opacity: 0.6, transition: "top 0.03s linear", zIndex: 2
      }} />
      <div style={{
        position: "absolute", left: 0, right: 0, top: `${scanY}%`, height: "40px",
        background: `linear-gradient(to bottom, ${LIME_BRIGHT_04}, transparent)`,
        transform: "translateY(-20px)", transition: "top 0.03s linear", zIndex: 1
      }} />

      <div style={{ position: "absolute", top: 0, left: 0, display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: LIME_BRIGHT }} />
        <span className="font-sans uppercase" style={{ fontSize: "11px", letterSpacing: "0.2em", color: LIME_BRIGHT }}>Active Analysis</span>
      </div>

      {INSIGHTS.map((ins, i) => (
        <div key={i} style={{
          position: "absolute", left: `${ins.x}%`, top: `${ins.y}%`,
          transform: "translateY(-50%)",
          opacity: revealedInsights.includes(i) ? 1 : 0,
          transition: "opacity 0.5s ease",
          display: "flex", alignItems: "center", gap: "8px", zIndex: 3
        }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: typeColor(ins.type), flexShrink: 0 }} />
          <span className="font-sans truncate" style={{ fontSize: "12px", color: typeColor(ins.type), letterSpacing: "0.05em", maxWidth: "90px" }}>{ins.label}</span>
        </div>
      ))}

      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="aiDots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={WHITE} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aiDots)" />
      </svg>
    </div>
  );
}
