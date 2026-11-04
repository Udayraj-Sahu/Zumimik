"use client";

import { useRef } from "react";
import { BLUE, BLUE_LIGHT, LIME_BRIGHT, LIME_BRIGHT_03, MUTED, NEAR_WHITE_BLACK, WHITE } from "@/lib/theme";
import { motion, useScroll, useTransform } from "motion/react";
import { SectionHeading } from "@/components/landing/section-heading";

const RANKS = [
  { rank: "Aspirant", range: "Starting out", icon: "○", color: MUTED, count: "840K" },
  { rank: "Challenger", range: "Top 40%", icon: "◇", color: BLUE, count: "420K" },
  { rank: "Warrior", range: "Top 20%", icon: "◈", color: BLUE_LIGHT, count: "184K" },
  { rank: "Elite", range: "Top 5%", icon: "◉", color: WHITE, count: "62K" },
  { rank: "Legend", range: "Top 1%", icon: "✦", color: LIME_BRIGHT, count: "8.4K" },
];

export function EnergyTower() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const energyHeight = useTransform(scrollYProgress, [0.1, 0.8], ["0%", "100%"]);

  return (
    <section id="rankings" ref={sectionRef} className="relative py-16 md:py-32 px-6 overflow-hidden bg-background">
      <div className="max-w-6xl mx-auto">
        <SectionHeading eyebrow="The ascent" title="Energy Tower" description="Every rank you clear adds to your energy. Keep climbing." />
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
          <div className="relative w-8 flex-shrink-0 mt-4 mx-auto md:mx-0">
            <div className="absolute inset-x-0 top-0 bottom-0 rounded bg-secondary" />
            <motion.div className="absolute inset-x-0 bottom-0 rounded" style={{
              height: energyHeight,
              background: `linear-gradient(to top, ${LIME_BRIGHT}, ${BLUE}, ${NEAR_WHITE_BLACK})`,
              boxShadow: "0 0 20px var(--lime-bright-40)"
            }} />
            {RANKS.map((_, i) => (
              <div key={i} className="absolute w-full flex justify-center" style={{ bottom: `${(i / (RANKS.length - 1)) * 100}%` }}>
                <div className="w-3 h-3 rounded-full -mb-1.5" style={{ background: RANKS[i].color, boxShadow: `0 0 8px ${RANKS[i].color}` }} />
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col-reverse gap-0 w-full">
            {RANKS.map((rank, i) => (
              <motion.div key={rank.rank} className="relative py-4 md:py-6 px-4 md:px-6 border-b border-border"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-mono" style={{ fontSize: "clamp(1.1rem, 3vw, 1.4rem)", color: rank.color }}>{rank.icon}</span>
                    <div>
                      <p className="font-display" style={{ fontWeight: 700, fontSize: "clamp(1rem, 2.5vw, 1.15rem)", color: rank.color, letterSpacing: "-0.01em" }}>{rank.rank}</p>
                      <p className="text-muted-foreground font-sans" style={{ fontSize: "clamp(0.7rem, 1.8vw, 0.85rem)" }}>{rank.range}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-secondary-foreground font-mono" style={{ fontSize: "clamp(0.9rem, 2.2vw, 1.1rem)" }}>{rank.count}</p>
                    <p className="text-muted-foreground font-sans" style={{ fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)" }}>students</p>
                  </div>
                </div>
                {i === RANKS.length - 1 && (
                  <motion.div className="absolute inset-0 pointer-events-none rounded"
                    style={{ background: LIME_BRIGHT_03, border: "1px solid var(--lime-bright-20)" }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity }} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}>
          <p className="text-muted-foreground font-sans" style={{ fontSize: "clamp(0.85rem, 2vw, 0.95rem)" }}>
            Where do you stand?{" "}
            <button className="text-primary hover:text-primary/80 hover:underline transition-all duration-200 bg-transparent border-none cursor-pointer font-sans" style={{ fontSize: "clamp(0.85rem, 2vw, 0.95rem)" }}>
              Take the rank test →
            </button>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
