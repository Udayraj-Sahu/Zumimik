"use client";

import { useEffect, useRef, useState } from "react";
import { GLASS_02, GLASS_025, GLASS_06, GLASS_10, GLASS_30, LIME_BRIGHT, LIME_BRIGHT_06, LIME_BRIGHT_15, LIME_BRIGHT_18, LIME_BRIGHT_25, MUTED, NEAR_BLACK, WHITE } from "@/lib/theme";
import { motion, useMotionValue, animate } from "motion/react";

const DISTANT_SIGNALS = [
  { id: "iit", label: "IIT", x: 15, baseY: 43, size: 11, delay: 0.4 },
  { id: "aiims", label: "AIIMS", x: 29, baseY: 41, size: 10, delay: 0.7 },
  { id: "upsc", label: "UPSC", x: 43, baseY: 44, size: 9, delay: 1.0 },
  { id: "air100", label: "AIR 100", x: 50, baseY: 42, size: 8, delay: 1.3 },
  { id: "air50", label: "AIR 50", x: 57, baseY: 40, size: 7, delay: 1.6 },
  { id: "air10", label: "AIR 10", x: 71, baseY: 43, size: 7, delay: 2.0 },
  { id: "selection", label: "SELECTION", x: 85, baseY: 39, size: 9, delay: 2.3 },
];

const NEAR_MILESTONES = [
  { id: "today", label: "FINISH TODAY'S GOAL", x: 22, y: 68, size: 18 },
  { id: "revision", label: "COMPLETE REVISION", x: 70, y: 72, size: 16 },
  { id: "questions", label: "SOLVE 50 QUESTIONS", x: 35, y: 78, size: 15 },
  { id: "streak", label: "MAINTAIN 7-DAY STREAK", x: 62, y: 82, size: 14 },
];

const LANDMARKS = [
  { id: "physics", label: "PHYSICS", x: 18, y: 58, stats: { solved: 1240, mastery: "78%", strong: "Mechanics, Optics", weak: "Thermodynamics", upcoming: "Wave Optics Test" } },
  { id: "chemistry", label: "CHEMISTRY", x: 80, y: 55, stats: { solved: 980, mastery: "65%", strong: "Organic Chemistry", weak: "Electrochemistry", upcoming: "Inorganic Mock" } },
  { id: "biology", label: "BIOLOGY", x: 28, y: 62, stats: { solved: 1540, mastery: "84%", strong: "Genetics, Cell Bio", weak: "Ecology", upcoming: "NEET Biology Sprint" } },
  { id: "reasoning", label: "REASONING", x: 73, y: 60, stats: { solved: 720, mastery: "59%", strong: "Logical Sequences", weak: "Data Interpretation", upcoming: "Speed Test" } },
  { id: "affairs", label: "CURRENT AFFAIRS", x: 50, y: 65, stats: { solved: 440, mastery: "71%", strong: "National Events", weak: "International Relations", upcoming: "Weekly Quiz" } },
];

const PATH_NODES = [
  { label: "PRACTICE", x: 50, y: 88, size: 12 },
  { label: "CONSISTENCY", x: 49, y: 80, size: 11 },
  { label: "REVISION", x: 50, y: 73, size: 10 },
  { label: "MOCK TESTS", x: 50, y: 66, size: 9 },
  { label: "ANALYSIS", x: 50, y: 59, size: 8 },
  { label: "COMPETITION", x: 50, y: 53, size: 7 },
];

type LandmarkInfo = typeof LANDMARKS[0] | null;

