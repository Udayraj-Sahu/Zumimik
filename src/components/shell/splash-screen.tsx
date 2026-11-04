"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { ZuzumikWordmark } from "@/components/brand/zuzumik-wordmark";

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.6, delay: 1.8, ease: "power2.inOut", onComplete });
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="fixed inset-0 z-[var(--z-splash)] flex flex-col items-center justify-center bg-background">
      <ZuzumikMark className="size-16 mb-4" />
        <h1 className="flex justify-center text-white dark:text-white">
          <ZuzumikWordmark className="h-[26px] w-auto" />
        </h1>
      <p className="text-muted-foreground text-sm mt-1">Arena of Champions</p>
    </div>
  );
}
