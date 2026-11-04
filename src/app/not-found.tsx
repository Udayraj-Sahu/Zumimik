"use client";

import { motion } from "motion/react";
import { LIME_BRIGHT, LIME_BRIGHT_RGB } from "@/lib/theme";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background text-foreground px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--lime-bright-03) 0%, transparent 60%)",
      }} />

      <div className="relative flex items-center justify-center mb-8">
        {[180, 260, 360].map((size, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: size,
              height: size,
              borderColor: `rgba(${LIME_BRIGHT_RGB}, ${0.3 - i * 0.08})`,
            }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.3 - i * 0.08, 0.1, 0.3 - i * 0.08] }}
            transition={{ duration: 3, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        <h1 className="font-display text-[clamp(100px,20vw,200px)] font-bold leading-none select-none"
          style={{ color: LIME_BRIGHT, textShadow: "0 0 60px var(--lime-bright-30), 0 0 120px var(--lime-bright-10)" }}>
          404
        </h1>
      </div>

      <motion.p
        className="font-mono text-xs tracking-[0.3em] text-primary mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        RANK NOT FOUND
      </motion.p>

      <motion.p
        className="text-muted-foreground max-w-md font-sans"
        style={{ fontSize: "clamp(0.85rem, 2vw, 1rem)", lineHeight: 1.7 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        This section of the wall is blank. No rank marker here.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Link
          href="/"
          className="inline-block mt-10 px-8 py-3 text-sm tracking-wide rounded bg-primary text-primary-foreground border-none cursor-pointer font-display font-semibold hover:brightness-110 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
        >
          Return to the Arena
        </Link>
      </motion.div>
    </div>
  );
}
