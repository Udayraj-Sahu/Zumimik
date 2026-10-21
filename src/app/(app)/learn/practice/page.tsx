"use client";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ExamShell } from "@/components/exam/exam-shell";
import { QuestionNavigator } from "@/components/exam/question-navigator";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import {
  Check,
  X,
  Zap,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  BrainCircuit,
  Target,
  Dumbbell,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePracticeSession } from "@/hooks/queries/use-practice";
import { templatesKeys } from "@/hooks/queries/use-templates";
import { useQueryClient } from "@tanstack/react-query";
import { useStepProgress } from "@/hooks/use-step-progress";
import { useTemplateStore } from "@/stores/template-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useFeedback } from "@/hooks/use-feedback";
import { usePageMeta } from "@/hooks/use-page-meta";
import { getTopicsByDomain } from "@/lib/mock/sprint";
import { getTemplatesByDomain } from "@/services/templates";
import RendererRouter from "@/components/renderers/renderer-router";
import type { Question } from "@/lib/types/sprint-session";
import type { SolveAlongTemplate, RenderMode } from "@/lib/types/template";
import { DOMAIN_LABELS } from "@/lib/types/template";
import { CTA_04, CTA_06, CTA_12, CTA_20, CTA_30, GLASS_015, GLASS_BG, GLASS_BORDER, RED_06, RED_30 } from "@/lib/theme";

type PracticeType = "mcq" | "templates";
type Phase = "config" | "active" | "done";

