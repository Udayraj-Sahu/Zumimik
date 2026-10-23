"use client";

import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MotionConfig, motion } from "motion/react";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { BG_MOSS, FOREST, GLASS_BORDER, PANEL } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";
import { PlanSelector } from "@/components/onboarding/intros/plan-intro";
import { SeatBuilderSelector } from "@/components/onboarding/intros/seat-builder-intro";
import type { PlanId } from "@/lib/types/onboarding";

const SERIF = "font-[Fraunces,Georgia,'Times_New_Roman',serif]";

export function AdaptivePlanScreen({
  isVedic,
  plan,
  onPlanChange,
  lane,
  onLaneChange,
  onBack,
  onNext,
}: {
  isVedic: boolean;
  plan: PlanId;
  onPlanChange: (plan: PlanId) => void;
  lane: string;
  onLaneChange: (lane: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0%)" }], {
      duration: 320,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, []);

  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        ref={overlayRef}
        data-theme-scope
        className={cn(
          "fixed inset-0 z-[var(--z-intro)] flex flex-col overflow-hidden sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm",
          theme === "light" && "light",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adaptive-plan-title"
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
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, var(--lime-40), transparent)",
            }}
          />

          <div className="relative mx-auto flex w-full max-w-[400px] min-h-0 flex-1 flex-col px-[18px] pt-[max(1rem,var(--sat))] sm:max-w-none max-[359px]:px-4">
            <div className="flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground/50 outline-none transition-colors hover:text-foreground/80 active:scale-[0.98]"
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--lime-25)] bg-[var(--lime-07)] px-3 py-1">
                <ClipboardList size={11} className="text-[var(--lime)]" aria-hidden />
                <span className="text-[10px] font-bold tracking-[0.22em] text-[var(--lime)]">
                  TRAINING PLAN
                </span>
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-2 pt-2 text-center"
              >
                <h1
                  id="adaptive-plan-title"
                  className={cn(
                    "text-[clamp(24px,7vw,32px)] font-black leading-none tracking-[-0.01em] text-foreground",
                    SERIF,
                  )}
                >
                  Select your <span className="text-[var(--lime)]">plan.</span>
                </h1>
                <p className="max-w-[300px] text-[12.5px] leading-[1.5] text-muted-foreground">
                  {isVedic
                    ? "Build the seats you need — switch or upgrade anytime."
                    : "Choose your training parameters — switch or upgrade anytime."}
                </p>
              </motion.div>

              <div className="mt-5 pb-4">
                {isVedic ? (
                  <SeatBuilderSelector />
                ) : (
                  <PlanSelector
                    value={plan}
                    onChange={onPlanChange}
                    lane={lane}
                    onLaneChange={onLaneChange}
                    layout="row"
                  />
                )}
              </div>
            </div>

            <div className="relative shrink-0 pb-[max(0.75rem,var(--sab))] pt-3">
              <button
                type="button"
                onClick={onNext}
                className="w-full rounded-[14px] border-0 bg-[var(--lime-solid)] py-3 text-[13px] font-bold tracking-[0.03em] text-[var(--on-accent)] transition active:scale-[0.98]"
                style={{ boxShadow: "0 8px 24px -10px var(--lime-60)" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>,
    document.body,
  );
}
