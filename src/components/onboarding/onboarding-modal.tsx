"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CYAN, EMERALD, GLASS_03, GLASS_06, GLASS_30, GLASS_BG, GREEN_SOLID, MUTED_GREEN, OVERLAY, PURPLE, ROSE, VIOLET_PURPLE, YELLOW } from "@/lib/theme";
import { createPortal } from "react-dom";
import gsap from "gsap";
import {
  ChevronLeft,
  Check,
  X,
  User,
  Users,
  Target,
  Brain,
  ClipboardList,
  GraduationCap,
  Briefcase,
  Search,
  Heart,
  BookOpen,
  Plus,
  Calculator,
  Zap,
  School,
  Compass,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";
import { useOnboardingStore, examIdForGoal } from "@/stores/onboarding-store";
import { saveOnboardingProfile } from "@/services/onboarding";
import { VEDIC_USE_CASES, DRILLS, PLANS, type VedicUseCaseId } from "@/lib/types/onboarding";
import { FeatureIntro } from "@/components/onboarding/intros/feature-intro";
import { FamilyIntro } from "@/components/onboarding/intros/family-intro";
import { FamilyHubIntro } from "@/components/onboarding/intros/family-hub-intro";
import { SeatBuilderIntro } from "@/components/onboarding/intros/seat-builder-intro";
import { StoryIntro } from "@/components/onboarding/intros/story-intro";
import { ArenaIntro } from "@/components/onboarding/intros/arena-intro";
import { PitchIntro } from "@/components/onboarding/intros/pitch-intro";
import { PlanIntro } from "@/components/onboarding/intros/plan-intro";

const PERSONA_OPTIONS = [
  { label: "Student", icon: GraduationCap, color: EMERALD, desc: "Currently studying" },
  {
    label: "Working Professional",
    icon: Briefcase,
    color: CYAN,
    desc: "Balancing work & prep",
  },
  { label: "Job Seeker", icon: Search, color: VIOLET_PURPLE, desc: "Preparing for next role" },
  { label: "Parent", icon: Heart, color: ROSE, desc: "Guiding a child" },
  { label: "Educator", icon: BookOpen, color: YELLOW, desc: "Teaching & mentoring" },
  { label: "Other", icon: Plus, color: MUTED_GREEN, desc: "Something else" },
];

const GOAL_OPTIONS = [
  { label: "Prepare for CAT", icon: Target, color: EMERALD, desc: "MBA entrance exam" },
  { label: "Prepare for GMAT", icon: Calculator, color: CYAN, desc: "Graduate management" },
  { label: "Prepare for GRE", icon: BookOpen, color: VIOLET_PURPLE, desc: "Graduate record exam" },
  { label: "Master speed math", icon: Zap, color: YELLOW, desc: "Calculation skills" },
  { label: "Help with school stuff", icon: School, color: ROSE, desc: "Academic support" },
  { label: "Just exploring", icon: Compass, color: MUTED_GREEN, desc: "Seeing what's here" },
];

type TemporalWindowId = "this_year" | "whenever" | "not_sure";

const TEMPORAL_GOALS = ["Prepare for CAT", "Prepare for GMAT", "Prepare for GRE"];

const TEMPORAL_PANEL_OPTIONS: { id: TemporalWindowId; label: string }[] = [
  { id: "this_year", label: "Taking an exam this year" },
  { id: "whenever", label: "Whenever I am prepared" },
  { id: "not_sure", label: "Not sure yet" },
];

const TRIGGER_GROUPED = [
  {
    label: "Life Stage",
    color: "var(--primary)",
    tags: ["Final Year Student", "Gap Year", "Career Switch", "Returning to Work"],
  },
  {
    label: "Mindset",
    color: PURPLE,
    tags: ["Math Anxiety", "Confidence Boost", "Consistency", "Competition Drive"],
  },
  {
    label: "Parenting",
    color: GREEN_SOLID,
    tags: ["Helping My Child", "Homeschool Support", "School Project"],
  },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const MIN_BIRTH_YEAR = 100;

const monthDays = (year: number, month: string): number => {
  const idx = MONTHS.indexOf(month);
  if (idx < 0) return 31;
  return new Date(year, idx + 1, 0).getDate();
};

const normalizeDob = (dob: { day: number; month: string; year: number }) => {
  const max = monthDays(dob.year, dob.month);
  return { ...dob, day: Math.min(Math.max(1, dob.day), max) };
};

const isValidDob = (dob: { day: number; month: string; year: number }): boolean => {
  const idx = MONTHS.indexOf(dob.month);
  if (idx < 0) return false;
  const now = new Date();
  if (dob.year > now.getFullYear() || dob.year < now.getFullYear() - MIN_BIRTH_YEAR) {
    return false;
  }
  const date = new Date(dob.year, idx, dob.day);
  return (
    date.getFullYear() === dob.year &&
    date.getMonth() === idx &&
    date.getDate() === dob.day &&
    date <= now
  );
};

const birthYears = (): number[] => {
  const current = new Date().getFullYear();
  return Array.from({ length: MIN_BIRTH_YEAR + 1 }, (_, i) => current - i);
};

type StepId = "name" | "persona" | "goal" | "triggers" | "details";

const STEP_LABEL_BY_ID: Record<StepId, string> = {
  name: "Name",
  persona: "Who",
  goal: "Goal",
  triggers: "Vibe",
  details: "Details",
};

import type { LucideIcon } from "lucide-react";

const STEP_ICON_BY_ID: Record<StepId, LucideIcon> = {
  name: User,
  persona: Users,
  goal: Target,
  triggers: Brain,
  details: ClipboardList,
};

type Props = { onClose: () => void; inline?: boolean };

export function OnboardingModal({ onClose, inline }: Props) {
  const store = useOnboardingStore();
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const [step, setStep] = useState(store.firstName ? store.currentStep : 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [completed, setCompleted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(0);

  const [localFirstName, setLocalFirstName] = useState(store.firstName);
  const [localPersona, setLocalPersona] = useState<string | null>(store.persona);
  // Prefilled from the saved profile (server-hydrated after login), so re-opening shows what the learner already chose.
  const [localGoal, setLocalGoal] = useState<string | null>(store.goal);
  const [localTemporal, setLocalTemporal] = useState<TemporalWindowId | null>(store.temporalWindow);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [localTriggers, setLocalTriggers] = useState<string[]>(store.triggers);
  const [localSex, setLocalSex] = useState<string | null>(store.sex);
  const [localDob, setLocalDob] = useState(store.dob);
  const [localVedicUseCase, setLocalVedicUseCase] = useState<string | null>(store.vedicUseCase);
  const [featureHookVariant, setFeatureHookVariant] = useState<TemporalWindowId | "vedic" | null>(
    null,
  );
  const [showFamily, setShowFamily] = useState(false);
  const [showFamilyHub, setShowFamilyHub] = useState(false);
  const [showSeatBuilder, setShowSeatBuilder] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showArena, setShowArena] = useState(false);
  const [showPitch, setShowPitch] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  // Store-derived mirrors (firstName, persona, …) must follow the store if it
  // changes underneath the modal — a completed onboarding from another surface,
  // a profile edit — instead of silently overwriting newer data on commit.
  // Fields that deliberately start blank on re-entry (goal/temporal/…) are
  // local-only and are not re-synced here.
  useEffect(() => {
    setLocalFirstName(store.firstName);
    setLocalPersona(store.persona);
    setLocalTriggers(store.triggers);
    setLocalSex(store.sex);
    setLocalDob(store.dob);
    setLocalVedicUseCase(store.vedicUseCase);
    // Late hydration (profile arrives after the modal mounted): fill, never blank, a choice the learner already made here.
    setLocalGoal((g) => g ?? store.goal);
    setLocalTemporal((t) => t ?? store.temporalWindow);
  }, [store.firstName, store.persona, store.triggers, store.sex, store.dob, store.vedicUseCase, store.goal, store.temporalWindow]);

  const preloadFamilyHub = showFamily || featureHookVariant === "vedic";
  const preloadSeatBuilder = showFamilyHub;
  const preloadStory = showSeatBuilder || showPlan;
  const preloadArena = featureHookVariant === "this_year";
  const preloadPitch = featureHookVariant === "whenever" || featureHookVariant === "not_sure";
  const preloadPlan = showArena || showPitch;

  const handleTemporal = (v: TemporalWindowId | null) => {
    setLocalTemporal(v);
    if (v) setFeatureHookVariant(v);
  };

  const handleVedicUseCase = (v: string | null) => {
    setLocalVedicUseCase(v);
    if (v === "Lightning Mental Calc" || v === "Brain Gym") {
      setFeatureHookVariant("vedic");
    } else if (v === "Teaching My Kid" || v === "Competitive Exam") {
      setShowFamily(true);
    }
  };

  const isExam = localGoal ? TEMPORAL_GOALS.includes(localGoal) : false;
  const isVedic = localGoal === "Master speed math";

  const resolvedSteps: StepId[] = useMemo(
    () => ["name", "persona", "goal", "triggers", "details"],
    [],
  );

  const totalSteps = resolvedSteps.length;
  const stepLabels = resolvedSteps.map((id) => STEP_LABEL_BY_ID[id]);
  const stepIcons = resolvedSteps.map((id) => STEP_ICON_BY_ID[id]);

  // "Were we already onboarded before this modal opened?" Re-entry must show the
// form again, never the completion screen.
const openedAlreadyOnboarded = useRef(store.isOnboarded);
// Set by handleSkipIntro: an early skip is not a completion.
const skippedRef = useRef(false);

useEffect(() => {
    if (openedAlreadyOnboarded.current) return;
    if (skippedRef.current) return;
    if (store.isOnboarded) {
      setCompleted(true);
    }
  }, [store.isOnboarded]);

  useEffect(() => {
    if (inline) return;
    const tweens: gsap.core.Tween[] = [];
    if (overlayRef.current && panelRef.current) {
      tweens.push(gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 }));
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
  }, [inline]);

  const animateStepTransition = useCallback((dir: 1 | -1) => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    gsap.fromTo(
      el,
      { opacity: 0, x: dir * 40 },
      { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
    );
  }, []);

  const resolvedExamId = () =>
    examIdForGoal(localGoal) || (localGoal === "Master speed math" ? store.targetExam : "");

  const persistPartial = () => {
    store.setFirstName(localFirstName);
    store.setPersona(localPersona);
    // Local state intentionally starts blank, so only write goal-shaped values
    // the user actually chose this run. Clearing is owned by handleSkipIntro.
    if (localGoal) {
      store.setGoal(localGoal);
      store.setTargetExam(resolvedExamId());
    }
    if (isExam && localTemporal) store.setTemporalWindow(localTemporal);
    if (isVedic) store.setVedicUseCase(localVedicUseCase as VedicUseCaseId);
    store.setSex(localSex);
    store.setDob(localDob);
    localTriggers.forEach((t) => {
      if (!store.triggers.includes(t)) store.toggleTrigger(t);
    });
    store.triggers.forEach((t) => {
      if (!localTriggers.includes(t)) store.toggleTrigger(t);
    });
    store.setCurrentStep(step);
  };

  const handleClose = () => {
    persistPartial();
    if (inline) {
      onClose();
      return;
    }
    if (overlayRef.current && panelRef.current) {
      gsap.to(panelRef.current, {
        opacity: 0,
        y: 20,
        scale: 0.97,
        duration: 0.2,
        ease: "power2.in",
      });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, onComplete: onClose });
    } else {
      onClose();
    }
  };

  const handleFinish = async () => {
    if (saving) return;
    // Save to the backend first. Onboarding is only marked complete once the server accepted it.
    setSaving(true);
    setSaveError(null);
    try {
      await saveOnboardingProfile({
        firstName: localFirstName,
        persona: localPersona,
        goal: localGoal,
        targetExam: resolvedExamId(),
        triggers: localTriggers,
        sex: localSex,
        dob: localDob,
        temporalWindow: isExam ? localTemporal : null,
        activePreps: store.activePreps,
        isOnboarded: true,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your profile. Please try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    store.setFirstName(localFirstName);
    store.setPersona(localPersona);
    store.setGoal(localGoal);
    localTriggers.forEach((t) => {
      if (!store.triggers.includes(t)) store.toggleTrigger(t);
    });
    store.triggers.forEach((t) => {
      if (!localTriggers.includes(t)) store.toggleTrigger(t);
    });
    store.setSex(localSex);
    store.setDob(localDob);
    store.setTargetExam(resolvedExamId());
    if (isExam) store.setTemporalWindow(localTemporal);
    if (isVedic) store.setVedicUseCase(localVedicUseCase as VedicUseCaseId);
    const domainId = resolvedExamId();
    store.setAdaptiveConfigured(domainId !== "");
    store.setJustExploring(localGoal === "Just exploring");
    store.finishOnboarding();
    setCompleted(true);
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" },
      );
    }
    setTimeout(() => animateExitUp(), 2300);
  };

  const animateExitUp = () => {
    const overlay = overlayRef.current;
    if (!overlay) {
      onClose();
      return;
    }
    if (panelRef.current) {
      gsap.to(panelRef.current, { y: -40, duration: 0.6, ease: "power2.in" });
    }
    if (completeRef.current) {
      gsap.to(completeRef.current, { y: -110, opacity: 0, duration: 0.6, ease: "power2.in" });
    }
    gsap.to(overlay, { opacity: 0, duration: 0.5, onComplete: onClose });
  };

  const goNext = () => {
    if (step < totalSteps - 1) {
      setDirection(1);
      prevStepRef.current = step;
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDirection(-1);
      prevStepRef.current = step;
      setStep((s) => s - 1);
    }
  };

  useEffect(() => {
    if (prevStepRef.current !== step) {
      animateStepTransition(direction);
    }
  }, [step, direction, animateStepTransition]);

  useEffect(() => {
    if (prevStepRef.current !== step) {
      store.setCurrentStep(step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const canNext = (() => {
    const id = resolvedSteps[step];
    if (id === "name") return localFirstName.trim().length > 0;
    if (id === "persona") return localPersona !== null;
    if (id === "goal") {
      if (!localGoal) return false;
      if (isExam) return localTemporal !== null;
      if (isVedic) return localVedicUseCase !== null;
      return true;
    }
    if (id === "details") return isValidDob(localDob);
    return true;
  })();

  const panel = (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header with 5 step icons */}
      <div className="sticky top-0 z-10 px-5 pb-4 pt-[max(1rem,var(--sat))] bg-[var(--overlay)]">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleClose}
            className={cn("grid size-8 place-items-center rounded-lg transition-colors active:scale-95", theme === "light" ? "text-black/50 hover:text-black/80" : "text-white/50 hover:text-white/80")}
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => {
              const StepIcon = stepIcons[i];
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div
                  key={label}
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-300",
                    isActive
                      ? "size-8 bg-[var(--accent-15)] ring-2 ring-[var(--accent-40)]"
                      : isDone
                        ? "size-6 bg-[var(--accent-10)]"
                        : theme === "light" ? "size-6 bg-black/[0.05]" : "size-6 bg-white/[0.05]",
                  )}
                >
                  {isDone ? (
                    <Check size={10} className="text-[var(--primary)]" />
                  ) : (
                    <StepIcon
                      size={isActive ? 14 : 10}
                      className={cn(
                        "transition-colors duration-300",
                        isActive ? "text-[var(--primary)]" : theme === "light" ? "text-black/40" : "text-white/40",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Progress bar */}
        <div className={cn("h-1 w-full rounded-full overflow-hidden", theme === "light" ? "bg-black/[0.06]" : "bg-white/[0.06]")}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%`, background: "var(--primary)" }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        data-onboard-scroll
        className={cn(
          "flex-1 min-h-0 px-5",
          completed ? "overflow-hidden" : "overflow-y-auto pt-4 pb-[max(1.5rem,var(--sab))] scroll-smooth",
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {completed ? (
          <div ref={completeRef} className="h-full flex flex-col">
            <CompletionScreen />
          </div>
        ) : (
          <div ref={contentRef} className="flex flex-col">
            {(() => {
              const id = resolvedSteps[step];
              switch (id) {
                case "name":
                  return (
                    <StepName value={localFirstName} onChange={setLocalFirstName} onNext={goNext} />
                  );
                case "persona":
                  return (
                    <StepSingleSelect
                      title="What describes you?"
                      subtitle="Pick the one that fits best"
                      options={PERSONA_OPTIONS}
                      value={localPersona}
                      onSelect={setLocalPersona}
                    />
                  );
                case "goal":
                  return (
                    <StepGoal
                      value={localGoal}
                      temporal={localTemporal}
                      vedicUseCase={localVedicUseCase}
                      onSelect={setLocalGoal}
                      onTemporal={handleTemporal}
                      onVedicUseCase={handleVedicUseCase}
                    />
                  );
                case "triggers":
                  return <StepTriggers value={localTriggers} onChange={setLocalTriggers} />;
                case "details":
                  return (
                    <StepDetails
                      sex={localSex}
                      onSexChange={setLocalSex}
                      dob={localDob}
                      onDobChange={setLocalDob}
                    />
                  );
                default:
                  return null;
              }
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      {!completed && (
        <div className="sticky bottom-0 px-5 pb-6 pt-3">
          {saveError && (
            <p role="alert" data-testid="onboarding-save-error" className="mb-2 text-center text-[12px] font-medium text-destructive">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={goPrev}
                className={cn("flex items-center gap-1 text-[11px] font-bold outline-none transition-colors active:scale-[0.98]", theme === "light" ? "text-black/60 hover:text-black/90" : "text-white/40 hover:text-white/70")}
              >
                <ChevronLeft size={14} />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={step === totalSteps - 1 ? () => void handleFinish() : goNext}
              disabled={!canNext}
              className={cn(
                "size-10 rounded-full flex items-center justify-center transition-all active:scale-90",
                canNext
                  ? "text-[var(--on-accent)]"
                  : theme === "light"
                    ? "bg-black/[0.06] text-black/20 cursor-not-allowed"
                    : "bg-white/[0.06] text-white/20 cursor-not-allowed",
              )}
              style={canNext ? { background: "var(--cta-from)" } : undefined}
            >
              {step === totalSteps - 1 ? <Sparkles size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * "Skip for now" on any intro card. Records no goal and closes out
   * onboarding, so the user reaches the dashboard instead of being pushed
   * into the mandatory `goal` step. With `goal` left null the Learn page
   * falls through to AdaptiveReprompt, which asks for it later.
   *
   * Deliberately does not set `completed`: the "You're all set" screen is
   * reserved for finishing every step, never for an early skip.
   */
  const handleSkipIntro = () => {
    skippedRef.current = true;
    setFeatureHookVariant(null);
    setShowFamily(false);
    setShowFamilyHub(false);
    setShowSeatBuilder(false);
    setShowPitch(false);
    setShowPlan(false);
    setShowStory(false);
    setShowArena(false);
    store.setGoal(null);
    store.setTemporalWindow(null);
    store.setVedicUseCase(null);
    store.setTargetExam("");
    store.setAdaptiveConfigured(false);
    store.setJustExploring(false);
    store.setStoryHookSeen(true);
    store.setPlanHookSeen(true);
    store.setPitchHookSeen(true);
    store.setArenaHookSeen(true);
    store.finishOnboarding();
    onClose();
  };

  const featureHookDone = () => {
    const variant = featureHookVariant;
    setFeatureHookVariant(null);
    if (variant === "vedic") {
      setShowFamilyHub(true);
      return;
    }
    if (variant === "this_year") {
      setShowArena(true);
      return;
    }
    if (variant === "whenever" || variant === "not_sure") {
      setShowPitch(true);
      return;
    }
    goNext();
  };

  const familyHubIntro =
    showFamilyHub || preloadFamilyHub ? (
      <FamilyHubIntro
        preloaded={!showFamilyHub}
        onSkip={handleSkipIntro}
        onDone={() => {
          setShowFamilyHub(false);
          setShowSeatBuilder(true);
        }}
        onClose={() => {
          setShowFamilyHub(false);
          setShowSeatBuilder(true);
        }}
      />
    ) : null;

  const seatBuilderIntro =
    showSeatBuilder || preloadSeatBuilder ? (
      <SeatBuilderIntro
        preloaded={!showSeatBuilder}
        onSkip={handleSkipIntro}
        onClose={() => {
          setShowSeatBuilder(false);
          store.setPlanHookSeen(true);
          setShowStory(true);
        }}
      />
    ) : null;

  const storyIntro =
    showStory || preloadStory ? (
      <StoryIntro
        preloaded={!showStory}
        onSkip={handleSkipIntro}
        onClose={() => {
          setShowStory(false);
          store.setStoryHookSeen(true);
          goNext();
        }}
      />
    ) : null;

  const familyIntro = showFamily ? (
    <FamilyIntro
      onSkip={handleSkipIntro}
      onDone={() => {
        setShowFamily(false);
        setShowFamilyHub(true);
      }}
      onClose={() => {
        setShowFamily(false);
        setShowFamilyHub(true);
      }}
    />
  ) : null;

  const arenaIntro =
    showArena || preloadArena ? (
      <ArenaIntro
        preloaded={!showArena}
        onSkip={handleSkipIntro}
        onClose={() => {
          setShowArena(false);
          store.setArenaHookSeen(true);
          setShowPlan(true);
        }}
      />
    ) : null;

  const pitchIntro =
    showPitch || preloadPitch ? (
      <PitchIntro
        preloaded={!showPitch}
        onSkip={handleSkipIntro}
        onClose={() => {
          setShowPitch(false);
          store.setPitchHookSeen(true);
          setShowPlan(true);
        }}
      />
    ) : null;

  const planIntro =
    showPlan || preloadPlan ? (
      <PlanIntro
        preloaded={!showPlan}
        onSkip={handleSkipIntro}
        onClose={() => {
          setShowPlan(false);
          store.setPlanHookSeen(true);
          setShowStory(true);
        }}
      />
    ) : null;

  const introOverlay = featureHookVariant ? (
    <FeatureIntro
      variant={featureHookVariant}
      onDone={featureHookDone}
      onClose={() => setFeatureHookVariant(null)}
    />
  ) : null;

  if (inline)
    return (
      <>
        {panel}
        {introOverlay}
        {familyIntro}
        {familyHubIntro}
        {seatBuilderIntro}
        {storyIntro}
        {arenaIntro}
        {pitchIntro}
        {planIntro}
      </>
    );

  return (
    <>
      {createPortal(
          <div
            ref={overlayRef}
            data-theme-scope
            data-accent={accent}
            suppressHydrationWarning
            className={cn(
              "fixed inset-0 z-[var(--z-dialog)] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm",
              theme === "light" && "light",
            )}
            role="dialog"
            aria-modal="true"
          onClick={handleClose}
        >
          <div
            ref={panelRef}
            className="w-full max-w-md max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/[0.06] text-foreground shadow-2xl flex flex-col"
            style={{ background: OVERLAY, borderColor: theme === "light" ? "rgba(0,0,0,0.06)" : undefined }}
            onClick={(e) => e.stopPropagation()}
          >
            {panel}
          </div>
        </div>,
        document.body,
      )}
      {introOverlay}
      {familyIntro}
      {familyHubIntro}
      {seatBuilderIntro}
      {storyIntro}
      {arenaIntro}
      {pitchIntro}
      {planIntro}
    </>
  );
}

/* ── Step sub-components ── */

function StepName({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <div
          className="size-11 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--accent-10)" }}
        >
          <User size={20} className="text-[var(--primary)]" />
        </div>
        <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
          What&apos;s your first name?
        </h2>
        <p className={cn("text-[13px] mt-1.5 font-medium", theme === "light" ? "text-black/50" : "text-white/50")}>
          So we can personalise your experience
        </p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim().length > 0) onNext();
        }}
        placeholder="Type your name..."
        className={cn("w-full rounded-2xl border px-4 py-4 text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--accent-30)] focus:ring-1 focus:ring-[var(--accent-20)] transition-all", theme === "light" ? "border-black/[0.06] bg-black/[0.03]" : "border-white/[0.06] bg-white/[0.03]")}
        autoFocus
      />
      {value.trim().length > 0 && (
        <p className={cn("mt-3 text-[12px] font-medium", theme === "light" ? "text-black/60" : "text-white/60")}>
          Hey <span className={cn("font-bold", theme === "light" ? "text-black/70" : "text-white/70")}>{value.trim()}</span>, nice to meet
          you!
        </p>
      )}
    </div>
  );
}

function StepSingleSelect({
  title,
  subtitle,
  options,
  value,
  onSelect,
}: {
  title: string;
  subtitle: string;
  options: { label: string; icon: LucideIcon; color: string; desc?: string }[];
  value: string | null;
  onSelect: (v: string) => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">{title}</h2>
        <p className={cn("text-[13px] mt-1.5 font-medium", theme === "light" ? "text-black/50" : "text-white/50")}>{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSelect(opt.label)}
              className={cn(
                "relative flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.97]",
                active
                  ? "border-[var(--accent-30)] bg-[var(--accent-06)]"
                  : theme === "light"
                    ? "border-black/[0.05] bg-black/[0.02] hover:bg-black/[0.04]"
                    : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]",
              )}
            >
              <div
                className="size-10 shrink-0 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: active ? "var(--primary)" : GLASS_BG }}
              >
                <Icon size={16} style={{ color: active ? "var(--primary-foreground)" : GLASS_30 }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[12px] font-bold leading-tight truncate",
                    active ? "text-foreground" : theme === "light" ? "text-black/60" : "text-white/60",
                  )}
                >
                  {opt.label}
                </p>
{opt.desc && (
                  <p className={cn("text-[11px] mt-0.5 font-medium truncate", theme === "light" ? "text-black/60" : "text-white/60")}>
                    {opt.desc}
                  </p>
                )}
              </div>
              {active && (
                <div className="absolute top-2 right-2 size-4 rounded-full flex items-center justify-center bg-[var(--primary)]">
                  <Check size={8} className="text-[var(--primary-foreground)]" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepGoal({
  value,
  temporal,
  vedicUseCase,
  onSelect,
  onTemporal,
  onVedicUseCase,
}: {
  value: string | null;
  temporal: TemporalWindowId | null;
  vedicUseCase: string | null;
  onSelect: (v: string | null) => void;
  onTemporal: (v: TemporalWindowId | null) => void;
  onVedicUseCase: (v: string | null) => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  const handleGoalClick = (label: string) => {
    if (value === label) {
      onSelect(null);
      onTemporal(null);
      onVedicUseCase(null);
    } else {
      onSelect(label);
    }
  };

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    const t = setTimeout(() => {
      const container = listRef.current?.closest<HTMLElement>("[data-onboard-scroll]");
      const activeWrap = listRef.current?.querySelector<HTMLElement>(`[data-goal="${value}"]`);
      if (!container || !activeWrap) return;
      const panel = activeWrap.querySelector<HTMLElement>("[data-panel]");
      const target = panel ?? activeWrap;
      const r = target.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      if (r.bottom > c.bottom) {
        container.scrollTo({
          top: container.scrollTop + (r.bottom - c.bottom) + 16,
          behavior: "smooth",
        });
      } else if (r.top < c.top) {
        container.scrollTo({ top: container.scrollTop + (r.top - c.top) - 16, behavior: "smooth" });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
          What brings you here?
        </h2>
        <p className={cn("text-[13px] mt-1.5 font-medium", theme === "light" ? "text-black/50" : "text-white/50")}>
          We&apos;ll tailor content to your goal
        </p>
      </div>
      <div ref={listRef} className="flex flex-col gap-3">
        {GOAL_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.label;
          const isExam = TEMPORAL_GOALS.includes(opt.label);
          const isVedic = opt.label === "Master speed math";
          return (
            <div key={opt.label} data-goal={opt.label}>
              <button
                type="button"
                onClick={() => handleGoalClick(opt.label)}
                className={cn(
                  "relative w-full flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.97]",
                  active
                    ? "border-[var(--accent-30)] bg-[var(--accent-06)]"
                    : theme === "light"
                      ? "border-black/[0.05] bg-black/[0.02] hover:bg-black/[0.04]"
                      : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]",
                )}
              >
                <div
                  className="size-10 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: active ? "var(--primary)" : GLASS_BG }}
                >
                  <Icon size={16} style={{ color: active ? "var(--primary-foreground)" : GLASS_30 }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[12px] font-bold leading-tight truncate",
                      active ? "text-foreground" : theme === "light" ? "text-black/60" : "text-white/60",
                    )}
                  >
                    {opt.label}
                  </p>
                  {opt.desc && (
                    <p className={cn("text-[10px] mt-0.5 font-medium truncate", theme === "light" ? "text-black/60" : "text-white/60")}>
                      {opt.desc}
                    </p>
                  )}
                </div>
                {active && (
                  <div className="absolute top-2 right-2 size-4 rounded-full flex items-center justify-center bg-[var(--primary)]">
                    <Check size={8} className="text-[var(--primary-foreground)]" strokeWidth={3} />
                  </div>
                )}
              </button>

              {active && isExam && (
                <GoalPanel title="Select your temporal window">
                  {TEMPORAL_PANEL_OPTIONS.map((o) => (
                    <GoalRadioRow
                      key={o.id}
                      active={temporal === o.id}
                      label={o.label}
                      onClick={() => onTemporal(o.id)}
                    />
                  ))}
                </GoalPanel>
              )}

              {active && isVedic && (
                <GoalPanel title="What's your goal with speed math?">
                  {VEDIC_USE_CASES.map((u) => (
                    <GoalRadioRow
                      key={u.id}
                      active={vedicUseCase === u.label}
                      label={u.label}
                      sub={u.desc}
                      onClick={() => onVedicUseCase(u.label)}
                    />
                  ))}
                </GoalPanel>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 14, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out" },
      );
    }
  }, []);

  return (
    <div
      ref={ref}
      data-panel
      className={cn("mt-2.5 w-full rounded-2xl border px-4 py-4", theme === "light" ? "border-black/[0.10] bg-black/[0.04]" : "border-white/[0.06] bg-white/[0.02]")}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-sm bg-[var(--primary)]" />
        <p className={cn("text-[9px] font-bold tracking-[0.14em] uppercase", theme === "light" ? "text-black/55" : "text-white/55")}>
          {title}
        </p>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function GoalRadioRow({
  active,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("w-full flex items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors", theme === "light" ? "hover:bg-black/[0.03]" : "hover:bg-white/[0.03]")}
    >
      <span
        className={cn(
          "size-4 rounded-full border flex items-center justify-center shrink-0",
          active ? "border-[var(--primary)]" : theme === "light" ? "border-black/[0.18]" : "border-white/[0.18]",
        )}
      >
        {active && <span className="size-2 rounded-full bg-[var(--primary)]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[13px] font-semibold leading-tight",
            active ? "text-foreground" : theme === "light" ? "text-black/60" : "text-white/60",
          )}
        >
          {label}
        </span>
        {sub && (
          <span className={cn("block text-[10px] mt-0.5 font-medium", theme === "light" ? "text-black/55" : "text-white/55")}>
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}

function StepTriggers({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
          Which describe you right now?
        </h2>
        <p className={cn("text-[13px] mt-1 font-medium", theme === "light" ? "text-black/50" : "text-white/50")}>Pick all that apply</p>
      </div>
      <div className="flex flex-col gap-4">
        {TRIGGER_GROUPED.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-3 rounded-full" style={{ backgroundColor: group.color }} />
              <p className={cn("text-[9px] font-bold tracking-[0.14em] uppercase", theme === "light" ? "text-black/55" : "text-white/55")}>
                {group.label}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag) => {
                const active = value.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      onChange(active ? value.filter((t) => t !== tag) : [...value, tag])
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-bold transition-all active:scale-95",
                      active
                        ? "text-[var(--primary-foreground)] bg-[var(--primary)]"
                        : theme === "light"
                          ? "bg-black/[0.04] text-black/50 border border-black/[0.06] hover:bg-black/[0.07]"
                          : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.07]",
                    )}
                  >
                    {active && <Check size={8} strokeWidth={3} />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDetails({
  sex,
  onSexChange,
  dob,
  onDobChange,
}: {
  sex: string | null;
  onSexChange: (v: string) => void;
  dob: { day: number; month: string; year: number };
  onDobChange: (
    fn: (prev: { day: number; month: string; year: number }) => {
      day: number;
      month: string;
      year: number;
    },
  ) => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground">
          Personal Details
        </h2>
        <p className={cn("text-[13px] mt-1.5 font-medium", theme === "light" ? "text-black/50" : "text-white/50")}>
          Help us personalise your journey
        </p>
      </div>

      <p className={cn("text-micro font-bold tracking-[0.14em] mb-2.5 uppercase", theme === "light" ? "text-black/60" : "text-white/60")}>
        Gender
      </p>
      <div className="flex gap-2.5 mb-6">
        {["Male", "Female"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSexChange(s)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-[13px] font-bold transition-all active:scale-[0.98]",
              sex === s
                ? "border-[var(--red-soft-30)] bg-[var(--red-soft-10)] text-[var(--red-soft)]"
                : theme === "light"
                  ? "border-black/[0.06] bg-black/[0.03] text-black/60 hover:bg-black/[0.05]"
                  : "border-white/[0.06] bg-white/[0.03] text-white/60 hover:bg-white/[0.05]",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <p className={cn("text-micro font-bold tracking-[0.14em] mb-3 uppercase", theme === "light" ? "text-black/60" : "text-white/60")}>
        Date of Birth
      </p>
      <div className={cn("rounded-2xl border overflow-hidden", theme === "light" ? "border-black/[0.10] bg-black/[0.04]" : "border-white/[0.06] bg-white/[0.02]")}>
        <div className="flex">
          <ScrollColumn
            items={DAYS.map((d) => ({ value: String(d), label: String(d) }))}
            selected={String(dob.day)}
            onSelect={(v) => onDobChange((prev) => ({ ...prev, day: Number(v) }))}
            label="DD"
          />
          <div className={cn("w-px my-3", theme === "light" ? "bg-black/[0.06]" : "bg-white/[0.06]")} />
          <ScrollColumn
            items={MONTHS.map((m) => ({ value: m, label: m.slice(0, 3) }))}
            selected={dob.month}
            onSelect={(v) => onDobChange((prev) => normalizeDob({ ...prev, month: v }))}
            label="MM"
          />
          <div className={cn("w-px my-3", theme === "light" ? "bg-black/[0.06]" : "bg-white/[0.06]")} />
          <ScrollColumn
            items={birthYears().map((y) => ({ value: String(y), label: String(y) }))}
            selected={String(dob.year)}
            onSelect={(v) => onDobChange((prev) => normalizeDob({ ...prev, year: Number(v) }))}
            label="YYYY"
          />
        </div>
      </div>
    </div>
  );
}

function ScrollColumn({
  items,
  selected,
  onSelect,
  label,
}: {
  items: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  label: string;
}) {
  const theme = useThemeStore((s) => s.theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_H = 36;
  const VISIBLE = 3;
  const PAD = Math.floor(VISIBLE / 2);

  useEffect(() => {
    if (!containerRef.current) return;
    const idx = items.findIndex((i) => i.value === selected);
    if (idx >= 0) {
      containerRef.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }
  }, [selected, items]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.round(scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (items[clamped]?.value !== selected) {
      onSelect(items[clamped].value);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <p className={cn("text-center text-[9px] font-bold tracking-[0.14em] pt-2 pb-1", theme === "light" ? "text-black/50" : "text-white/50")}>
        {label}
      </p>
      <div className="relative" style={{ height: ITEM_H * VISIBLE }}>
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[var(--overlay)] to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--overlay)] to-transparent z-10 pointer-events-none" />
        <div
          className="absolute left-1 right-1 h-10 rounded-xl border z-0 pointer-events-none"
          style={{
            top: PAD * ITEM_H,
            background: GLASS_03,
            borderColor: GLASS_06,
          }}
        />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll scrollbar-thin snap-y snap-mandatory"
          style={{ scrollBehavior: "smooth" }}
        >
          <div style={{ height: PAD * ITEM_H }} />
          {items.map((item) => {
            const isActive = item.value === selected;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onSelect(item.value);
                  const idx = items.findIndex((i) => i.value === item.value);
                  containerRef.current?.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
                }}
                className={cn(
                  "w-full flex items-center justify-center snap-center transition-all duration-200",
                  isActive
                    ? "text-foreground font-bold text-[15px]"
                    : theme === "light" ? "text-black/30 text-[13px] font-medium" : "text-white/30 text-[13px] font-medium",
                )}
                style={{ height: ITEM_H }}
              >
                {item.label}
              </button>
            );
          })}
          <div style={{ height: PAD * ITEM_H }} />
        </div>
      </div>
    </div>
  );
}

function CompletionScreen() {
  const theme = useThemeStore((s) => s.theme);
  const store = useOnboardingStore();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boxRef.current) {
      gsap.fromTo(
        boxRef.current.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease: "power2.out" },
      );
    }
  }, []);

  const name = store.firstName?.trim() || "Champion";

  const badges = [
    store.planId
      ? { l: "PLAN", v: PLANS.find((p) => p.id === store.planId)?.name ?? "Initiate" }
      : null,
    store.dailyMinutes ? { l: "DAILY", v: `${store.dailyMinutes} min` } : null,
    store.selectedDrill
      ? { l: "DRILL", v: DRILLS.find((d) => d.id === store.selectedDrill)?.label ?? "None" }
      : null,
  ].filter(Boolean);

  return (
    <div className="h-full flex flex-col justify-between py-5 text-center px-1">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div
            className="absolute -inset-8 rounded-full opacity-30 blur-2xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--violet-purple-45), transparent 70%)",
            }}
          />
          <CelebrationAvatar />
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent-20)] bg-[var(--accent-08)] px-4 py-1.5">
          <Sparkles size={12} className="text-[var(--primary)]" />
          <span className="text-micro font-bold tracking-[0.14em] uppercase text-[var(--primary)]">
            Profile complete
          </span>
        </div>
        <h2 className="mt-4 text-[24px] font-black tracking-[-0.03em] text-foreground">
          You&apos;re all set, <span className="text-[var(--primary)]">{name}</span>!
        </h2>
        <p className={cn("mt-1.5 text-[12px] font-medium", theme === "light" ? "text-black/40" : "text-white/40")}>
          Let&apos;s start your fight
        </p>
      </div>

      <div
        ref={boxRef}
        className={cn("relative overflow-hidden rounded-2xl border px-4 py-5 mt-8", theme === "light" ? "border-black/[0.05]" : "border-white/[0.05]")}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, var(--violet-purple-35), transparent)",
          }}
        />
        <div className="relative flex items-center justify-around gap-2">
          {[
            { l: "PERSONA", v: store.persona || "Student" },
            { l: "GOAL", v: store.goal || "Master math" },
          ].map((item) => (
            <div key={item.l} className="flex flex-col items-center gap-1">
<span className={cn("text-[8px] font-bold tracking-[0.16em] uppercase", theme === "light" ? "text-black/50" : "text-white/50")}>
                  {item.l}
                </span>
              <span className={cn("text-[13px] font-bold", theme === "light" ? "text-black/70" : "text-white/70")}>{item.v}</span>
            </div>
          ))}
        </div>
        {badges.length > 0 ? (
          <div className={cn("relative mt-4 flex items-center justify-around gap-2 border-t pt-4", theme === "light" ? "border-black/[0.05]" : "border-white/[0.05]")}>
            {badges.map((item) => (
              <div key={item!.l} className="flex flex-col items-center gap-1">
                <span className={cn("text-[8px] font-bold tracking-[0.16em] uppercase", theme === "light" ? "text-black/50" : "text-white/50")}>
                  {item!.l}
                </span>
                <span className={cn("text-[12px] font-bold", theme === "light" ? "text-black/70" : "text-white/70")}>{item!.v}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn("relative mt-4 border-t pt-4 text-[11px] font-medium", theme === "light" ? "border-black/[0.05] text-black/45" : "border-white/[0.05] text-white/45")}>
            We&apos;ll now customise your daily plan &amp; story
          </p>
        )}
      </div>
    </div>
  );
}

function CelebrationAvatar() {
  const avatarRef = useRef<HTMLDivElement>(null);
  const sparkleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!avatarRef.current || !sparkleRef.current) return;
    const sparks = Array.from(sparkleRef.current.children);
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
    tl.to(avatarRef.current, { y: -7, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 1 });
    sparks.forEach((s, i) => {
      const angle = (i / sparks.length) * Math.PI * 2;
      gsap.fromTo(
        s,
        { opacity: 0, scale: 0, x: 0, y: 0 },
        {
          opacity: [0, 1, 0] as never,
          scale: [0, 1, 0.4] as never,
          x: Math.cos(angle) * 34,
          y: Math.sin(angle) * 34,
          duration: 1.4,
          ease: "power1.out",
          repeat: -1,
          repeatDelay: 0.9,
          delay: i * 0.18,
        },
      );
    });
    return () => {
      tl.kill();
      sparks.forEach((s) => gsap.killTweensOf(s));
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <div ref={sparkleRef} className="absolute inset-0 pointer-events-none">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="size-1.5 rounded-full"
              style={{
                background: [VIOLET_PURPLE, CYAN, VIOLET_PURPLE, CYAN, VIOLET_PURPLE, CYAN][i],
              }}
            />
          </div>
        ))}
      </div>
      <div ref={avatarRef}>
        <div
          className="relative size-20 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--violet-deep-28), var(--cyan-10))",
            border: "1px solid var(--violet-purple-30)",
            boxShadow: "0 8px 30px var(--violet-deep-18)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="size-2.5 rounded-full bg-[var(--violet)]" />
            <div className="size-2.5 rounded-full bg-[var(--violet)]" />
          </div>
          <div className="absolute bottom-5.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-b-full border-b-[1.5px] border-[var(--violet-purple-70)]" />
          <div className="absolute -top-1.5 -right-1.5 text-micro text-[var(--violet)]">
            <Sparkles size={10} fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
}
