"use client";

import { useEffect, useRef, useState } from "react";
import { GLASS_12, GLASS_15, GLASS_25, GLASS_35, LIME_BRIGHT, LIME_BRIGHT_30, WHITE } from "@/lib/theme";

interface AchievementProps {
  label: string;
  sublabel?: string;
  unlocked?: boolean;
  delay?: number;
}

export function Achievement({ label, sublabel, unlocked = false, delay = 0 }: AchievementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}
      style={{
        display: "flex", alignItems: "flex-start", gap: "16px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`
      }}>
      <div style={{
        flexShrink: 0, marginTop: "3px", width: "18px", height: "18px",
        border: `1px solid ${unlocked ? LIME_BRIGHT : GLASS_15}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: unlocked ? `0 0 8px ${LIME_BRIGHT_30}` : "none",
        transition: "all 0.4s ease"
      }}>
        {unlocked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke={LIME_BRIGHT} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div>
        <div className="font-display" style={{ fontSize: "18px", color: unlocked ? WHITE : GLASS_25, letterSpacing: "-0.01em", transition: "color 0.4s ease" }}>{label}</div>
        {sublabel && (
          <div className="font-sans" style={{ fontSize: "12px", color: unlocked ? GLASS_35 : GLASS_12, marginTop: "2px", letterSpacing: "0.05em" }}>{sublabel}</div>
        )}
      </div>
    </div>
  );
}
