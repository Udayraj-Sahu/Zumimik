"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ArrowLeft, Check, X, Clock, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMockPaperSession } from "@/hooks/queries/use-mock-exam";
import { useSprintStore } from "@/stores/sprint-store";
import { useResumeStore, type ResumeSnapshot } from "@/stores/resume-store";
import { useFeedback } from "@/hooks/use-feedback";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Question } from "@/lib/types/sprint-session";
import TrustBadge from "@/components/ui/trust-badge";
import ContentFeedback from "@/components/ui/content-feedback";
import { Button } from "@/components/ui/button";
import { ExamShell } from "@/components/exam/exam-shell";
import { QuestionNavigator } from "@/components/exam/question-navigator";
import { CTA_06, CTA_30, GLASS_02, GLASS_BG, GLASS_BORDER, RED_06, RED_30 } from "@/lib/theme";
import { formatTime } from "@/lib/text";

function MockRunContent() {
  usePageMeta("Mock Test — Zuzumik");
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperId = searchParams.get("paper") ?? "";
  const domain = searchParams.get("domain") ?? undefined;
  const resumeParam = searchParams.get("resume") === "1";

  const feedback = useFeedback();
  const { data, isLoading, error } = useMockPaperSession(paperId, domain);
  const snapshot = useResumeStore((s) => s.snapshot);
  const saveSnapshot = useResumeStore((s) => s.saveSnapshot);
  const clearSnapshot = useResumeStore((s) => s.clearSnapshot);
  const {
    status, currentIndex, timeLeft, answers,
    initSprint, resumeSprint, answerCurrent, nextQuestion, tick, jumpTo, completeSprint, reset,
  } = useSprintStore();

  const isResume = resumeParam && !!snapshot && snapshot.kind === "mock" && snapshot.paperId === paperId;
  const activeQuestions = useMemo(
    () => (isResume ? (snapshot?.questions ?? []) : (data?.questions ?? [])),
    [isResume, snapshot, data],
  );
  const activeTopic = isResume ? snapshot.topic : data?.topic;
  const activeTopicLabel = isResume ? snapshot.topicLabel : data?.topicLabel;
  const activeDifficulty = isResume ? snapshot.difficulty : data?.difficulty;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout>>();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const totalTimeRef = useRef(0);
  const initializedRef = useRef(false);

  const buildSnapshot = useCallback((): ResumeSnapshot | null => {
    if (activeQuestions.length === 0) return null;
    const s = useSprintStore.getState();
    return {
      kind: "mock",
      paperId,
      topic: activeTopic ?? paperId,
      topicLabel: activeTopicLabel ?? "Mock Test",
      difficulty: activeDifficulty ?? "Full Test",
      totalTime: totalTimeRef.current,
      questions: activeQuestions,
      currentIndex: s.currentIndex,
      answers: s.answers,
      questionStartTime: s.questionStartTime,
      sessionStartTime: s.sessionStartTime ?? Date.now(),
      timeLeft: s.timeLeft,
      isAdaptive: false,
      domain,
      savedAt: Date.now(),
    };
  }, [activeQuestions, activeTopic, activeTopicLabel, activeDifficulty, paperId, domain]);

  const commitSnapshot = useCallback(() => {
    const snap = buildSnapshot();
    if (snap) saveSnapshot(snap);
  }, [buildSnapshot, saveSnapshot]);

  const goToResults = useCallback(() => {
    const params = new URLSearchParams();
    if (domain) params.set("domain", domain);
    const qs = params.toString();
    router.push(`/play/sprint/results${qs ? `?${qs}` : ""}`);
  }, [router, domain]);

  const finishMock = useCallback(() => {
    if (activeQuestions.length > 0) {
      feedback.complete();
      completeSprint({
        questions: activeQuestions,
        topic: activeTopic ?? paperId,
        topicLabel: activeTopicLabel ?? "Mock Test",
        difficulty: activeDifficulty ?? "Full Test",
      });
      clearSnapshot();
      goToResults();
    }
  }, [activeQuestions, activeTopic, activeTopicLabel, activeDifficulty, paperId, completeSprint, goToResults, feedback, clearSnapshot]);

  useEffect(() => {
    if (isResume && snapshot && status === "idle") {
      totalTimeRef.current = snapshot.totalTime;
      resumeSprint({
        currentIndex: snapshot.currentIndex,
        answers: snapshot.answers,
        questionStartTime: snapshot.questionStartTime,
        sessionStartTime: snapshot.sessionStartTime,
        timeLeft: snapshot.timeLeft,
      });
    }
  }, [isResume, snapshot, status, resumeSprint]);

  useEffect(() => {
    if (isResume) return;
    if (data && !initializedRef.current) {
      initializedRef.current = true;
      totalTimeRef.current = data.totalTime;
      initSprint(data.totalTime);
    }
  }, [data, initSprint, isResume]);

  useEffect(() => {
    if (status !== "active" || timeLeft <= 0) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, timeLeft, tick]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === "active" && timeLeft <= 0) {
      finishMock();
    }
  }, [status, timeLeft, finishMock]);

  useEffect(() => {
    if (status === "active" && timeLeft <= 30 && timeLeft > 0) {
      feedback.countdown();
    }
  }, [status, timeLeft, feedback]);

  useEffect(() => {
    if (feedbackRef.current && showFeedback) {
      gsap.fromTo(feedbackRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" });
    }
  }, [showFeedback]);

  const answerCount = Object.keys(answers).length;

  const answeredFlags = useMemo(
    () => activeQuestions.map((q) => answers[q.id] !== undefined),
    [activeQuestions, answers],
  );
  const showNavigator = activeQuestions.length >= 6;

  useEffect(() => {
    if (status === "active" && answerCount > 0) {
      commitSnapshot();
    }
  }, [currentIndex, answerCount, status, commitSnapshot]);

  useEffect(() => {
    if (status !== "active") return;
    const flush = () => {
      const snap = buildSnapshot();
      if (snap) saveSnapshot(snap);
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [status, buildSnapshot, saveSnapshot]);

  const handleSelect = (optionIndex: number) => {
    if (showFeedback || status !== "active") return;
    const q = activeQuestions[currentIndex];
    if (!q) return;

    setSelectedIndex(optionIndex);
    setShowFeedback(true);
    answerCurrent(q.id, optionIndex);
    if (optionIndex === q.correctIndex) {
      feedback.correct();
    } else {
      feedback.wrong();
    }

    autoAdvanceRef.current = setTimeout(() => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      const isLast = currentIndex >= (activeQuestions.length ?? 1) - 1;
      if (isLast) {
        finishMock();
      } else {
        setSelectedIndex(null);
        setShowFeedback(false);
        nextQuestion();
      }
    }, 1200);
  };

  const handleNext = () => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    const isLast = currentIndex >= (activeQuestions.length ?? 1) - 1;
    if (isLast) {
      finishMock();
    } else {
      setSelectedIndex(null);
      setShowFeedback(false);
      nextQuestion();
    }
  };

  const handleJump = (index: number) => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (index < 0 || index >= (activeQuestions.length ?? 1)) return;
    setSelectedIndex(null);
    setShowFeedback(false);
    jumpTo(index);
  };

  const { headerRef, reduced } = useEntranceAnimations();

  const questionRef = useCallback((el: HTMLDivElement | null) => {
    if (el && !reduced) {
      gsap.fromTo(el, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" });
    }
  }, [reduced]);

  if (!paperId) {
    return (
      <PageContainer className="text-center">
        <p className="text-[13px] text-muted-foreground">No mock paper selected.</p>
        <Button
          onClick={() => router.push("/learn?mode=mock")}
          className="mt-4 min-h-11 max-[359px]:px-4"
        >
          Browse Papers
        </Button>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="text-center">
        <p className="text-[13px] font-semibold text-destructive">Failed to load mock paper.</p>
        <p className="mt-2 text-[12px] text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
        <div className="mt-6 flex justify-center gap-3 max-[359px]:gap-1.5">
          <Button
            variant="glass"
            onClick={() => router.push("/learn?mode=mock")}
            className="max-[359px]:px-4"
          >
            Back
          </Button>
          <Button
            onClick={() => router.refresh()}
            className="max-[359px]:px-4"
          >
            Retry
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!isResume && (isLoading || !data)) {
    return (
      <PageContainer className="animate-pulse">
        <div className="h-14 rounded-xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
        <div className="h-48 rounded-3xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
        <div className="h-12 rounded-xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
      </PageContainer>
    );
  }

  const question: Question | undefined = activeQuestions[currentIndex];
  const progress = activeQuestions.length > 0 ? ((currentIndex + (showFeedback ? 1 : 0)) / activeQuestions.length) * 100 : 0;
  const isLast = currentIndex >= activeQuestions.length - 1;
  const isTimerLow = timeLeft <= 120;

  return (
    <PageContainer>
      <ExamShell
        header={
          <>
            <div ref={headerRef} className="pb-3 text-center max-[359px]:pb-2">
              <div className="inline-flex items-center gap-2 pill px-4 py-1.5 max-[359px]:px-3 mb-3">
                <FileText size={10} className="text-primary" />
                <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">MOCK TEST</h1>
              </div>
              <div className="flex items-center justify-between max-[359px]:gap-1.5">
                <button
                  type="button"
                  onClick={() => { reset(); router.push("/learn?mode=mock"); }}
                  className="grid size-11 max-[359px]:size-10 place-items-center outline-none transition-opacity hover:opacity-70 active:opacity-50 focus-visible:ring-2 focus-visible:ring-ring rounded-xl text-muted-foreground/60 backdrop-blur-xl"
                  style={{ backgroundColor: GLASS_BG, borderColor: GLASS_BORDER }}
                  aria-label="Back to papers"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className="text-micro font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">
                  {currentIndex + 1} / {activeQuestions.length}
                </span>
              </div>
            </div>

            <div className="h-1.5 w-full rounded-full mb-5 max-[359px]:mb-4" style={{ backgroundColor: GLASS_BG }}>
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 max-[359px]:px-2.5 text-micro font-bold uppercase tracking-wider text-primary max-w-[60%] truncate whitespace-nowrap">
                <FileText size={10} />
                {activeTopicLabel}
              </span>
              <div className="flex items-center gap-2 max-[359px]:gap-1.5">
                {question?.trustStatus && <TrustBadge status={question.trustStatus} />}
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 max-[359px]:px-2.5 text-micro font-bold font-mono backdrop-blur-xl whitespace-nowrap",
                  isTimerLow ? "bg-destructive/10 text-destructive border border-destructive/20" : "text-muted-foreground border border-white/[0.06]",
                )}
                style={!isTimerLow ? { backgroundColor: GLASS_BG } : undefined}>
                  <Clock size={10} />
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </>
        }
        footer={
          showFeedback ? (
            <div ref={feedbackRef} className="flex flex-col items-center">
              <Button
                fullWidth
                size="lg"
                onClick={handleNext}
                className="max-[359px]:py-3.5 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLast ? "See Results" : "Next"} <ChevronRight size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center gap-1.5 md:hidden">
              {activeQuestions.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2 rounded-full transition-all duration-300",
                    i === currentIndex ? "bg-primary scale-125" : i < currentIndex ? "bg-primary/40" : "bg-muted",
                  )}
                />
              ))}
            </div>
          )
        }
        navigator={
          showNavigator ? (
            <QuestionNavigator
              count={activeQuestions.length}
              currentIndex={currentIndex}
              answered={answeredFlags}
              onSelect={handleJump}
            />
          ) : undefined
        }
      >
        {question && (
          <div key={question.id} ref={questionRef}>
            <p className="text-[16px] font-bold leading-snug text-foreground mb-5 max-[359px]:mb-4">
              {question.text}
            </p>

            <div className="flex flex-col gap-2.5 max-[359px]:gap-2">
              {question.options.map((option, i) => {
                const isSelected = selectedIndex === i;
                const isCorrect = i === question.correctIndex;
                let variantStyles: React.CSSProperties = { backgroundColor: GLASS_BG, borderColor: GLASS_BORDER };
                let variantClass = "border backdrop-blur-xl text-foreground hover:bg-white/[0.06] active:bg-white/[0.06]" as string;
                if (showFeedback) {
                  if (isSelected && isCorrect) {
                    variantClass = "border text-primary";
                    variantStyles = { backgroundColor: CTA_06, borderColor: CTA_30 };
                  } else if (isSelected && !isCorrect) {
                    variantClass = "border text-destructive";
                    variantStyles = { backgroundColor: RED_06, borderColor: RED_30 };
                  } else if (isCorrect) {
                    variantClass = "border text-primary";
                    variantStyles = { backgroundColor: CTA_06, borderColor: CTA_30 };
                  } else {
                    variantClass = "border text-muted-foreground/40";
                    variantStyles = { backgroundColor: GLASS_02, borderColor: GLASS_BG };
                  }
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(i)}
                    disabled={showFeedback}
                    className={cn(
                      "flex items-center gap-3 rounded-3xl border p-4 max-[359px]:p-3 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                      variantClass,
                    )}
                    style={variantStyles}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-micro font-bold text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-[13px] font-medium">{option}</span>
                    {showFeedback && isSelected && (
                      <span className={cn("size-5", isCorrect ? "text-primary" : "text-destructive")}>
                        {isCorrect ? <Check size={20} /> : <X size={20} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <div className="mt-5">
                <ContentFeedback questionId={question.id} />
              </div>
            )}
          </div>
        )}
      </ExamShell>
    </PageContainer>
  );
}

export default function MockRunPage() {
  return (
    <Suspense fallback={
      <PageContainer className="animate-pulse">
        <div className="h-14 rounded-xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
        <div className="h-48 rounded-3xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
        <div className="h-12 rounded-xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
      </PageContainer>
    }>
      <MockRunContent />
    </Suspense>
  );
}