export default function PracticePage() {
  usePageMeta("Practice — Zuzumik");
  const router = useRouter();
  const feedback = useFeedback();
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const domain = targetExam;
  const sprintTopics = getTopicsByDomain(domain);
  const domainLabel = DOMAIN_LABELS[targetExam] || targetExam || "Templates";
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("templateId");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const [practiceType, setPracticeType] = useState<PracticeType>(templateIdParam ? "templates" : "mcq");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [phase, setPhase] = useState<Phase>("config");

  const [renderMode, setRenderMode] = useState<RenderMode>("solve_along");
  const [templateCategory, setTemplateCategory] = useState("all");
  const [loadedTemplates, setLoadedTemplates] = useState<SolveAlongTemplate[]>([]);
  const [rendererPhase, setRendererPhase] = useState<"idle" | "active" | "done">("idle");
  const [rendererCorrect, setRendererCorrect] = useState(0);
  const [, setRendererTotal] = useState(0);

  const { data: session, isLoading, error: sessionError } = usePracticeSession(topic, 10, difficulty, targetExam);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [completed, setCompleted] = useState<{ correct: number; total: number } | null>(null);

  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection } = useEntranceAnimations();

  useEffect(() => {
    if (questionRef.current) {
      gsap.fromTo(questionRef.current, { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out" });
    }
  }, [currentIndex]);

  useEffect(() => {
    if (contentRef.current && completed) {
      gsap.fromTo(contentRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
    }
  }, [completed]);

  const sessionQuestionIds = (session?.questions ?? []).map((q) => q.id).join("|");

  useEffect(() => {
    if (!session || phase !== "active") return;
    setCurrentIndex(0);
    setAnswers({});
    setRevealed(false);
    setHintOpen(false);
    setCompleted(null);
  }, [sessionQuestionIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPractice = () => {
    setPhase("active");
    setCurrentIndex(0);
    setAnswers({});
    setRevealed(false);
    setHintOpen(false);
    setCompleted(null);
  };

  const handleSelect = (optionIndex: number) => {
    if (revealed || !session) return;
    setAnswers((prev) => ({ ...prev, [session.questions[currentIndex].id]: optionIndex }));
    setRevealed(true);
    const q = session.questions[currentIndex];
    if (optionIndex === q.correctIndex) {
      feedback.correct();
    } else {
      feedback.wrong();
    }
  };

  const handleNext = () => {
    if (!session) return;
    const isLast = currentIndex >= session.questions.length - 1;
    if (isLast) {
      feedback.complete();
      const correct = session.questions.filter((q) => answers[q.id] === q.correctIndex).length;
      setCompleted({ correct, total: session.questions.length });
      setPhase("done");
    } else {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
      setHintOpen(false);
    }
  };

  const handleJump = (index: number) => {
    if (!session) return;
    const q = session.questions[index];
    if (!q) return;
    setCurrentIndex(index);
    setRevealed(answers[q.id] !== undefined);
    setHintOpen(false);
  };

  const stepProgress = useStepProgress();
  const loadTemplates = useTemplateStore((s) => s.loadTemplates);
  const currentTemplate = useTemplateStore((s) => s.templates[s.currentIndex] ?? null);
  const storeCurrentIndex = useTemplateStore((s) => s.currentIndex);
  const storeTemplates = useTemplateStore((s) => s.templates);
  const setMode = useTemplateStore((s) => s.setMode);
  const queryClient = useQueryClient();

  const startTemplatePractice = async (singleTemplateId?: string) => {
    const exam = singleTemplateId ? undefined : targetExam;
    if (!exam && !singleTemplateId) {
      feedback.wrong();
      return;
    }
    setLoadingTemplates(true);
    try {
      let templatesForSession: SolveAlongTemplate[];
      if (singleTemplateId) {
        const { getTemplate } = await import("@/services/templates");
        const tpl = await getTemplate(singleTemplateId);
        templatesForSession = tpl ? [tpl] : [];
      } else {
        const all = await queryClient.fetchQuery({
          queryKey: templatesKeys.domain(exam!),
          queryFn: () => getTemplatesByDomain(exam!),
        });
        templatesForSession = templateCategory === "all"
          ? all
          : all.filter((t) => t.concept.category === templateCategory);
      }
      if (templatesForSession.length === 0) {
        feedback.wrong();
        setLoadingTemplates(false);
        return;
      }
      setLoadedTemplates(templatesForSession);
      loadTemplates(templatesForSession);
      setMode(renderMode);
      setRendererPhase("active");
      setRendererCorrect(0);
      setRendererTotal(templatesForSession.length);
      setPhase("active");
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Latest-ref pattern: the auto-start effect only keys off the URL param and
  // the load flags; calling the live function through a ref keeps the lint-clean
  // dependency array without changing when the auto-start actually fires.
  const startTemplatePracticeRef = useRef(startTemplatePractice);
  startTemplatePracticeRef.current = startTemplatePractice;

  useEffect(() => {
    if (templateIdParam && !loadingTemplates && loadedTemplates.length === 0) {
      startTemplatePracticeRef.current(templateIdParam);
    }
  }, [templateIdParam, loadingTemplates, loadedTemplates.length]);

  const handleTemplateNext = () => {
    if (storeCurrentIndex >= storeTemplates.length - 1) {
      feedback.complete();
      setRendererPhase("done");
      const total = storeTemplates.length;
      setCompleted({ correct: rendererCorrect, total });
    } else {
      useTemplateStore.getState().nextTemplate();
      stepProgress.reset();
    }
  };

  const question: Question | null = session?.questions[currentIndex] ?? null;

  /* ================================================================ */
  /*  CONFIG PHASE                                                     */
  /* ================================================================ */
  if (phase === "config") {
    return (
      <PageContainer>
        <div ref={headerRef} className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 max-[359px]:px-3 mb-3">
            <Dumbbell size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">PRACTICE</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">
            Sharpen your skills with MCQ drills or technique walkthroughs
          </p>
        </div>

        {/* Practice Type Toggle */}
        <div ref={animateSection} data-section-index="0" className="mb-5">
          <div className="flex gap-2 max-[359px]:gap-1.5 rounded-3xl border backdrop-blur-xl p-1.5" style={{ borderColor: GLASS_BORDER, background: GLASS_BG }}>
            <button
              type="button"
              onClick={() => setPracticeType("mcq")}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl py-3 max-[359px]:py-2.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] outline-none transition-all",
                practiceType === "mcq"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground/50 hover:text-foreground",
              )}
            >
              <BookOpen size={14} /> MCQ
            </button>
            <button
              type="button"
              onClick={() => setPracticeType("templates")}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl py-3 max-[359px]:py-2.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] outline-none transition-all",
                practiceType === "templates"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground/50 hover:text-foreground",
              )}
            >
              <BrainCircuit size={14} /> {targetExam ? domainLabel : "Templates"}
            </button>
          </div>
        </div>

        {/* ── MCQ CONFIG ──────────────────────────────────────────── */}
        {practiceType === "mcq" && (
          <>
            <div ref={animateSection} data-section-index="1" className="mb-5">
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">Choose Topic</p>
              <div className="grid grid-cols-2 gap-2.5 max-[359px]:gap-1.5 sm:grid-cols-3">
                {sprintTopics.map((t) => {
                  const Icon = t.icon;
                  const active = topic === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTopic(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-3xl border backdrop-blur-xl p-4 max-[359px]:p-3 outline-none transition-all active:scale-[0.98]",
                        active
                          ? "border-primary/40 bg-primary/[0.08] shadow-[0_0_24px_-4px_var(--primary)]"
                          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]",
                      )}
                      aria-label={`Select ${t.label}`}
                    >
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: active ? CTA_12 : GLASS_BG }}>
                        <Icon size={20} className={active ? "text-[var(--cta-lime)]" : "text-muted-foreground/30"} />
                      </div>
                      <span className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={animateSection} data-section-index="2" className="mb-5">
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">Difficulty</p>
              <div className="flex gap-2 max-[359px]:gap-1.5">
                {["Beginner", "Intermediate", "Advanced"].map((d) => {
                  const active = difficulty === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "flex-1 rounded-2xl border backdrop-blur-xl py-3 max-[359px]:px-1 max-[359px]:py-2.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] outline-none transition-all",
                        active
                          ? "border-primary/40 bg-primary/[0.08] text-foreground"
                          : "border-white/[0.06] bg-white/[0.03] text-muted-foreground/50 hover:bg-white/[0.06]",
                      )}
                      aria-label={`Difficulty ${d}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={animateSection} data-section-index="3" className="mt-8">
              <Button
                fullWidth
                size="lg"
                disabled={!topic}
                onClick={startPractice}
                className="tracking-[0.14em] hover:scale-[1.01] active:scale-[0.99]"
              >
                <BookOpen size={16} /> Start Practice
              </Button>
            </div>
          </>
        )}

        {/* ── TEMPLATES: NO EXAM ──────────────────────────────────── */}
        {practiceType === "templates" && !targetExam && (
          <div ref={animateSection} data-section-index="1" className="mt-2">
            <div className="flex flex-col items-center gap-4 max-[359px]:gap-3 rounded-3xl border border-dashed border-white/[0.06] backdrop-blur-xl p-8 max-[359px]:p-4 text-center" style={{ background: GLASS_BG }}>
              <div className="h-14 w-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <Target size={24} className="text-muted-foreground/20" />
              </div>
              <p className="text-[14px] font-semibold text-muted-foreground/60">No exam selected yet</p>
              <p className="text-[12px] text-muted-foreground/55 max-w-xs font-normal leading-relaxed">
                Choose your target exam during onboarding to unlock step-by-step technique practice.
              </p>
              <button
                type="button"
                onClick={() => router.push("/onboarding")}
                className="rounded-2xl bg-primary px-6 py-2.5 max-[359px]:px-4 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground outline-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Onboarding
              </button>
            </div>
          </div>
        )}

        {/* ── TEMPLATES: WITH EXAM ────────────────────────────────── */}
        {practiceType === "templates" && targetExam && (
          <>
            <div ref={animateSection} data-section-index="1" className="mb-5">
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">Category</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-[359px]:gap-1.5">
                {[
                  { id: "all", label: "All Techniques" },
                  { id: "multiplication", label: "Multiplication" },
                  { id: "division", label: "Division" },
                  { id: "squares", label: "Squares" },
                ].map((cat) => {
                  const active = templateCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTemplateCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-3xl border backdrop-blur-xl p-4 max-[359px]:p-3 outline-none transition-all active:scale-[0.98]",
                        active
                          ? "border-primary/40 bg-primary/[0.08]"
                          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]",
                      )}
                      aria-label={`Category ${cat.label}`}
                    >
                      <span className={cn(
                        "rounded-xl px-2.5 py-1 text-micro font-bold",
                        cat.id === "all" ? "bg-primary/10 text-primary" : "bg-[var(--amber-10)] text-[var(--amber)]",
                      )}>
                        {cat.label === "All Techniques" ? "ALL" : cat.label.slice(0, 4).toUpperCase()}
                      </span>
                      <span className="text-[13px] font-semibold">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={animateSection} data-section-index="2" className="mb-5">
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">Mode</p>
              <div className="flex gap-2 max-[359px]:gap-1.5">
                {([
                  { value: "solve_along" as const, label: "Solve Along" },
                  { value: "quick" as const, label: "Quick" },
                  { value: "guided" as const, label: "Guided" },
                ]).map((m) => {
                  const active = renderMode === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setRenderMode(m.value)}
                      className={cn(
                        "flex-1 rounded-2xl border backdrop-blur-xl py-3 max-[359px]:px-1 max-[359px]:py-2.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] outline-none transition-all",
                        active
                          ? "border-primary/40 bg-primary/[0.08] text-foreground"
                          : "border-white/[0.06] bg-white/[0.03] text-muted-foreground/50 hover:bg-white/[0.06]",
                      )}
                      aria-label={`Mode ${m.label}`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground/55 font-normal">
                {renderMode === "solve_along" && "Step-by-step reveal — learn the technique"}
                {renderMode === "quick" && "All steps visible — speed practice"}
                {renderMode === "guided" && "Auto-advancing steps with hints"}
              </p>
            </div>

            <div ref={animateSection} data-section-index="3" className="mt-8">
              <Button
                fullWidth
                size="lg"
                disabled={loadingTemplates}
                onClick={() => startTemplatePractice()}
                className="tracking-[0.14em] hover:scale-[1.01] active:scale-[0.99]"
              >
                <BrainCircuit size={16} />
                {loadingTemplates ? "Loading..." : `Start ${domainLabel} ${renderMode === "quick" ? "Quick" : renderMode === "guided" ? "Guided" : "Solve-Along"}`}
              </Button>
            </div>
          </>
        )}
      </PageContainer>
    );
  }

  /* ================================================================ */
  /*  DONE PHASE — MCQ RESULTS                                        */
  /* ================================================================ */
  if (phase === "done" && completed) {
    const accuracy = Math.round((completed.correct / completed.total) * 100);
    return (
      <PageContainer ref={contentRef} size="sm" className="pt-8">
        <div className="text-center mb-6 max-[359px]:mb-4">
          <div className={cn(
            "mx-auto mb-4 grid size-20 place-items-center rounded-full text-[28px] font-bold backdrop-blur-xl",
            accuracy >= 80 ? "bg-primary/10 text-primary" : accuracy >= 50 ? "bg-[var(--amber-10)] text-[var(--amber)]" : "bg-destructive/10 text-destructive",
          )}>
            {accuracy}%
          </div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-foreground">
            {accuracy >= 80 ? "Well Done!" : accuracy >= 50 ? "Keep Practicing!" : "Review & Improve!"}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 max-[359px]:gap-2 max-[359px]:mb-4">
          <GlassCard className="p-4 max-[359px]:p-3 text-center">
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">Correct</p>
            <p className="mt-1 text-[22px] font-bold text-foreground">{completed.correct}/{completed.total}</p>
          </GlassCard>
          <GlassCard className="p-4 max-[359px]:p-3 text-center">
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">Accuracy</p>
            <p className="mt-1 text-[22px] font-bold text-primary">{accuracy}%</p>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-3 max-[359px]:gap-2">
          <Button
            fullWidth
            size="lg"
            onClick={() => { setPhase("config"); useTemplateStore.getState().reset(); }}
            className="tracking-[0.14em] max-[359px]:py-3.5 hover:scale-[1.01] active:scale-[0.99]"
          >
            Practice Again <ChevronRight size={16} />
          </Button>
          {returnTo !== "/dashboard" && returnTo && (
            <Button
              fullWidth
              variant="glass"
              size="lg"
              onClick={() => router.push(returnTo)}
              className="tracking-[0.14em] text-[var(--amber)] border-[var(--amber-20)] bg-[var(--amber-04)] hover:bg-white/[0.04] max-[359px]:py-3.5"
            >
              Back to Sprint Setup
            </Button>
          )}
          <Button
            fullWidth
            variant="glass"
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="tracking-[0.14em] max-[359px]:py-3.5"
          >
            Dashboard
          </Button>
        </div>
      </PageContainer>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE DONE — TECHNIQUE LEARNED                               */
  /* ================================================================ */
  if (practiceType === "templates" && rendererPhase === "done" && completed) {
    const sprintTopic = searchParams.get("topic") || "";
    const sprintDifficulty = searchParams.get("difficulty") || "beginner";
    return (
      <PageContainer ref={contentRef} className="pt-8">
        <div className="text-center mb-6 max-[359px]:mb-4">
          <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-[var(--amber-10)] backdrop-blur-xl">
            <Check size={32} className="text-[var(--amber)]" />
          </div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-foreground">
            Technique Learned!
          </h2>
          <p className="mt-2 text-[12px] text-muted-foreground/45 leading-relaxed max-w-xs mx-auto font-normal">
            You&apos;ve completed the walkthrough. Now apply it under real conditions.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-[359px]:gap-2">
          {sprintTopic && (
            <button
              type="button"
              onClick={() =>
                router.push(`/play/sprint?topic=${sprintTopic}&length=5&difficulty=${sprintDifficulty}`)
              }
              className="flex items-center justify-center gap-2 rounded-3xl bg-[var(--amber-solid)] py-4 max-[359px]:py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-white dark:text-white outline-none transition-transform hover:scale-[1.01] active:scale-[0.99] whitespace-nowrap keep-white"
            >
              <Zap size={16} /> Start 5-Question Sprint
            </button>
          )}
          <Button
            fullWidth
            size="lg"
            onClick={() => { setPhase("config"); useTemplateStore.getState().reset(); }}
            className="tracking-[0.14em] max-[359px]:py-3.5 hover:scale-[1.01] active:scale-[0.99]"
          >
            Practice Another <ChevronRight size={16} />
          </Button>
          {returnTo !== "/dashboard" && returnTo && (
            <Button
              fullWidth
              variant="glass"
              size="lg"
              onClick={() => router.push(returnTo)}
              className="tracking-[0.14em] text-[var(--amber)] border-[var(--amber-20)] bg-[var(--amber-04)] hover:bg-white/[0.04] max-[359px]:py-3.5"
            >
              Back to Sprint Setup
            </Button>
          )}
          <Button
            fullWidth
            variant="glass"
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="tracking-[0.14em] max-[359px]:py-3.5"
          >
            Dashboard
          </Button>
        </div>
      </PageContainer>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE ACTIVE                                                  */
  /* ================================================================ */
  if (practiceType === "templates" && rendererPhase === "active" && currentTemplate) {
    return (
      <PageContainer>
            <div ref={headerRef} className="flex items-center justify-between mb-3 max-[359px]:mb-2 max-[359px]:gap-1.5">
          <span className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 whitespace-nowrap">
            {domainLabel} &middot; {currentTemplate.concept?.technique_name}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/55 whitespace-nowrap">
            {storeCurrentIndex + 1}/{storeTemplates.length}
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full mb-6 max-[359px]:mb-4" style={{ background: GLASS_BG }}>
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{
              width: `${((storeCurrentIndex + (stepProgress.isCorrect !== null ? 1 : 0)) / storeTemplates.length) * 100}%`,
            }}
          />
        </div>

        <RendererRouter
          template={currentTemplate}
          visibleSteps={stepProgress.visibleSteps}
          mode={renderMode}
          onStepReveal={stepProgress.handleRevealNext}
        />

        {stepProgress.allRevealed && renderMode === "solve_along" && (
          <div className="mt-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--amber)]">
              Now you try it!
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/55 font-normal">
              Apply the technique and solve on your own
            </p>
          </div>
        )}

        {(stepProgress.isCorrect !== null || stepProgress.allRevealed || renderMode === "quick") && (
          <div className="mt-6 flex gap-3 max-[359px]:gap-1.5">
            {storeCurrentIndex > 0 && (
              <Button
                variant="glass"
                size="lg"
                onClick={() => {
                  useTemplateStore.getState().prevTemplate();
                  stepProgress.reset();
                }}
                className="max-[359px]:px-3 max-[359px]:py-3.5 text-[11px] tracking-[0.14em]"
              >
                <ChevronLeft size={14} /> Previous
              </Button>
            )}
            <Button
              size="lg"
              onClick={handleTemplateNext}
              className="flex-1 tracking-[0.14em] max-[359px]:py-3.5 hover:scale-[1.01] active:scale-[0.99]"
            >
              {storeCurrentIndex >= storeTemplates.length - 1 ? "See Results" : "Next"}{" "}
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </PageContainer>
    );
  }

  /* ================================================================ */
  /*  LOADING STATES                                                   */
  /* ================================================================ */
  if (practiceType === "templates" && (loadingTemplates || rendererPhase === "idle")) {
    return (
      <PageContainer className="animate-pulse">
        <div className="h-12 rounded-2xl mb-4" style={{ background: GLASS_BG }} />
        <div className="h-48 rounded-3xl mb-4" style={{ background: GLASS_BG }} />
        <div className="h-12 rounded-2xl" style={{ background: GLASS_BG }} />
      </PageContainer>
    );
  }

  if (sessionError && !session) {
    return (
      <PageContainer>
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
          style={{ background: GLASS_BG, border: "1px solid var(--red-12)" }}
        >
          <p className="text-[13px] font-semibold text-destructive">
            {sessionError instanceof Error ? sessionError.message : "Couldn't start this practice session."}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.replace("/learn")}
              className="rounded-xl bg-primary px-5 py-2.5 text-micro font-bold uppercase tracking-wider text-primary-foreground outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to Learn
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-micro font-bold uppercase tracking-wider text-foreground outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isLoading || !session) {
    return (
      <PageContainer className="animate-pulse">
        <div className="h-12 rounded-2xl mb-4" style={{ background: GLASS_BG }} />
        <div className="h-48 rounded-3xl mb-4" style={{ background: GLASS_BG }} />
        <div className="h-12 rounded-2xl" style={{ background: GLASS_BG }} />
      </PageContainer>
    );
  }

  /* ================================================================ */
  /*  ACTIVE MCQ                                                       */
  /* ================================================================ */
  const practiceAnsweredFlags = session.questions.map((q) => answers[q.id] !== undefined);
  const showNavigator = session.questions.length >= 6;

  return (
    <PageContainer>
      <ExamShell
        header={
          <>
<div ref={headerRef} className="flex items-center justify-between mb-3 max-[359px]:mb-2 max-[359px]:gap-1.5">
              <span className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 whitespace-nowrap">
                Practice &middot; {session.topicLabel}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/55 whitespace-nowrap">
                {currentIndex + 1}/{session.questions.length}
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full mb-5 max-[359px]:mb-4" style={{ background: GLASS_BG }}>
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${((currentIndex + (revealed ? 1 : 0)) / session.questions.length) * 100}%` }}
              />
            </div>
          </>
        }
        footer={
          revealed ? (
            <div className="flex flex-col items-center">
              <Button
                fullWidth
                size="lg"
                onClick={handleNext}
                className="tracking-[0.14em] max-[359px]:py-3.5 hover:scale-[1.01] active:scale-[0.99]"
              >
                {currentIndex >= session.questions.length - 1 ? "See Results" : "Next"} <ChevronRight size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center gap-1.5 md:hidden">
              {session.questions.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2 rounded-full transition-all duration-300",
                    i === currentIndex ? "bg-primary scale-125" : i < currentIndex || answers[session.questions[i]?.id] !== undefined ? "bg-primary/40" : "bg-white/10",
                  )}
                />
              ))}
            </div>
          )
        }
        navigator={
          showNavigator ? (
            <QuestionNavigator
              count={session.questions.length}
              currentIndex={currentIndex}
              answered={practiceAnsweredFlags}
              onSelect={handleJump}
            />
          ) : undefined
        }
      >
        {question && (
          <div key={question.id} ref={questionRef}>
            <p className="text-[16px] font-bold leading-snug text-foreground mb-5 tracking-[-0.01em]">{question.text}</p>
            {!revealed && question.hint && (
              <div className="mb-5">
                {!hintOpen ? (
                  <button
                    type="button"
                    onClick={() => setHintOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-4 py-2 max-[359px]:px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary outline-none transition-all hover:bg-primary/[0.12] whitespace-nowrap"
                  >
                    <Lightbulb size={12} /> Need a hint?
                  </button>
                ) : (
                  <div className="rounded-2xl border backdrop-blur-xl p-4 max-[359px]:p-3" style={{ borderColor: CTA_20, background: CTA_04 }}>
                    <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.18em] text-primary/80 mb-1.5">
                      <Lightbulb size={12} /> Hint
                    </p>
                    <p className="text-[13px] leading-relaxed text-foreground/80">{question.hint}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2.5 max-[359px]:gap-2">
              {question.options.map((option, i) => {
                const isSelected = answers[question.id] === i;
                const isCorrect = i === question.correctIndex;
                let style: React.CSSProperties = { borderColor: GLASS_BORDER, background: GLASS_BG };
                let labelClass = "bg-white/[0.04] text-muted-foreground/50";
                if (revealed) {
                  if (isCorrect) {
                    style = { borderColor: CTA_30, background: CTA_06 };
                    labelClass = "bg-[var(--cta-lime-10)] text-[var(--cta-lime)]";
                  } else if (isSelected) {
                    style = { borderColor: RED_30, background: RED_06 };
                    labelClass = "bg-destructive/10 text-destructive";
                  } else {
                    style = { borderColor: GLASS_BG, background: GLASS_015 };
                    labelClass = "bg-white/[0.02] text-muted-foreground/20";
                  }
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(i)}
                    disabled={revealed}
                    className="flex items-center gap-3 rounded-3xl border backdrop-blur-xl p-4 max-[359px]:p-3 text-left outline-none transition-all active:scale-[0.98]"
                    style={style}
                  >
                    <span className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl text-[11px] font-bold",
                      labelClass,
                    )}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-[13px] font-medium">{option}</span>
                    {revealed && isCorrect && <Check size={18} className="text-[var(--cta-lime)] shrink-0" />}
                    {revealed && isSelected && !isCorrect && <X size={18} className="text-destructive shrink-0" />}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="mt-5 space-y-3">
                {question.explanation ? (
                  <div className="rounded-2xl border backdrop-blur-xl p-4 max-[359px]:p-3" style={{ borderColor: CTA_20, background: CTA_04 }}>
                    <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.18em] text-primary/80 mb-1.5">
                      <Lightbulb size={12} /> Why it&apos;s this
                    </p>
                    <p className="text-[13px] leading-relaxed text-foreground/80">{question.explanation}</p>
                  </div>
                ) : (
                  question.hint && (
                    <GlassCard radius="2xl" className="p-4 max-[359px]:p-3">
                      <p className="text-[12px] text-muted-foreground/60 leading-relaxed">{question.hint}</p>
                    </GlassCard>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </ExamShell>
    </PageContainer>
  );
}
