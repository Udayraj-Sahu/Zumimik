"use client";

import { motion } from "motion/react";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  highlight?: string;
}

export function SectionHeading({ eyebrow, title, description, highlight }: SectionHeadingProps) {
  return (
    <motion.div
      className="mb-16 md:mb-20 text-center"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <p className="mb-3 tracking-[0.3em] uppercase text-xs text-muted-foreground font-mono">
        {eyebrow}
      </p>
      <h2
        className="text-foreground font-display"
        style={{
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {title}
        {highlight && <span className="text-primary"> {highlight}</span>}
      </h2>
      {description && (
        <p className="mt-4 max-w-md mx-auto text-muted-foreground font-sans" style={{ fontSize: "0.95rem" }}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
