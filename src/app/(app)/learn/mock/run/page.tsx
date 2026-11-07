"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ArrowLeft, Check, X, Clock, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMockPaperSession } from "@/hooks/queries/use-mock-exam";
import { submitMock, submitMockAnswer } from "@/services/mock-exam";
import { gatedFeatureMessage } from "@/services/flags";
import { unfillablePaperReason } from "@/services/mock-exam";
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
import { QuestionText } from "@/components/exam/question-text";
import { CTA_06, CTA_30, GLASS_02, GLASS_BG, GLASS_BORDER, RED_06, RED_30 } from "@/lib/theme";
import { formatTime } from "@/lib/text";

function MockRunContent() {
  usePageMeta("Mock Test — Zuzumik");
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperId = searchParams.get("paper") ?? "";
  const domain = searchParams.get("domain") ?? undefined;
  const resumeParam = searchParams.get("resume") === "1";
  // ?practice=1: the learner chose to take a paper the question bank cannot make exactly as labelled practice (see unfillablePaperReason).
  const practiceParam = searchParams.get("practice") === "1";

  const feedback = useFeedback();
  const { data, isLoading, error } = useMockPaperSession(paperId, domain, practiceParam);
  const snapshot = useResumeStore((s) => s.snapshot);
  const saveSnapshot = useResumeStore((s) => s.saveSnapshot);
  const clearSnapshot = useResumeStore((s) => s.clearSnapshot);
  const {
    status, currentIndex, timeLeft, answers,
    initSprint, resumeSprint, answerCurrent, answerTextCurrent, nextQuestion, tick, jumpTo, completeSprint, reset,
  } = useSprintStore();

  const isResume = resumeParam && !!snapshot && snapshot.kind === "mock" && snapshot.paperId === paperId;
  const activeQuestions = useMemo(
    () => (isResume ? (snapshot?.questions ?? []) : (data?.questions ?? [])),
    [isResume, snapshot, data],
  );
  const activeTopic = isResume ? snapshot.topic : data?.topic;
  const activeTopicLabel = isResume ? snapshot.topicLabel : data?.topicLabel;
  const activeDifficulty = isResume ? snapshot.difficulty : data?.difficulty;
  const activeMockId = isResume ? snapshot.mockId : data?.mockId;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);
  // Each question starts with its own saved answer (or empty), so jumping around never leaks text between questions.
  useEffect(() => {
    const q = activeQuestions[currentIndex];
    setTypedAnswer(q ? (useSprintStore.getState().answers[q.id]?.answerText ?? "") : "");
  }, [currentIndex, activeQuestions]);
  const [showFeedback, setShowFeedback] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout>>();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const totalTimeRef = useRef(0);
  const initializedRef = useRef(false);

  /** Set once the exam is submitted: nothing may save a resume snapshot after that (the unmount flush would bring the card back). */
  const finishedRef = useRef(false);
  const buildSnapshot = useCallback((): ResumeSnapshot | null => {
    if (finishedRef.current) return null;
    if (Object.keys(useSprintStore.getState().answers).length === 0) return null; // nothing answered: nothing to resume
    if (activeQuestions.length === 0) return null;
    const s = useSprintStore.getState();
    return {
      kind: "mock",
      paperId,
      mockId: activeMockId,
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
  }, [activeQuestions, activeTopic, activeTopicLabel, activeDifficulty, activeMockId, paperId, domain]);

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

  const finishMock = useCallback(async () => {
    if (activeQuestions.length === 0 || submittingRef.current) return;
    const meta = {
      questions: activeQuestions,
      topic: activeTopic ?? paperId,
      topicLabel: activeTopicLabel ?? "Mock Test",
      difficulty: activeDifficulty ?? "Full Test",
      mockId: activeMockId,
    };
    if (activeMockId) {
      // Backend mock: the server grades. Never complete or clear the resume snapshot until it acknowledges.
      submittingRef.current = true;
      setSubmitError(null);
      try {
        const s = useSprintStore.getState();
        const elapsed = s.sessionStartTime ? (Date.now() - s.sessionStartTime) / 1000 : 0;
        const result = await submitMock({
          mockId: activeMockId,
          questions: activeQuestions,
          elapsedSeconds: elapsed,
          answers: activeQuestions.flatMap((q) => {
            const entry = s.answers[q.id];
            if (!entry) return [];
            const answer =
              entry.answerText !== undefined ? entry.answerText : (q.optionIds?.[entry.selectedIndex] ?? null);
            return [{ question_id: q.id, answer, time_ms: Math.round(entry.timeSpent * 1000) }];
          }),
        });
        finishedRef.current = true;
        feedback.complete();
        completeSprint(meta);
        useSprintStore.setState({ lastResult: result });
        clearSnapshot();
        goToResults();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Could not submit your exam.");
      } finally {
        submittingRef.current = false;
      }
      return;
    }
    finishedRef.current = true;
    feedback.complete();
    completeSprint(meta);
    clearSnapshot();
    goToResults();
  }, [activeQuestions, activeTopic, activeTopicLabel, activeDifficulty, activeMockId, paperId, completeSprint, goToResults, feedback, clearSnapshot]);

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

  /** Finishing with questions left unanswered asks first: stepping through with Next never counts as answering. */
  const requestFinish = () => {
    const answered = Object.keys(useSprintStore.getState().answers).length;
    if (answered < activeQuestions.length) setConfirmFinish(true);
    else void finishMock();
  };

  // Moving to a question shows what was already typed for it, so Back / Next never loses or blanks an answer.
  useEffect(() => {
    const q = activeQuestions[currentIndex];
    setTypedAnswer(q ? (useSprintStore.getState().answers[q.id]?.answerText ?? "") : "");
  }, [currentIndex, activeQuestions]);

  const handleSelect = (optionIndex: number) => {
    if (showFeedback || status !== "active") return;
    const q = activeQuestions[currentIndex];
    if (!q) return;

    if (q.serverGraded && activeMockId) {
      // No verdict is shown: the backend withholds correct answers until submit.
      setSelectedIndex(optionIndex);
      answerCurrent(q.id, optionIndex);
      const timeMs = Math.max(0, Date.now() - (useSprintStore.getState().questionStartTime ?? Date.now()));
      submitMockAnswer(activeMockId, q.id, q.optionIds?.[optionIndex] ?? null, timeMs).catch(() => {
        // Submit sends every answer again in bulk, so a lost single answer is recovered there.
      });
      autoAdvanceRef.current = setTimeout(() => {
        const isLast = currentIndex >= activeQuestions.length - 1;
        if (isLast) {
          requestFinish();
        } else {
          setSelectedIndex(null);
          nextQuestion();
        }
      }, 350);
      return;
    }

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

  // Typed (TITA / numeric) questions have no options. The answer is sent exactly as typed; the server grades it.
  const handleTextSubmit = () => {
    if (status !== "active") return;
    const q = activeQuestions[currentIndex];
    const text = typedAnswer.trim();
    if (!q || !q.serverGraded || !activeMockId || !text) return;
    answerTextCurrent(q.id, text, null);
    const timeMs = Math.max(0, Date.now() - (useSprintStore.getState().questionStartTime ?? Date.now()));
    submitMockAnswer(activeMockId, q.id, text, timeMs).catch(() => {
      // Submit sends every answer again in bulk, so a lost single answer is recovered there.
    });
    setTypedAnswer("");
    if (currentIndex >= activeQuestions.length - 1) requestFinish();
    else nextQuestion();
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

  const unfillable = error ? unfillablePaperReason(error) : null;
  if (error && unfillable) {
    const practiceUrl = (() => {
      const q = new URLSearchParams(searchParams.toString());
      q.set("practice", "1");
      return `/learn/mock/run?${q.toString()}`;
    })();
    return (
      <PageContainer className="text-center">
        <div role="alert" data-testid="mock-unfillable" className="mx-auto max-w-md">
          <p className="text-[14px] font-semibold text-foreground">This paper can&apos;t be set up as a real exam right now.</p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/70">
            The question bank doesn&apos;t have enough of the right questions for one of its sections.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/50" data-testid="mock-unfillable-reason">{unfillable}</p>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground/70">
            You can still take it as practice. Any section that can&apos;t be built exactly is filled with the closest questions we have and clearly
            labelled, and a practice attempt does not count toward your percentile.
          </p>
        </div>
        <div className="mt-6 flex justify-center gap-3 max-[359px]:gap-1.5">
          <Button variant="glass" onClick={() => router.push("/learn?mode=mock")} className="max-[359px]:px-4">
            Back
          </Button>
          <Button onClick={() => router.replace(practiceUrl)} className="max-[359px]:px-4">
            Take it as practice
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className="text-center">
        <p className="text-[13px] font-semibold text-destructive">Failed to load mock paper.</p>
        <p className="mt-2 text-[12px] text-muted-foreground/60">{gatedFeatureMessage(error, "Mock exams") ?? (error instanceof Error ? error.message : "Something went wrong")}</p>
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

            {data?.practiceLabel && (
              <p role="status" data-testid="mock-practice-notice" className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground/70">
                <strong className="text-foreground/80">Practice attempt.</strong> {data.practiceLabel}. It does not count toward your percentile.
              </p>
            )}
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
            <div className="flex items-center justify-between gap-3" data-testid="mock-nav">
              <Button
                variant="glass"
                onClick={() => handleJump(currentIndex - 1)}
                disabled={currentIndex <= 0}
                aria-label="Previous question"
                data-testid="mock-prev"
                className="min-h-11 gap-1 px-4"
              >
                <ChevronLeft size={18} /> <span className="max-[359px]:sr-only">Back</span>
              </Button>
              <span className="text-micro font-bold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap md:hidden">
                {currentIndex + 1} / {activeQuestions.length}
              </span>
              {isLast ? (
                <Button onClick={requestFinish} aria-label="Finish and submit the exam" data-testid="mock-finish" className="min-h-11 gap-1 px-4">
                  Finish <Check size={16} />
                </Button>
              ) : (
                <Button onClick={() => handleJump(currentIndex + 1)} aria-label="Next question" data-testid="mock-next" className="min-h-11 gap-1 px-4">
                  <span className="max-[359px]:sr-only">Next</span> <ChevronRight size={18} />
                </Button>
              )}
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
        {confirmFinish && (
          <div role="alertdialog" aria-label="Submit with unanswered questions" data-testid="mock-confirm-finish" className="mb-4 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-3 text-[12px] text-foreground/85">
            <p>
              You have answered {Object.keys(answers).length} of {activeQuestions.length} questions. Unanswered questions score zero and cannot be changed after you submit.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="glass" className="min-h-11 flex-1" onClick={() => setConfirmFinish(false)}>Keep going</Button>
              <Button className="min-h-11 flex-1" data-testid="mock-confirm-submit" onClick={() => { setConfirmFinish(false); void finishMock(); }}>Submit anyway</Button>
            </div>
          </div>
        )}
        {submitError && (
          <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12px] font-medium text-destructive">
            <p>Couldn&apos;t submit your exam: {submitError}</p>
            <Button className="mt-2 min-h-11" onClick={() => void finishMock()}>
              Retry submit
            </Button>
          </div>
        )}
        {question && (
          <div key={question.id} ref={questionRef}>
            <QuestionText text={question.text} />

            {question.answerType === "text" && question.serverGraded && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTextSubmit();
                }}
              >
                <label className="text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
                  Your answer
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Type your answer"
                    className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[15px] font-semibold text-foreground outline-none focus:border-primary/40"
                  />
                </label>
                <Button type="submit" disabled={!typedAnswer.trim()} className="min-h-11">
                  {currentIndex >= activeQuestions.length - 1 ? "Submit answer and finish" : "Submit answer"}
                </Button>
              </form>
            )}
            <div className="flex flex-col gap-2.5 max-[359px]:gap-2">
              {question.options.map((option, i) => {
                const chosenIndex = selectedIndex ?? (answers[question.id]?.selectedIndex ?? -1);
                const isSelected = chosenIndex === i;
                const isCorrect = !question.serverGraded && i === question.correctIndex;
                let variantStyles: React.CSSProperties = { backgroundColor: GLASS_BG, borderColor: GLASS_BORDER };
                let variantClass = "border backdrop-blur-xl text-foreground hover:bg-white/[0.06] active:bg-white/[0.06]" as string;
                if (question.serverGraded && isSelected) {
                  variantClass = "border text-primary";
                  variantStyles = { backgroundColor: CTA_06, borderColor: CTA_30 };
                } else if (showFeedback) {
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
