"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GLASS_03, GLASS_35, GLASS_BG, LIME, LIME_125, OVERLAY } from "@/lib/theme";
import gsap from "gsap";
import {
  ChevronLeft,
  Check,
  X,
  Sparkles,
  GraduationCap,
  Calculator,
  BookOpen,
  Zap,
  ArrowRight,
  Target,
  Brain,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingStore, goalForExam } from "@/stores/onboarding-store";
import { StoryCommitmentMatrix } from "@/components/onboarding/intros/story-intro";
import { applyStoryNotifications } from "@/lib/notifications/story-reminders";
import { PlanSelector } from "@/components/onboarding/intros/plan-intro";
import { SeatBuilderSelector } from "@/components/onboarding/intros/seat-builder-intro";
import { ArenaIntro } from "@/components/onboarding/intros/arena-intro";
import { PitchIntro } from "@/components/onboarding/intros/pitch-intro";
import { FamilyIntro } from "@/components/onboarding/intros/family-intro";
import { FamilyHubIntro } from "@/components/onboarding/intros/family-hub-intro";
import { FeatureIntro } from "@/components/onboarding/intros/feature-intro";
import { Dialog } from "@/components/ui/dialog";
import { VEDIC_USE_CASES } from "@/lib/types/onboarding";
import type { PlanId, StoryCommitment, VedicUseCaseId } from "@/lib/types/onboarding";

const EXAM_OPTIONS = [
  { id: "cat", label: "CAT", icon: GraduationCap },
  { id: "gmat", label: "GMAT", icon: Calculator },
  { id: "gre", label: "GRE", icon: BookOpen },
  { id: "vedic-math", label: "Speed Math", icon: Zap },
];

const TEMPORAL_OPTIONS = [
  { label: "Taking exam this year", desc: "We'll plan with a deadline", value: "this_year" },
  { label: "Whenever I'm prepared", desc: "Focus on mastery, no rush", value: "whenever" },
  { label: "Not sure yet", desc: "Flexible, balanced approach", value: "not_sure" },
];

const ACCENT = LIME;

const STEP_ICONS = [GraduationCap, Target, Brain, ClipboardList];
const STEP_LABELS = ["Exam", "When", "Story", "Plan"];
const TOTAL_STEPS = STEP_ICONS.length;