export function HorizonScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);
  const [hoveredLandmark, setHoveredLandmark] = useState<LandmarkInfo>(null);
  const [progress, setProgress] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const [started, setStarted] = useState(false);

  const progressMv = useMotionValue(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const w = window.innerWidth;
        const h = window.innerHeight;
        let cx: number, cy: number;
        if ("touches" in e) {
          const t = e.touches[0];
          if (!t) return;
          cx = t.clientX / w;
          cy = t.clientY / h;
        } else {
          cx = e.clientX / w;
          cy = e.clientY / h;
        }
        setMouseX(cx);
        setMouseY(cy);
      });
    };
    if (!isMobile) {
      window.addEventListener("mousemove", handlePointer);
    }
    window.addEventListener("touchmove", handlePointer, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handlePointer);
      window.removeEventListener("touchmove", handlePointer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleBegin = () => {
    setStarted(true);
    const controls = animate(progressMv, 1, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setProgress(v),
      onComplete: () => setShowFinal(true),
    });
    return controls;
  };

  const parallaxX = (mouseX - 0.5) * 2;
  const parallaxY = (mouseY - 0.5) * 2;

  const horizonYVal = 46 + progress * 26;
  const scaleBoost = 1 + progress * 2;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-background cursor-crosshair">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at ${50 + parallaxX * 8}% ${horizonYVal - 10}%, var(--lime-bright-03) 0%, transparent 60%)` }} />
      <div className="absolute left-0 right-0 bottom-0 bg-background" style={{ top: `${horizonYVal}%` }} />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        {[-40, -20, -8, -2, 0, 2, 8, 20, 40].map((offset, i) => (
          <line key={i} x1={50 + offset} y1={horizonYVal} x2={50 + offset * 10} y2={100} stroke={GLASS_025} strokeWidth="0.15" />
        ))}
        {[0.2, 0.5, 1, 2, 4, 8].map((dist, i) => {
          const y = horizonYVal + dist * (100 - horizonYVal) * 0.18;
          return y < 100 ? <line key={i} x1={0} y1={y} x2={100} y2={y} stroke={GLASS_02} strokeWidth="0.12" /> : null;
        })}
        <line x1={0} y1={horizonYVal} x2={100} y2={horizonYVal} stroke={LIME_BRIGHT_18} strokeWidth="0.12" />
        <line x1={20} y1={horizonYVal} x2={80} y2={horizonYVal} stroke={LIME_BRIGHT_06} strokeWidth="0.6" />
        {PATH_NODES.map((node, i) => {
          if (i === PATH_NODES.length - 1) return null;
          const next = PATH_NODES[i + 1];
          const lit = progress > (i / (PATH_NODES.length - 1)) * 0.8;
          return <line key={i} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke={lit ? LIME_BRIGHT_25 : GLASS_06} strokeWidth="0.18" strokeDasharray="0.8 0.4" />;
        })}
      </svg>

      {!showFinal && DISTANT_SIGNALS.map((sig) => {
        const scaledSize = sig.size * (0.7 + progress * (scaleBoost - 0.7));
        const parallaxedX = sig.x + parallaxX * 0.8 * (1 - progress * 0.5);
        const parallaxedY = sig.baseY - progress * 14;
        const opacity = 0.25 + progress * 0.55;
        return (
          <motion.div key={sig.id} className="absolute" initial={{ opacity: 0 }} animate={{ opacity }}
            transition={{ delay: sig.delay, duration: 1.2 }}
            style={{ left: `${parallaxedX}%`, top: `${parallaxedY}%`, transform: "translate(-50%, -50%)", filter: `blur(${Math.max(0, (1 - progress) * 1.5)}px)` }}>
            <span className="font-display" style={{ fontSize: `${scaledSize}px`, fontWeight: 800, color: WHITE, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{sig.label}</span>
          </motion.div>
        );
      })}

      {!showFinal && LANDMARKS.map((lm) => {
        const isHovered = hoveredLandmark?.id === lm.id;
        const lmY = lm.y + progress * -6;
        return (
          <div key={lm.id} className="absolute"
            style={{ left: `${lm.x + parallaxX * 1.2}%`, top: `${lmY + parallaxY * 0.4}%`, transform: "translate(-50%, -50%)", zIndex: isHovered ? 20 : 10, outline: "none", WebkitTapHighlightColor: "transparent" }}
            onMouseEnter={() => setHoveredLandmark(lm)}
            onMouseLeave={() => setHoveredLandmark(null)}
            onClick={() => setHoveredLandmark(isHovered ? null : lm)}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.45 + (isHovered ? 0.55 : 0), y: 0 }} transition={{ delay: 0.8, duration: 1.4 }} style={{ cursor: "pointer", outline: "none", WebkitTapHighlightColor: "transparent" }}>
              <span className="font-display" style={{ fontSize: "10px", fontWeight: 700, color: isHovered ? LIME_BRIGHT : MUTED, letterSpacing: "0.18em", whiteSpace: "nowrap", transition: "color 0.3s ease", display: "block", textAlign: "center" }}>{lm.label}</span>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: isHovered ? LIME_BRIGHT : GLASS_30, transition: "background 0.3s ease" }} />
              </div>
            </motion.div>
            <motion.div animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }} transition={{ duration: 0.25 }} style={{ pointerEvents: "none", position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 10, width: 180 }}>
              <div style={{ borderTop: "1px solid var(--lime-bright-20)", paddingTop: 10 }}>
                {[["SOLVED", lm.stats.solved.toLocaleString()], ["MASTERY", lm.stats.mastery], ["STRONG", lm.stats.strong], ["WEAK", lm.stats.weak], ["NEXT", lm.stats.upcoming]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
                    <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.12em", flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: WHITE, textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        );
      })}

      {!showFinal && NEAR_MILESTONES.map((m, i) => {
        const visible = mouseY > 0.4 || progress > 0.05;
        return (
          <motion.div key={m.id} className="absolute" initial={{ opacity: 0 }} animate={{ opacity: visible ? 0.55 : 0 }} transition={{ delay: i * 0.15 + 1.5, duration: 1 }}
            style={{ left: `${m.x + parallaxX * 2.5}%`, top: `${m.y + parallaxY * 1.5}%`, transform: "translate(-50%, -50%)" }}>
            <span className="font-display" style={{ fontSize: `clamp(${m.size * 0.6}px, 3vw, ${m.size}px)`, fontWeight: 700, color: WHITE, letterSpacing: "0.1em", whiteSpace: "nowrap", opacity: 0.7 }}>{m.label}</span>
          </motion.div>
        );
      })}

      {!showFinal && PATH_NODES.map((node, i) => {
        const lit = progress > i / (PATH_NODES.length - 1) * 0.8;
        const nodeY = node.y - progress * 8;
        return (
          <motion.div key={node.label} className="absolute" initial={{ opacity: 0 }} animate={{ opacity: lit ? 0.6 : 0.18 }} transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
            style={{ left: `${node.x + parallaxX * 0.5}%`, top: `${nodeY}%`, transform: "translate(-50%, -50%)" }}>
            <span className="font-display" style={{ fontSize: `${node.size}px`, fontWeight: 700, color: lit ? LIME_BRIGHT : MUTED, letterSpacing: "0.14em", whiteSpace: "nowrap", transition: "color 0.6s ease" }}>{node.label}</span>
          </motion.div>
        );
      })}

      {!showFinal && (
        <div className="absolute inset-0 flex items-start justify-center pointer-events-none pt-[clamp(8vh,12vh,18vh)]">
          <motion.div className="horizon-headline" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: "center", width: "90vw", maxWidth: 900, overflowWrap: "break-word", padding: "0 5vw" }}>
            <h2 className="font-display" style={{ fontSize: "clamp(14px, 4vw, 72px)", fontWeight: 800, color: WHITE, letterSpacing: "-0.01em", lineHeight: 1.15, margin: 0 }}>
              BECOME WHO YOU ARE CAPABLE OF BECOMING
            </h2>
          </motion.div>
        </div>
      )}

      {!showFinal && !started && (
        <motion.div className="absolute horizon-cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8, duration: 1.2 }} style={{ bottom: "clamp(4%, 10%, 15%)", left: "50%", transform: "translateX(-50%)", textAlign: "center", width: "90vw", maxWidth: 500 }}>
          <button onClick={handleBegin}
            className="font-display uppercase hover:opacity-85 transition-opacity duration-200"
            style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', fontWeight: 800, letterSpacing: "0.22em", color: NEAR_BLACK, background: LIME_BRIGHT, border: "none", padding: "clamp(14px, 2vw, 16px) clamp(28px, 5vw, 44px)", cursor: "pointer" }}>
            BEGIN THE JOURNEY
          </button>
          <p className="font-display hidden sm:block" style={{ fontSize: 10, color: MUTED, letterSpacing: "0.14em", marginTop: 16 }}>MOVE YOUR CURSOR — THE HORIZON RESPONDS</p>
          <p className="font-display sm:hidden" style={{ fontSize: 10, color: MUTED, letterSpacing: "0.14em", marginTop: 16 }}>SWIPE — THE HORIZON RESPONDS</p>
        </motion.div>
      )}

      {started && !showFinal && (
        <motion.div className="absolute" style={{ bottom: "clamp(4%, 8%, 12%)", left: "50%", transform: "translateX(-50%)", textAlign: "center" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <p className="font-display" style={{ fontSize: 10, color: MUTED, letterSpacing: "0.18em" }}>THE HORIZON APPROACHES</p>
          <div style={{ marginTop: 10, width: 120, height: 1, background: GLASS_10, margin: "10px auto 0" }}>
            <motion.div style={{ height: 1, background: LIME_BRIGHT, width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
          </div>
        </motion.div>
      )}

      {showFinal && (
        <motion.div className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }} style={{ textAlign: "center", padding: "0 5vw" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1.2 }} style={{ display: "flex", gap: "clamp(24px, 5vw, 80px)", marginBottom: "clamp(32px, 6vh, 72px)", flexWrap: "wrap", justifyContent: "center" }}>
            {["IIT", "AIIMS", "UPSC", "SELECTION"].map((label, i) => (
              <motion.span key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
                className="font-display" style={{ fontSize: "clamp(32px, 6vw, 80px)", fontWeight: 900, color: WHITE, letterSpacing: "-0.02em" }}>{label}</motion.span>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1.4 }}>
            <p className="font-display" style={{ fontSize: "clamp(22px, 4vw, 56px)", fontWeight: 800, color: LIME_BRIGHT, letterSpacing: "-0.01em", lineHeight: 1.1, margin: 0 }}>THE FUTURE HASN&apos;T MOVED.</p>
            <p className="font-display" style={{ fontSize: "clamp(22px, 4vw, 56px)", fontWeight: 800, color: WHITE, letterSpacing: "-0.01em", lineHeight: 1.1, margin: "4px 0 0" }}>YOU HAVE.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 1 }} style={{ marginTop: "clamp(32px, 6vh, 64px)" }}>
            <button className="font-display uppercase hover:opacity-85 active:opacity-70 transition-opacity duration-200" style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', fontWeight: 800, letterSpacing: "0.22em", color: NEAR_BLACK, background: LIME_BRIGHT, border: "none", padding: "clamp(14px, 2vw, 18px) clamp(28px, 5vw, 48px)", cursor: "pointer" }}>
              BEGIN THE JOURNEY
            </button>
          </motion.div>
          <motion.div className="absolute bottom-0 left-0 right-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 2 }} style={{ height: 1, background: LIME_BRIGHT_15 }} />
        </motion.div>
      )}

      <style>{`
        @media (max-height: 500px) {
          .horizon-headline { font-size: clamp(18px, 4vw, 32px) !important; top: 6% !important; }
          .horizon-cta { bottom: 4% !important; }
        }
      `}</style>
    </div>
  );
}
