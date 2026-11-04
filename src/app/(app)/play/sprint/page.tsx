"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { Check, X, Clock, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSprintSession } from "@/hooks/queries/use-sprint-session";
import { useSprintStore } from "@/stores/sprint-store";
import { useResumeStore, type ResumeSnapshot } from "@/stores/resume-store";
import { useFeedback } from "@/hooks/use-feedback";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { checkPracticeAnswer, type AnswerCheckOutcome } from "@/lib/answer-check";
import type { Question } from "@/lib/types/sprint-session";
import TrustBadge from "@/components/ui/trust-badge";
import ContentFeedback from "@/components/ui/content-feedback";
import { Button } from "@/components/ui/button";
import { ExamShell } from "@/components/exam/exam-shell";
import { QuestionNavigator } from "@/components/exam/question-navigator";
import { GLASS_02, GLASS_BG, GLASS_BORDER, RED_06, RED_30 } from "@/lib/theme";
import { formatTime } from "@/lib/text";

function SprintContent() {
  usePageMeta("Sprint — Zuzumik");
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic") ?? "";
  const length = parseInt(searchParams.get("length") ?? "10", 10);
  const difficulty = searchParams.get("difficulty") ?? "beginner";
  const isAdaptive = searchParams.get("adaptive") === "1";
  const adaptiveDomain = searchParams.get("domain");
  const resumeParam = searchParams.get("resume") === "1";

  const targetExam = useOnboardingStore((s) => s.targetExam);
  const feedback = useFeedback();
  const { data, isLoading, error } = useSprintSession(topic, length, difficulty, targetExam);
  const snapshot = useResumeStore((s) => s.snapshot);
  const saveSnapshot = useResumeStore((s) => s.saveSnapshot);
  const clearSnapshot = useResumeStore((s) => s.clearSnapshot);
  const {
    status, currentIndex, timeLeft, answers,
    initSprint, resumeSprint, answerCurrent, answerTextCurrent, nextQuestion, tick, jumpTo, completeSprint,
  } = useSprintStore();

  const isResume = resumeParam && !!snapshot && snapshot.kind === "sprint" && snapshot.topic === topic;
  const activeQuestions = useMemo(
    () => (isResume ? (snapshot?.questions ?? []) : (data?.questions ?? [])),
    [isResume, snapshot, data],
  );
  const activeTopicLabel = isResume ? snapshot.topicLabel : data?.topicLabel;
  const activeDifficulty = isResume ? snapshot.difficulty : data?.difficulty;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [textVerdict, setTextVerdict] = useState<AnswerCheckOutcome | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout>>();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const totalTimeRef = useRef(0);
  const initializedRef = useRef(false);

  const buildSnapshot = useCallback((): ResumeSnapshot | null => {
    if (activeQuestions.length === 0) return null;
    const s = useSprintStore.getState();
    return {
      kind: "sprint",
      topic,
      topicLabel: activeTopicLabel ?? topic,
      difficulty: activeDifficulty ?? difficulty,
      totalTime: totalTimeRef.current,
      questions: activeQuestions,
      currentIndex: s.currentIndex,
      answers: s.answers,
      questionStartTime: s.questionStartTime,
      sessionStartTime: s.sessionStartTime ?? Date.now(),
      timeLeft: s.timeLeft,
      isAdaptive,
      domain: adaptiveDomain ?? undefined,
      savedAt: Date.now(),
    };
  }, [activeQuestions, activeTopicLabel, activeDifficulty, topic, difficulty, isAdaptive, adaptiveDomain]);

  const commitSnapshot = useCallback(() => {
    const snap = buildSnapshot();
    if (snap) saveSnapshot(snap);
  }, [buildSnapshot, saveSnapshot]);

  const goToResults = useCallback(() => {
    const params = new URLSearchParams();
    if (isAdaptive) {
      params.set("adaptive", "1");
      if (adaptiveDomain) params.set("domain", adaptiveDomain);
    }
    const qs = params.toString();
    router.push(`/play/sprint/results${qs ? `?${qs}` : ""}`);
  }, [router, isAdaptive, adaptiveDomain]);

  const finishSprint = useCallback(() => {
    if (activeQuestions.length > 0) {
      feedback.complete();
      completeSprint({
        questions: activeQuestions,
        topic: topic,
        topicLabel: activeTopicLabel ?? topic,
        difficulty: activeDifficulty ?? difficulty,
      });
      clearSnapshot();
      goToResults();
    }
  }, [activeQuestions, activeTopicLabel, activeDifficulty, topic, difficulty, completeSprint, goToResults, feedback, clearSnapshot]);

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

  const answerCount = Object.keys(answers).length;

  const answeredFlags = useMemo(
    () => activeQuestions.map((q) => answers[q.id] !== undefined),
    [activeQuestions, answers],
  );
  const showNavigator = activeQuestions.length >= 3;

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

  useEffect(() => {
    if (status === "active" && timeLeft <= 0) {
      finishSprint();
    }
  }, [status, timeLeft, finishSprint]);

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
      const isLast = currentIndex >= activeQuestions.length - 1;
      if (isLast) {
        finishSprint();
      } else {
        setSelectedIndex(null);
        setShowFeedback(false);
        nextQuestion();
      }
    }, 1200);
  };

  const handleTextSubmit = () => {
    if (showFeedback || status !== "active") return;
    const q = activeQuestions[currentIndex];
    if (!q || !textAnswer.trim()) return;
    const verdict = checkPracticeAnswer(textAnswer, q.expectedAnswer ?? null, q.answerCheck ?? "client_extract");
    setTextVerdict(verdict);
    if (verdict === "unparsable") return;

    answerTextCurrent(q.id, textAnswer, verdict === "deferred" ? null : verdict === "correct");
    setShowFeedback(true);
    if (verdict === "correct") feedback.correct();
    if (verdict === "incorrect") feedback.wrong();
    autoAdvanceRef.current = setTimeout(() => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      if (currentIndex >= activeQuestions.length - 1) finishSprint();
      else {
        setSelectedIndex(null);
        setTextAnswer("");
        setTextVerdict(null);
        setShowFeedback(false);
        nextQuestion();
      }
    }, 1200);
  };

  const handleNext = () => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    const isLast = currentIndex >= activeQuestions.length - 1;
    if (isLast) {
      finishSprint();
    } else {
      setSelectedIndex(null);
      setTextAnswer("");
      setTextVerdict(null);
      setShowFeedback(false);
      nextQuestion();
    }
  };

  const handleJump = (index: number) => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (index < 0 || index >= activeQuestions.length) return;
    setSelectedIndex(null);
    const existingAnswer = answers[activeQuestions[index].id];
    setTextAnswer(existingAnswer?.answerText ?? "");
    setTextVerdict(
      existingAnswer?.correct === null
        ? "deferred"
        : existingAnswer?.correct === true
          ? "correct"
          : existingAnswer?.correct === false
            ? "incorrect"
            : null,
    );
    setShowFeedback(false);
    jumpTo(index);
  };

  const { headerRef, reduced } = useEntranceAnimations();

  const questionRef = useCallback((el: HTMLDivElement | null) => {
    if (el && !reduced) {
      gsap.fromTo(el, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" });
    }
  }, [reduced]);

  if (!topic || length <= 0) {
    return (
      <PageContainer className="text-center">
        <p className="text-[13px] text-muted-foreground">No sprint configuration found.</p>
        <Button
          onClick={() => router.push("/play/configure-sprint")}
          className="mt-4 min-h-11 px-6"
        >
          Configure Sprint
        </Button>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="text-center">
        <p className="text-[13px] font-semibold text-destructive">Failed to load sprint questions.</p>
        <p className="mt-2 text-[12px] text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="glass"
            onClick={() => router.push("/play/configure-sprint")}
          >
            Back
          </Button>
          <Button
            onClick={() => router.refresh()}
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
  const isTimerLow = timeLeft <= 30;

  return (
    <PageContainer>
      <ExamShell
        header={
          <>
            <div ref={headerRef} className="pb-3 max-[359px]:pb-2 text-center">
              <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
                <Zap size={10} className="text-primary" />
                <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">SPRINT</h1>
              </div>
              <div className="flex justify-center">
                <span className="text-micro font-bold uppercase tracking-widest text-muted-foreground/50 pb-0.5 whitespace-nowrap">
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

            <div className="flex items-center justify-between mb-5 max-[359px]:mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-micro font-bold uppercase tracking-wider text-primary max-[359px]:px-2.5 whitespace-nowrap">
                <Zap size={10} />
                {activeTopicLabel}
              </span>
              <div className="flex items-center gap-2 max-[359px]:gap-1.5">
                {question?.trustStatus && <TrustBadge status={question.trustStatus} />}
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-micro font-bold font-mono backdrop-blur-xl max-[359px]:px-2.5 whitespace-nowrap",
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
              progress={progress}
            />
          ) : undefined
        }
      >
        {question && (
          <div key={question.id} ref={questionRef}>
            <p className="text-[16px] font-bold leading-snug text-foreground mb-5 max-[359px]:mb-4">
              {question.text}
            </p>

            {question.answerType === "text" ? (
              <div className="flex flex-col gap-3">
                <label className="text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
                  Your answer
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(event) => {
                      setTextAnswer(event.target.value);
                      setTextVerdict(null);
                    }}
                    disabled={showFeedback}
                    className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[15px] font-semibold text-foreground outline-none focus:border-primary/40 disabled:opacity-70"
                    placeholder="Enter a number"
                  />
                </label>
                {textVerdict === "unparsable" && <p role="alert" className="text-[12px] text-destructive">Enter a valid numeric answer.</p>}
                {showFeedback && textVerdict === "correct" && <p className="text-[12px] font-semibold text-primary">Correct.</p>}
                {showFeedback && textVerdict === "incorrect" && (
                  <p className="text-[12px] font-semibold text-destructive">Not quite. Expected answer: {question.expectedAnswer}</p>
                )}
                {showFeedback && textVerdict === "deferred" && (
                  <p className="text-[12px] text-muted-foreground">Answer recorded for server review.</p>
                )}
                {!showFeedback && (
                  <Button type="button" onClick={handleTextSubmit} disabled={!textAnswer.trim()}>
                    Submit answer <ChevronRight size={14} />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-[359px]:gap-2">
                {question.options.map((option, i) => {
                const isSelected = selectedIndex === i;
                const isCorrect = i === question.correctIndex;
                let variantStyles: React.CSSProperties = { backgroundColor: GLASS_BG, borderColor: GLASS_BORDER };
                let variantClass = "border backdrop-blur-xl text-foreground hover:bg-white/[0.06] active:bg-white/[0.06]" as string;
                if (showFeedback) {
                  if (isSelected && isCorrect) {
                    variantClass = "border text-primary";
                    variantStyles = { backgroundColor: "var(--accent-06)", borderColor: "var(--accent-30)" };
                  } else if (isSelected && !isCorrect) {
                    variantClass = "border text-destructive";
                    variantStyles = { backgroundColor: RED_06, borderColor: RED_30 };
                  } else if (isCorrect) {
                    variantClass = "border text-primary";
                    variantStyles = { backgroundColor: "var(--accent-06)", borderColor: "var(--accent-30)" };
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
                      "flex items-center gap-3 rounded-3xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] max-[359px]:gap-2.5 max-[359px]:p-3",
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
            )}

            {showFeedback && (
              <div className="mt-5 max-[359px]:mt-4">
                <ContentFeedback questionId={question.id} />
              </div>
            )}
          </div>
        )}
      </ExamShell>
    </PageContainer>
  );
}

export default function SprintPage() {
  return (
    <Suspense fallback={
      <PageContainer className="animate-pulse">
        <div className="h-14 rounded-xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
        <div className="h-48 rounded-3xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
        <div className="h-12 rounded-xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
      </PageContainer>
    }>
      <SprintContent />
    </Suspense>
  );
}
