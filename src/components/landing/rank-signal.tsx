"use client";

import { useEffect, useRef, useState } from "react";
import { LIME_BRIGHT, LIME_BRIGHT_05, LIME_BRIGHT_RGB, NEAR_BLACK, NEAR_WHITE_BLACK } from "@/lib/theme";
import { motion, useMotionValue, useSpring } from "motion/react";
import { AuthModal } from "@/components/onboarding/auth/auth-modal";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const RINGS = [
  { delay: 0, size: 180, opacity: 0.4 },
  { delay: 0.8, size: 260, opacity: 0.25 },
  { delay: 1.6, size: 360, opacity: 0.15 },
  { delay: 2.4, size: 480, opacity: 0.08 },
  { delay: 3.2, size: 620, opacity: 0.04 },
];

const STATS = [
  { label: "Questions solved today", value: "2.4M" },
  { label: "Students online", value: "84,291" },
  { label: "Battles completed", value: "18,763" },
];

export function RankSignal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 20 });
  const y = useSpring(rawY, { stiffness: 60, damping: 20 });
  const [statIndex, setStatIndex] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const rafRef = useRef<number>(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setStatIndex((i) => (i + 1) % STATS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const el = document.getElementById("hero-buttons-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      rawX.set((e.clientX - cx) * 0.04);
      rawY.set((e.clientY - cy) * 0.04);
    });
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <div
      id="arena"
      ref={containerRef}
      className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(ellipse 80% 60% at 50% 50%, ${NEAR_WHITE_BLACK} 0%, ${NEAR_BLACK} 60%, ${NEAR_BLACK} 100%)`,
        }}
      />

      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {RINGS.map((ring, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: ring.size,
              height: ring.size,
              borderColor: `rgba(${LIME_BRIGHT_RGB}, ${ring.opacity})`,
              boxShadow: `0 0 ${ring.size * 0.06}px rgba(${LIME_BRIGHT_RGB}, ${ring.opacity * 0.5})`,
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [ring.opacity, ring.opacity * 0.4, ring.opacity],
            }}
            transition={{
              duration: 4,
              delay: ring.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div style={{ x, y }} className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center mb-12">
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 120,
              height: 120,
              background:
                "radial-gradient(circle, var(--lime-bright-30) 0%, var(--lime-bright-00) 70%)",
              filter: "blur(8px)",
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative w-20 h-20">
            <svg aria-hidden="true" viewBox="0 0 80 80" className="w-full h-full">
              <motion.polygon
                points="40,4 74,22 74,58 40,76 6,58 6,22"
                fill="none"
                stroke={LIME_BRIGHT}
                strokeWidth="1.5"
                animate={{ strokeDashoffset: [0, -200] }}
                style={{ strokeDasharray: 200 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              <polygon
                points="40,4 74,22 74,58 40,76 6,58 6,22"
                fill={LIME_BRIGHT_05}
              />
              <circle cx="40" cy="40" r="6" fill={LIME_BRIGHT} opacity="0.9" />
              <motion.circle
                cx="40"
                cy="40"
                r="14"
                fill="none"
                stroke={LIME_BRIGHT}
                strokeWidth="0.75"
                animate={{ r: [14, 20, 14], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </svg>
          </div>

          <motion.div
            key={statIndex}
            aria-live="polite"
            className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 whitespace-nowrap max-w-[90vw] text-center px-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-xs sm:text-sm tracking-widest uppercase text-primary/70 font-mono">
              {STATS[statIndex].value}{" "}
              <span className="text-secondary-foreground/50">
                {STATS[statIndex].label}
              </span>
            </span>
          </motion.div>
        </div>

        <div className="text-center px-6">
          <p className="mb-3 tracking-[0.3em] uppercase text-xs text-muted-foreground font-mono">
            Zuzumik · Season 4
          </p>
          <h1
            className="mb-6 leading-[1.05] text-foreground font-display"
            style={{
              fontSize: "clamp(2.8rem, 7vw, 6.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Become the
            <br />
            <span className="text-primary">Legend.</span>
          </h1>
          <p className="max-w-lg mx-auto text-muted-foreground font-sans px-4" style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)", lineHeight: 1.65 }}>
            Not a coaching platform. A competitive battlefield where India&apos;s sharpest minds
            fight, rank, and rise.
          </p>
        </div>
        <div id="hero-buttons-sentinel" aria-hidden="true" />
          <motion.div
            animate={{ opacity: heroVisible ? 1 : 0, y: heroVisible ? 0 : -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={heroVisible ? "flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-10" : "flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-10 pointer-events-none"}
          >
            <motion.button
              onClick={() => {
                if (isAuthenticated) {
                  router.push("/dashboard");
                } else {
                  setShowAuth(true);
                }
              }}
              className="px-7 py-3 text-sm tracking-wide rounded bg-primary text-primary-foreground border-none cursor-pointer font-display font-semibold hover:brightness-110 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Enter the Arena
            </motion.button>
            <motion.button
              className="px-7 py-3 text-sm tracking-wide rounded bg-transparent text-secondary-foreground border border-border cursor-pointer font-display font-medium hover:border-primary/40 hover:text-foreground transition-all duration-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Build the Muscle
            </motion.button>
          </motion.div>
      </motion.div>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}
