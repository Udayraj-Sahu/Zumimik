"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { PlanSelector } from "@/components/onboarding/intros/plan-intro";
import { SeatBuilderSelector } from "@/components/onboarding/intros/seat-builder-intro";
import { IntroSurface } from "@/components/onboarding/intros/intro-surface";
import type { PlanId } from "@/lib/types/onboarding";

const SERIF = "font-[Fraunces,Georgia,'Times_New_Roman',serif]";

export function AdaptivePlanScreen({
  isVedic,
  plan,
  onPlanChange,
  lane,
  onLaneChange,
  onNext,
}: {
  isVedic: boolean;
  plan: PlanId;
  onPlanChange: (plan: PlanId) => void;
  lane: string;
  onLaneChange: (lane: string) => void;
  onNext: () => void;
}) {
  return (
    <IntroSurface labelledBy="adaptive-plan-title" topRule>
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
    </IntroSurface>
  );
}