export function AdaptiveReprompt({ onDone }: { onDone: () => void }) {
  const store = useOnboardingStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(0);

  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [exam, setExam] = useState<string | null>(store.targetExam || null);
  const [temporal, setTemporal] = useState<string | null>(store.temporalWindow);
  const [vedicUseCase, setVedicUseCase] = useState<VedicUseCaseId | null>(store.vedicUseCase);
  const [story, setStory] = useState<StoryCommitment>(() => ({
    dailyMinutes: store.dailyMinutes ?? 30,
    reminderTime: store.reminderTime || "00:00",
    reclaimSlot: store.reclaimSlot,
    reclaimWindow: store.reclaimWindow || "00:00 - 00:00",
    reclaimConfigs: store.reclaimConfigs,
    triggerType: store.triggerType,
    triggerTime: store.triggerTime || "00:00",
    weekDays: store.weekDays,
  }));
  const [plan, setPlan] = useState<PlanId>(store.planId ?? "initiate");
  const [lane, setLane] = useState<string>(store.planLane || store.targetExam || "cat");
  const [featureHookVariant, setFeatureHookVariant] = useState<
    "this_year" | "whenever" | "not_sure" | "vedic" | null
  >(null);
  const [showArena, setShowArena] = useState(false);
  const [showPitch, setShowPitch] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [showFamilyHub, setShowFamilyHub] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tweens: gsap.core.Tween[] = [];
    if (overlayRef.current)
      tweens.push(gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 }));
    if (panelRef.current) {
      tweens.push(
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, y: 32, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
        ),
      );
    }
    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [open]);

  const animateStepTransition = useCallback((dir: 1 | -1) => {
    if (!contentRef.current) return;
    contentRef.current.scrollTop = 0;
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, x: dir * 40 },
      { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
    );
  }, []);

  useEffect(() => {
    if (prevStepRef.current !== step) animateStepTransition(direction);
  }, [step, direction, animateStepTransition]);

  const handleClose = useCallback(() => {
    if (!overlayRef.current || !panelRef.current) {
      setOpen(false);
      return;
    }
    gsap.to(panelRef.current, { opacity: 0, y: 20, scale: 0.97, duration: 0.2, ease: "power2.in" });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, onComplete: () => setOpen(false) });
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    prevStepRef.current = step;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }, [step]);

  const goToPlan = useCallback(() => {
    setDirection(1);
    prevStepRef.current = step;
    setStep(TOTAL_STEPS - 1);
  }, [step]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    prevStepRef.current = step;
    setStep((s) => Math.max(0, s - 1));
  }, [step]);

  const isVedic = exam === "vedic-math";

  const canNext =
    step === 0
      ? exam !== null
      : step === 1
        ? isVedic
          ? vedicUseCase !== null
          : temporal !== null
        : true;

  const finish = () => {
    if (!exam) return;
    store.setTargetExam(exam);
    store.addActivePrep(exam);
    store.setActiveLearnDomain(exam);
    store.setGoal(goalForExam(exam));
    if (isVedic) {
      store.setVedicUseCase(vedicUseCase);
    } else {
      store.setTemporalWindow((temporal as "this_year" | "whenever" | "not_sure") ?? "not_sure");
    }
    store.setDailyMinutes(story.dailyMinutes);
    store.setReminderTime(story.reminderTime);
    store.setReclaimSlot(story.reclaimSlot);
    store.setReclaimWindow(story.reclaimWindow);
    store.setTriggerType(story.triggerType);
    store.setTriggerTime(story.triggerTime);
    store.setWeekDays(story.weekDays);
    store.setReclaimConfigs(story.reclaimConfigs ?? store.reclaimConfigs);
    store.setPlanId(plan);
    store.setPlanLane(lane);
    store.setAdaptiveConfigured(true);
    void applyStoryNotifications(story);
    onDone();
  };

  const finishWithExit = () => {
    if (overlayRef.current && panelRef.current) {
      gsap.to(panelRef.current, {
        opacity: 0,
        y: 20,
        scale: 0.97,
        duration: 0.2,
        ease: "power2.in",
      });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, onComplete: finish });
    } else {
      finish();
    }
  };

  if (!open) {
    return (
      <div
        className="mt-4 relative rounded-3xl border border-dashed border-white/[0.08] px-5 py-6 flex flex-col items-center gap-3 text-center"
        style={{ background: GLASS_03 }}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] border border-white/[0.06]">
          <Sparkles size={18} className="text-[var(--lime)]" />
        </span>
        <p className="text-[13px] font-semibold text-foreground/80">Finish your adaptive setup</p>
        <p className="text-[11px] text-muted-foreground/45 max-w-[240px]">
          Answer a few quick questions to unlock your adaptive plan.
        </p>
        <button
          type="button"
          onClick={() => {
            setStep(0);
            setOpen(true);
          }}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--lime-solid)] px-5 py-2.5 text-[11px] font-bold tracking-wider text-[var(--on-accent)] transition-all hover:opacity-90 active:scale-95"
        >
          Set up adaptive
          <ArrowRight size={12} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  const mainOverlay = (
    <Dialog
      open={open}
      onClose={handleClose}
      overlayRef={overlayRef}
      panelRef={panelRef}
      ariaLabelledby="adaptive-reprompt-title"
      className="max-h-[90vh] overflow-hidden border-white/[0.06] flex flex-col"
      panelStyle={{ background: OVERLAY }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header with step icons */}
        <div className="sticky top-0 z-10 px-5 pt-4 pb-4 bg-[var(--overlay)] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handleClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground/50 hover:text-foreground/80 transition-colors active:scale-95"
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2">
              {STEP_LABELS.map((baseLabel, i) => {
                const label = i === 1 && isVedic ? "Goal" : baseLabel;
                const StepIcon = i === 1 && isVedic ? Target : STEP_ICONS[i];
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-300",
                      isActive
                        ? "size-8 bg-[var(--lime-15)] ring-2 ring-[var(--lime-40)]"
                        : isDone
                          ? "size-6 bg-[var(--lime-10)]"
                          : "size-6 bg-white/[0.05]",
                    )}
                  >
                    {isDone ? (
                      <Check size={10} className="text-[var(--lime)]" />
                    ) : (
                      <StepIcon
                        size={isActive ? 14 : 10}
                        className={cn(
                          "transition-colors duration-300",
                          isActive ? "text-[var(--lime)]" : "text-muted-foreground/40",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((Math.min(step, TOTAL_STEPS - 1) + 1) / TOTAL_STEPS) * 100}%`,
                background: ACCENT,
              }}
            />
          </div>
        </div>

        {/* Content — one step at a time */}
        <div
          data-reprompt-scroll
          className="flex-1 min-h-0 px-5 overflow-y-auto pt-4 pb-6 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          <div ref={contentRef} className="flex flex-col">
            {step === 0 && (
              <div className="flex flex-col">
                <div className="mb-5">
                  <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
                    Adaptive Learning
                  </h2>
                  <p className="text-[13px] text-muted-foreground/50 mt-1.5 font-medium">
                    Which exam are you preparing for?
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {EXAM_OPTIONS.map((opt) => {
                    const active = exam === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setExam(opt.id);
                          if (store.targetExam !== opt.id) setLane(opt.id);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.97]",
                          active
                            ? "border-[var(--lime-30)] bg-[var(--lime-06)]"
                            : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]",
                        )}
                      >
                        <div
                          className="size-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: active ? LIME_125 : GLASS_BG }}
                        >
                          <opt.icon
                            size={14}
                            style={{ color: active ? ACCENT : GLASS_35 }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-[12px] font-bold",
                            active ? "text-foreground" : "text-foreground/60",
                          )}
                        >
                          {opt.label}
                        </span>
                        {active && (
                          <Check size={12} className="ml-auto text-[var(--lime)]" strokeWidth={3} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col">
                <div className="mb-5">
                  <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
                    {isVedic
                      ? "Speed Math Setup"
                      : `${EXAM_OPTIONS.find((e) => e.id === exam)?.label ?? ""} Setup`}
                  </h2>
                  <p className="text-[13px] text-muted-foreground/50 mt-1.5 font-medium">
                    {isVedic ? "What's your goal with speed math?" : "When is your exam?"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {(isVedic
                    ? VEDIC_USE_CASES.map((u) => ({
                        key: u.id,
                        label: u.label,
                        desc: u.desc,
                        active: vedicUseCase === u.id,
                        onClick: () => {
                          setVedicUseCase(u.id);
                          if (u.id === "speed" || u.id === "brain-gym") {
                            setFeatureHookVariant("vedic");
                          } else if (u.id === "kid" || u.id === "exam") {
                            setShowFamily(true);
                          }
                        },
                      }))
                    : TEMPORAL_OPTIONS.map((opt) => ({
                        key: opt.value,
                        label: opt.label,
                        desc: opt.desc,
                        active: temporal === opt.value,
                        onClick: () => {
                          setTemporal(opt.value);
                          setFeatureHookVariant(opt.value as "this_year" | "whenever" | "not_sure");
                        },
                      }))
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={opt.onClick}
                      className={cn(
                        "relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.97]",
                        opt.active
                          ? "border-[var(--lime-30)] bg-[var(--lime-06)]"
                          : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-[13px] font-bold leading-tight",
                            opt.active ? "text-foreground" : "text-foreground/60",
                          )}
                        >
                          {opt.label}
                        </p>
                        <p className="text-micro text-muted-foreground/60 mt-0.5 font-medium">
                          {opt.desc}
                        </p>
                      </div>
                      {opt.active && (
                        <div className="size-4 rounded-full flex items-center justify-center bg-[var(--lime-solid)] shrink-0">
                          <Check size={8} className="text-[var(--on-accent)]" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col">
                <div className="mb-5">
                  <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
                    Tell us your story
                  </h2>
                  <p className="text-[13px] text-muted-foreground/50 mt-1.5 font-medium">
                    Lifestyle integration protocol
                  </p>
                </div>
                <StoryCommitmentMatrix
                  value={story}
                  onChange={(patch) => setStory((prev) => ({ ...prev, ...patch }))}
                />
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col">
                <div className="mb-5">
                  <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
                    Select your plan
                  </h2>
                  <p className="text-[13px] text-muted-foreground/50 mt-1.5 font-medium">
                    Choose your training parameters.
                  </p>
                </div>
                {isVedic ? (
                  <SeatBuilderSelector />
                ) : (
                  <PlanSelector
                    value={plan}
                    onChange={setPlan}
                    lane={lane}
                    onLaneChange={setLane}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-5 pb-6 pt-3 bg-[var(--overlay)] shrink-0">
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={goPrev}
                className="flex items-center gap-1 text-[11px] font-bold text-foreground/40 outline-none transition-colors hover:text-foreground/70 active:scale-[0.98]"
              >
                <ChevronLeft size={14} />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={step === TOTAL_STEPS - 1 ? finishWithExit : goNext}
              disabled={!canNext}
              className={cn(
                "size-10 rounded-full flex items-center justify-center transition-all active:scale-90",
                canNext
                  ? "text-[var(--on-accent)]"
                  : "bg-white/[0.06] text-muted-foreground/20 cursor-not-allowed",
              )}
              style={canNext ? { background: ACCENT } : undefined}
            >
              {step === TOTAL_STEPS - 1 ? <Sparkles size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );

  const featureHookDone = () => {
    const variant = featureHookVariant;
    setFeatureHookVariant(null);
    if (!isVedic && variant === "this_year" && !store.arenaHookSeen) {
      setShowArena(true);
      return;
    }
    if (!isVedic && (variant === "whenever" || variant === "not_sure") && !store.pitchHookSeen) {
      setShowPitch(true);
      return;
    }
    if (isVedic && variant === "vedic") {
      setShowFamilyHub(true);
      return;
    }
    goNext();
  };

  if (showFamilyHub) {
    return (
      <FamilyHubIntro
        onDone={() => {
          setShowFamilyHub(false);
          goToPlan();
        }}
        onClose={() => {
          setShowFamilyHub(false);
          goToPlan();
        }}
      />
    );
  }

  if (showFamily) {
    return (
      <FamilyIntro
        onDone={() => {
          setShowFamily(false);
          setShowFamilyHub(true);
        }}
        onClose={() => {
          setShowFamily(false);
          setShowFamilyHub(true);
        }}
      />
    );
  }

  if (showPitch) {
    return (
      <PitchIntro
        onClose={() => {
          setShowPitch(false);
          store.setPitchHookSeen(true);
          goNext();
        }}
      />
    );
  }

  if (showArena) {
    return (
      <ArenaIntro
        onClose={() => {
          setShowArena(false);
          store.setArenaHookSeen(true);
          goNext();
        }}
      />
    );
  }

  return featureHookVariant ? (
    <FeatureIntro
      variant={featureHookVariant}
      onDone={featureHookDone}
      onClose={() => setFeatureHookVariant(null)}
    />
  ) : (
    mainOverlay
  );
}
