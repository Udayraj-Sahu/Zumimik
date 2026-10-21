"use client";

import { useCallback } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "./use-reduced-motion";

export function useEntranceAnimations() {
  const reduced = usePrefersReducedMotion();

  const staggerIn = useCallback(
    (els: NodeListOf<HTMLElement> | HTMLElement[], from: gsap.TweenVars, to: gsap.TweenVars) => {
      if (reduced || !els.length) return;
      gsap.fromTo(els, from, to);
    },
    [reduced],
  );

  const headerRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || reduced) return;
      gsap.fromTo(el, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
    },
    [reduced],
  );

  const animateSection = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || el.dataset.animated) return;
      el.dataset.animated = "true";
      if (reduced) return;
      const idx = parseInt(el.dataset.sectionIndex ?? "0", 10);
      gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, delay: idx * 0.08, ease: "power2.out" });
    },
    [reduced],
  );

  return { headerRef, animateSection, staggerIn, reduced };
}