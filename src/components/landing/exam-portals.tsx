"use client";

import { useState, useRef } from "react";
import { AMBER, AMBER_30, BLUE, DEEP_BLACK, GLASS_30, LIME_BRIGHT, LIME_BRIGHT_30, MUTED, RED, RED_30, SOLID_BLACK, WHITE } from "@/lib/theme";
import { motion, AnimatePresence } from "motion/react";
import { SectionHeading } from "@/components/landing/section-heading";

const LIVE_EXAMS = [
  { id: "gmat", name: "GMAT", full: "Graduate Management Admission Test", difficulty: 91, students: "2.1M", topRank: "Priya Sharma — AIR 7", color: LIME_BRIGHT, glow: LIME_BRIGHT_30, symbol: "⊕" },
  { id: "cat", name: "CAT", full: "Common Admission Test", difficulty: 97, students: "900K", topRank: "Rohan Das — Rank 2", color: AMBER, glow: AMBER_30, symbol: "◎" },
  { id: "gre", name: "GRE", full: "Graduate Record Examination", difficulty: 78, students: "3.4M", topRank: "Kavya Nair — Score 198", color: RED, glow: RED_30, symbol: "◆" },
  { id: "banking", name: "Banking", full: "IBPS / SBI / RBI", difficulty: 82, students: "1.8M", topRank: "Amit Singh — Score 312", color: WHITE, glow: GLASS_30, symbol: "⬡" },
];

const COMING_EXAMS = [
  { id: "jee", name: "JEE", full: "Joint Entrance Examination", color: BLUE, glow: LIME_BRIGHT_30, symbol: "∑" },
  { id: "neet", name: "NEET", full: "National Eligibility cum Entrance Test", color: LIME_BRIGHT, glow: LIME_BRIGHT_30, symbol: "⊕" },
  { id: "upsc", name: "UPSC", full: "Union Public Service Commission", color: AMBER, glow: AMBER_30, symbol: "◎" },
  { id: "ssc", name: "SSC", full: "Staff Selection Commission", color: RED, glow: RED_30, symbol: "◆" },
];

function LivePortal({ exam }: { exam: (typeof LIVE_EXAMS)[0] }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      className="relative cursor-pointer select-none"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => setHovered((h) => !h)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setHovered((h) => !h); }}
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex flex-col items-center">
        <svg aria-hidden="true" className="w-20 sm:w-24 md:w-[120px] h-20 sm:h-24 md:h-[120px]" viewBox="0 0 120 120">
          <motion.circle cx="60" cy="60" r="54" fill="none" stroke={exam.color} strokeWidth="1" strokeOpacity="0.3"
            animate={{ rotate: hovered ? 360 : 0 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "60px 60px" }} />
          <motion.circle cx="60" cy="60" r="42" fill="none" stroke={exam.color} strokeWidth="1" strokeDasharray="6 4"
            strokeOpacity={hovered ? 0.8 : 0.2}
            animate={{ rotate: hovered ? -360 : 0 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "60px 60px" }} />
          <motion.circle cx="60" cy="60" r="34" fill={exam.glow}
            animate={{ opacity: hovered ? 1 : 0.2 }}
            transition={{ duration: 0.3 }} />
          <text x="60" y="68" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="28" fill={exam.color} opacity={hovered ? 1 : 0.7}>
            {exam.symbol}
          </text>
        </svg>
        <p className="mt-3 tracking-widest font-display"
          style={{ fontWeight: 700, fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)", color: hovered ? exam.color : WHITE, transition: "color 0.3s", letterSpacing: "0.12em" }}>
          {exam.name}
        </p>
        <AnimatePresence>
          {hovered && (
            <motion.div className="absolute left-1/2 -translate-x-1/2 w-48 sm:w-56" style={{ top: -130, zIndex: 30 }}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.25 }}>
              <div className="p-3 sm:p-4 rounded bg-card" style={{ border: `1px solid ${exam.color}40`, boxShadow: `0 0 30px ${exam.glow}` }}>
                <p className="text-xs mb-3 text-muted-foreground font-sans">{exam.full}</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono" style={{ color: MUTED }}>Difficulty</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 rounded-full" style={{ background: SOLID_BLACK }}>
                        <div className="h-1 rounded-full" style={{ width: `${exam.difficulty}%`, background: exam.color }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: exam.color }}>{exam.difficulty}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground font-mono">Aspirants</span>
                    <span className="text-xs text-foreground font-mono">{exam.students}</span>
                  </div>
                  <div className="pt-2 mt-2 text-xs text-primary font-mono border-t border-border">▲ {exam.topRank}</div>
                </div>
              </div>
              <div className="w-2 h-2 mx-auto rotate-45"
                style={{ background: DEEP_BLACK, border: `1px solid ${exam.color}40`, borderTop: "none", borderLeft: "none", marginTop: -1 }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ComingCard({ exam }: { exam: (typeof COMING_EXAMS)[0] }) {
  return (
    <motion.div
      className="relative select-none"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ opacity: 0.45 }}
    >
      <div className="relative flex flex-col items-center">
        <svg aria-hidden="true" className="w-16 sm:w-20 md:w-[90px] h-16 sm:h-20 md:h-[90px]" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke={exam.color} strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="60" cy="60" r="42" fill="none" stroke={exam.color} strokeWidth="1" strokeDasharray="6 4" strokeOpacity="0.15" />
          <circle cx="60" cy="60" r="34" fill={exam.glow} opacity={0.1} />
          <text x="60" y="68" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="28" fill={exam.color} opacity={0.4}>
            {exam.symbol}
          </text>
        </svg>
        <p className="mt-2 tracking-widest font-display"
          style={{ fontWeight: 700, fontSize: "clamp(0.8rem, 2vw, 0.95rem)", color: exam.color, opacity: 0.5, letterSpacing: "0.12em" }}>
          {exam.name}
        </p>
        <span className="mt-1 text-[9px] tracking-[0.2em] uppercase font-mono text-muted-foreground"
          style={{ opacity: 0.6 }}>
          Coming Soon
        </span>
      </div>
    </motion.div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <motion.div
      className="flex items-center justify-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="w-8 sm:w-12 h-px" style={{ background: LIME_BRIGHT_30 }} />
      <span className="text-micro tracking-[0.25em] uppercase font-mono text-primary px-2">
        {label}
      </span>
      <div className="w-8 sm:w-12 h-px" style={{ background: LIME_BRIGHT_30 }} />
    </motion.div>
  );
}

export function ExamPortals() {
  return (
    <section id="battles" className="relative py-16 md:py-32 px-6 overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto">
        <SectionHeading eyebrow="Choose your battlefield" title="Energy Gateways"
          description="Rewire your brain for high-stakes quantitative execution." />
        <div className="pt-4 pb-6">
          <Badge label="LIVE" />
        </div>
        <div className="flex flex-wrap justify-center items-end gap-6 sm:gap-10 md:gap-14">
          {LIVE_EXAMS.map((exam) => <LivePortal key={exam.id} exam={exam} />)}
        </div>
        <div className="pt-14 pb-6">
          <Badge label="Coming Soon" />
        </div>
        <div className="flex flex-wrap justify-center items-end gap-8 sm:gap-14 md:gap-20">
          {COMING_EXAMS.map((exam) => <ComingCard key={exam.id} exam={exam} />)}
        </div>
      </div>
    </section>
  );
}
