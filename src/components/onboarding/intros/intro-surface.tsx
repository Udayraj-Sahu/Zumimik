"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MotionConfig } from "motion/react";
import { BG_MOSS, FOREST, GLASS_BORDER, PANEL } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

/**
 * Full-screen intro shell: overlay, themed card, dot grid and the padded
 * scrolling column. Shared by the onboarding plan screen and the adaptive
 * setup so both keep the same surface and slide-in.
 */
export const IntroSurface = forwardRef<
  HTMLDivElement,
  {
    labelledBy: string;
    children: ReactNode;
    /** Lime hairline along the card's top edge. */
    topRule?: boolean;
    /** Rendered but hidden — the caller animates it in later. */
    preloaded?: boolean;
  }
>(function IntroSurface({ labelledBy, children, topRule = false, preloaded = false }, ref) {
  const theme = useThemeStore((s) => s.theme);
  const localRef = useRef<HTMLDivElement | null>(null);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useLayoutEffect(() => {
    if (preloaded) return;
    document.body.style.overflow = "hidden";
    const el = localRef.current;
    if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0%)" }], {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [preloaded]);

  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        ref={setRef}
        data-theme-scope
        className={cn(
          "fixed inset-0 z-[var(--z-intro)] flex flex-col overflow-hidden sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm",
          preloaded && "invisible pointer-events-none",
          theme === "light" && "light",
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={preloaded || undefined}
        aria-labelledby={labelledBy}
      >
        <div
          className="relative flex h-full w-full shrink-0 flex-col sm:h-auto sm:max-h-[92vh] sm:max-w-md sm:overflow-hidden sm:rounded-3xl sm:border sm:shadow-2xl md:max-h-[85vh] md:max-w-3xl lg:max-w-4xl xl:max-w-[1080px]"
          style={{
            borderColor: GLASS_BORDER,
            background:
              theme === "light"
                ? "linear-gradient(180deg, var(--screen-tint) 0%, var(--overlay-solid) 100%)"
                : `radial-gradient(130% 90% at 50% 0%, ${PANEL} 0%, ${BG_MOSS} 48%, ${FOREST} 100%)`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: "radial-gradient(var(--glass-045) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          {topRule && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent, var(--lime-40), transparent)",
              }}
            />
          )}

          <div className="relative mx-auto flex w-full max-w-[400px] min-h-0 flex-1 flex-col px-[18px] pt-[max(1rem,var(--sat))] sm:max-w-none max-[359px]:px-4">
            {children}
          </div>
        </div>
      </div>
    </MotionConfig>,
    document.body,
  );
});
