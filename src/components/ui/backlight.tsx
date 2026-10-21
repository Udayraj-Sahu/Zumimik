"use client";

import type { ReactNode } from "react";
import { LIME_14 } from "@/lib/theme";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils";

interface BacklightProps {
  children: ReactNode;
  className?: string;
  blur?: number;
  color?: string;
}

export default function Backlight({ children, className, blur = 20, color = LIME_14 }: BacklightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`radial-gradient(550px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 80%)`;
  const mask = useMotionTemplate`radial-gradient(550px circle at ${mouseX}px ${mouseY}px, black, transparent 80%)`;

  return (
    <div onMouseMove={handleMouseMove} className={cn("group/backlight relative", className)}>
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-200 group-hover/backlight:opacity-100"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ backgroundImage: background, filter: `blur(${blur}px)` }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}