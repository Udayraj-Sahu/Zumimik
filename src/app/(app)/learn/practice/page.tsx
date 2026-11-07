"use client";
import { PageContainer } from "@/components/ui/page-container";
import { MathText } from "@/components/ui/math-text";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ExamShell } from "@/components/exam/exam-shell";
import { QuestionNavigator } from "@/components/exam/question-navigator";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { Check, X, ChevronRight, BookOpen, Dumbbell, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePracticeSession } from "@/hooks/queries/use-practice";
import { BANK_TOPIC_PREFIX, parseLevel } from "@/services/practice";
import { AdInterstitial } from "@/components/ads/ad-interstitial";
import { ServerHintPanel } from "@/components/practice/server-hint";
import { useSprintTopics } from "@/hooks/queries/use-sprint";
import { useQueryClient } from "@tanstack/react-query";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useFeedback } from "@/hooks/use-feedback";
import { usePageMeta } from "@/hooks/use-page-meta";
import { checkPracticeAnswer, type AnswerCheckOutcome } from "@/lib/answer-check";
import { queueSessionSync, sendSyncBatch, type SyncEvent } from "@/services/telemetry";
import { useWellbeing } from "@/hooks/use-wellbeing";
import { useSocialPolicy } from "@/hooks/queries/use-social-policy";
import { BreakOverlay } from "@/components/learn/break-overlay";
import { SessionChangeCard } from "@/components/adaptive/session-change-card";
import type { SessionChange } from "@/lib/learning/session-change";
import type { SprintAnswer } from "@/lib/types/sprint-session";
import type { Question, SprintResult } from "@/lib/types/sprint-session";
import {
  CTA_04,
  CTA_06,
  CTA_12,
  CTA_20,
  CTA_30,
  GLASS_015,
  GLASS_BG,
  GLASS_BORDER,
  RED_06,
  RED_30,
} from "@/lib/theme";
type Phase = "config" | "active" | "done";
export default function PracticePage() {
  usePageMeta("Practice — Zuzumik");
  const router = useRouter();
  const feedback = useFeedback();
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const domain = targetExam;
  const {
    data: sprintData,
    isLoading: topicsLoading,
    isError: topicsError,
    refetch: refetchTopics,
  } = useSprintTopics(domain);
  const sprintTopics = sprintData?.topics ?? [];
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const skillParam = searchParams.get("skill");
  const bankTopicParam = searchParams.get("bankTopic");
  // From the technique page: a difficulty level (1-5) and/or start=1 begin the session without the picker.
  const levelParam = parseLevel(searchParams.get("level"));
  const autoStart = searchParams.get("start") === "1" || levelParam !== undefined;
  const autoStartedRef = useRef(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [phase, setPhase] = useState<Phase>("config");
  const {
    data: baseSession,
    isLoading,
    error: sessionError,
    refetch: refetchSession,
  } = usePracticeSession(topic, 10, difficulty, targetExam, {
    enabled: phase === "active",
    level: levelParam,
  });
  // The learning engine watches the session for tiring and may pause it, switch hints on, or reorder what is left.
  const wellbeing = useWellbeing(phase === "active");
  const socialPolicy = useSocialPolicy().data;
  const sessionStartRef = useRef<number | null>(null);
  const [sessionChange, setSessionChange] = useState<SessionChange | null>(null);
  const session = useMemo(
    () =>
      baseSession && wellbeing.override
        ? { ...baseSession, questions: wellbeing.override }
        : baseSession,
    [baseSession, wellbeing.override],
  );
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "queued" | "failed">(
    "idle",
  );
  const pendingSyncRef = useRef<SyncEvent[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [answerCorrectness, setAnswerCorrectness] = useState<Record<string, boolean | null>>({});
  const [answerTimes, setAnswerTimes] = useState<Record<string, number>>({});
  // The device time at which each answer was submitted (kept for the attempt's real timestamp).
  const [answeredAtById, setAnsweredAtById] = useState<Record<string, number>>({});
  const [textAnswer, setTextAnswer] = useState("");
  const [textVerdict, setTextVerdict] = useState<AnswerCheckOutcome | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [completed, setCompleted] = useState<{
    correct: number;
    total: number;
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const questionStartedAtRef = useRef(Date.now());
  const { headerRef, animateSection } = useEntranceAnimations();
  useEffect(() => {
    if (questionRef.current) {
      gsap.fromTo(
        questionRef.current,
        { opacity: 0, x: 12 },
        { opacity: 1, x: 0, duration: 0.2, ease: "power2.out" },
      );
    }
  }, [currentIndex]);
  useEffect(() => {
    questionStartedAtRef.current = Date.now();
  }, [currentIndex]);
  useEffect(() => {
    if (contentRef.current && completed) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
      );
    }
  }, [completed]);
  // Deep link from the Explorer: /learn/practice?skill=<catalog skill>. Only a skill the catalog actually serves is
  // selected; anything else is ignored rather than requested.
  useEffect(() => {
    if (!skillParam || topic) return;
    if (!sprintData?.topics.some((t) => t.id === skillParam)) return;
    setTopic(skillParam);
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startPractice();
    }
  }, [skillParam, sprintData, topic]); // eslint-disable-line react-hooks/exhaustive-deps
  // Deep link from an Explorer problem-bank topic: /learn/practice?bankTopic=<label>. Starts a GET /practice/session
  // for that corpus label straight away (it is not in the skill picker, so there is nothing to choose).
  const bankStartedRef = useRef(false);
  useEffect(() => {
    if (!bankTopicParam || bankStartedRef.current || topic) return;
    bankStartedRef.current = true;
    setTopic(`${BANK_TOPIC_PREFIX}${bankTopicParam}`);
    setPhase("active");
  }, [bankTopicParam, topic, "mcq"]);
  // Keyed to the questions as SERVED: the engine reordering what is left must not reset the learner's progress.
  const sessionQuestionIds = (baseSession?.questions ?? []).map((q) => q.id).join("|");
  useEffect(() => {
    if (!baseSession || phase !== "active") return;
    wellbeing.reset();
    setSessionChange(null);
    sessionStartRef.current = Date.now();
    setCurrentIndex(0);
    setAnswers({});
    setAnswerCorrectness({});
    setAnswerTimes({});
    setAnsweredAtById({});
    setTextAnswer("");
    setTextVerdict(null);
    setRevealed(false);
    setHintOpen(false);
    setCompleted(null);
  }, [sessionQuestionIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const startPractice = () => {
    // Each start asks the backend for a new session (it excludes items already attempted); never reuse a cached one.
    queryClient.removeQueries({ queryKey: ["practice"] });
    setSyncState("idle");
    pendingSyncRef.current = null;
    wellbeing.reset();
    setPhase("active");
    setCurrentIndex(0);
    setAnswers({});
    setAnswerCorrectness({});
    setAnswerTimes({});
    setAnsweredAtById({});
    setTextAnswer("");
    setTextVerdict(null);
    setRevealed(false);
    setHintOpen(false);
    setCompleted(null);
  };
  /** Tell the learning engine about a scored answer, with everything answered so far (the current answer included). */
  const reportScored = (q: Question, answer: number | string, correct: boolean | null) => {
    if (!session) return;
    const now = Date.now();
    const timeSpentMs = Math.max(0, now - questionStartedAtRef.current);
    const answersSoFar: SprintAnswer[] = session.questions.flatMap((qq) => {
      const isCurrent = qq.id === q.id;
      const given = isCurrent ? answer : answers[qq.id];
      if (given === undefined) return [];
      return [
        {
          questionId: qq.id,
          selectedIndex: typeof given === "number" ? given : -1,
          ...(typeof given === "string" ? { answerText: given } : {}),
          correct: isCurrent
            ? correct
            : (answerCorrectness[qq.id] ??
              (typeof given === "number" ? given === qq.correctIndex : null)),
          timeSpent: isCurrent ? timeSpentMs / 1000 : (answerTimes[qq.id] ?? 0),
          ...(isCurrent
            ? { answeredAt: now }
            : answeredAtById[qq.id] !== undefined
              ? { answeredAt: answeredAtById[qq.id] }
              : {}),
        },
      ];
    });
    wellbeing.onScored({
      question: q,
      questions: session.questions,
      servedCount: currentIndex + 1,
      correct,
      timeSpentMs,
      answersSoFar,
      sessionStartedAt: sessionStartRef.current ?? now,
      sessionCapMin: socialPolicy?.kidsMode ? socialPolicy.sessionCapMinutes : null,
    });
  };
  const handleSelect = (optionIndex: number) => {
    if (revealed || !session) return;
    const question = session.questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
    setAnsweredAtById((prev) => ({ ...prev, [question.id]: Date.now() }));
    setAnswerTimes((prev) => ({
      ...prev,
      [question.id]: Math.max(0, (Date.now() - questionStartedAtRef.current) / 1000),
    }));
    setRevealed(true);
    const q = question;
    reportScored(q, optionIndex, optionIndex === q.correctIndex);
    if (optionIndex === q.correctIndex) {
      feedback.correct();
      setAnswerCorrectness((previous) => ({ ...previous, [q.id]: true }));
    } else {
      feedback.wrong();
      setAnswerCorrectness((previous) => ({ ...previous, [q.id]: false }));
    }
  };
  const handleTextSubmit = () => {
    if (revealed || !session) return;
    const q = session.questions[currentIndex];
    if (!q || !textAnswer.trim()) return;
    const verdict = checkPracticeAnswer(
      textAnswer,
      q.expectedAnswer ?? null,
      q.answerCheck ?? "client_extract",
    );
    setTextVerdict(verdict);
    if (verdict === "unparsable") return;
    setAnswers((previous) => ({ ...previous, [q.id]: textAnswer }));
    setAnsweredAtById((previous) => ({ ...previous, [q.id]: Date.now() }));
    setAnswerTimes((previous) => ({
      ...previous,
      [q.id]: Math.max(0, (Date.now() - questionStartedAtRef.current) / 1000),
    }));
    setAnswerCorrectness((previous) => ({
      ...previous,
      [q.id]: verdict === "deferred" ? null : verdict === "correct",
    }));
    setRevealed(true);
    reportScored(q, textAnswer, verdict === "deferred" ? null : verdict === "correct");
    if (verdict === "correct") feedback.correct();
    if (verdict === "incorrect") feedback.wrong();
  };
  const sendPendingSync = async () => {
    const events = pendingSyncRef.current;
    if (!events) return;
    setSyncState("saving");
    try {
      const outcome = await sendSyncBatch(events);
      pendingSyncRef.current = null;
      if (outcome === "queued") {
        // Not acknowledged by the server: stored on this device and retried automatically. Never reported as saved.
        setSyncState("queued");
        return;
      }
      // Acknowledged: refresh everything the attempts feed.
      setSyncState("saved");
      for (const key of [
        "adaptive-state",
        "dashboard",
        "account-summary",
        "sprint",
        "profile",
        "learner-view",
        "review-items",
        "mastery-history",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    } catch {
      setSyncState("failed"); // the batch stays pending for Retry
    }
  };
  const handleNext = async () => {
    if (!session) return;
    setTextAnswer("");
    setTextVerdict(null);
    const isLast = currentIndex >= session.questions.length - 1;
    if (isLast) {
      feedback.complete();
      const graded = Object.values(answerCorrectness).filter((value) => value !== null);
      const correct = graded.filter(Boolean).length;
      setCompleted({ correct, total: graded.length });
      setPhase("done");
      const telemetryAnswers = session.questions.flatMap((question) => {
        const answer = answers[question.id];
        if (answer === undefined) return [];
        const correctness =
          answerCorrectness[question.id] ??
          (typeof answer === "number" ? answer === question.correctIndex : null);
        return [
          {
            questionId: question.id,
            selectedIndex: typeof answer === "number" ? answer : -1,
            ...(typeof answer === "string" ? { answerText: answer } : {}),
            correct: correctness,
            timeSpent: answerTimes[question.id] ?? 0,
            ...(answeredAtById[question.id] !== undefined
              ? { answeredAt: answeredAtById[question.id] }
              : {}),
          },
        ];
      });
      const totalTimeSpent = telemetryAnswers.reduce((sum, answer) => sum + answer.timeSpent, 0);
      const telemetryResult: SprintResult = {
        answers: telemetryAnswers,
        score: telemetryAnswers.filter((answer) => answer.correct === true).length,
        total: telemetryAnswers.length,
        accuracy: graded.length > 0 ? Math.round((correct / graded.length) * 100) : 0,
        totalTimeSpent,
        xpEarned: 0,
      };
      // Built once: a retry re-sends the SAME event ids, which the backend treats idempotently.
      pendingSyncRef.current = await queueSessionSync(
        session,
        telemetryResult,
        targetExam ?? undefined,
        "practice",
        { extraEvents: wellbeing.events(), onChange: setSessionChange },
      );
      void sendPendingSync();
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
    setTextAnswer(typeof answers[q.id] === "string" ? (answers[q.id] as string) : "");
    const correctness = answerCorrectness[q.id];
    setTextVerdict(
      correctness === null
        ? "deferred"
        : correctness === true
          ? "correct"
          : correctness === false
            ? "incorrect"
            : null,
    );
    setHintOpen(false);
  };
  const queryClient = useQueryClient();
  const question: Question | null = session?.questions[currentIndex] ?? null;
  // New material is counted against the engine's cap as it is shown; while the engine keeps the learner in guided mode, hints start open.
  useEffect(() => {
    if (question) wellbeing.onServed(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, question?.id]);
  useEffect(() => {
    if (wellbeing.guided && question?.hint) setHintOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wellbeing.guided, currentIndex]);
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
            Sharpen your skills with multiple-choice drills
          </p>
        </div>

        {/* ── MCQ CONFIG ──────────────────────────────────────────── */}
        {
          <>
            <div ref={animateSection} data-section-index="1" className="mb-5">
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">
                Choose Topic
              </p>
              {topicsLoading && (
                <div
                  className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 animate-pulse"
                  aria-busy="true"
                  data-testid="topics-loading"
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[92px] rounded-3xl"
                      style={{ background: GLASS_BG }}
                    />
                  ))}
                </div>
              )}
              {topicsError && !topicsLoading && (
                <div
                  role="alert"
                  data-testid="topics-error"
                  className="rounded-3xl p-5 text-center"
                  style={{ background: GLASS_BG, border: "1px solid var(--red-12)" }}
                >
                  <p className="text-[13px] font-semibold text-destructive">
                    Couldn&apos;t load practice topics.
                  </p>
                  <Button onClick={() => refetchTopics()} className="mt-3 px-5 py-2.5">
                    Retry
                  </Button>
                </div>
              )}
              {!topicsLoading && !topicsError && sprintTopics.length === 0 && (
                <p
                  role="status"
                  data-testid="topics-empty"
                  className="rounded-3xl p-5 text-center text-[13px] text-muted-foreground/60"
                  style={{ background: GLASS_BG }}
                >
                  No practice topics are available yet.
                </p>
              )}
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
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{ background: active ? CTA_12 : GLASS_BG }}
                      >
                        <Icon
                          size={20}
                          className={active ? "text-[var(--cta-lime)]" : "text-muted-foreground/30"}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div ref={animateSection} data-section-index="2" className="mb-5">
              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">
                Difficulty
              </p>
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
        }

        {/* ── TEMPLATES: NO EXAM ──────────────────────────────────── */}

        {/* ── TEMPLATES: WITH EXAM ────────────────────────────────── */}
      </PageContainer>
    );
  }
  /* ================================================================ */
  /*  DONE PHASE — MCQ RESULTS                                        */
  /* ================================================================ */
  if (phase === "done" && completed) {
    // total is 0 when every answer was deferred to server-side checking: no local verdict to show.
    const accuracy =
      completed.total > 0 ? Math.round((completed.correct / completed.total) * 100) : 0;
    return (
      <PageContainer ref={contentRef} size="sm" className="pt-8">
        <AdInterstitial />
        <div className="text-center mb-6 max-[359px]:mb-4">
          <div
            className={cn(
              "mx-auto mb-4 grid size-20 place-items-center rounded-full text-[28px] font-bold backdrop-blur-xl",
              accuracy >= 80
                ? "bg-primary/10 text-primary"
                : accuracy >= 50
                  ? "bg-[var(--amber-10)] text-[var(--amber)]"
                  : "bg-destructive/10 text-destructive",
            )}
          >
            {completed.total > 0 ? `${accuracy}%` : "--"}
          </div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em] text-foreground">
            {accuracy >= 80
              ? "Well Done!"
              : accuracy >= 50
                ? "Keep Practicing!"
                : "Review & Improve!"}
          </h2>
        </div>

        <p
          role="status"
          data-testid="sync-status"
          className={cn(
            "mb-4 text-center text-[12px]",
            syncState === "failed" ? "text-destructive" : "text-muted-foreground/60",
          )}
        >
          {syncState === "saving" && "Saving your progress…"}
          {syncState === "saved" && "Progress saved."}
          {syncState === "queued" &&
            "Saved on this device. It will sync automatically when you're back online."}
          {syncState === "failed" && (
            <>
              Couldn&apos;t save your progress.{" "}
              <button
                type="button"
                onClick={() => void sendPendingSync()}
                className="underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retry
              </button>
            </>
          )}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5 max-[359px]:gap-2 max-[359px]:mb-4">
          <GlassCard className="p-4 max-[359px]:p-3 text-center">
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
              Correct
            </p>
            <p className="mt-1 text-[22px] font-bold text-foreground">
              {completed.correct}/{completed.total}
            </p>
          </GlassCard>
          <GlassCard className="p-4 max-[359px]:p-3 text-center">
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
              Accuracy
            </p>
            <p className="mt-1 text-[22px] font-bold text-primary">{accuracy}%</p>
          </GlassCard>
        </div>

        <SessionChangeCard change={sessionChange} />

        <div className="mt-4 flex flex-col gap-3 max-[359px]:gap-2">
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              setPhase("config");
            }}
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
  if (sessionError && !session) {
    return (
      <PageContainer>
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
          style={{ background: GLASS_BG, border: "1px solid var(--red-12)" }}
        >
          <p className="text-[13px] font-semibold text-destructive">
            {sessionError instanceof Error
              ? sessionError.message
              : "Couldn't start this practice session."}
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
              onClick={() => refetchSession()}
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
  if (session.questions.length === 0) {
    return (
      <PageContainer>
        <div
          role="status"
          data-testid="session-empty"
          className="flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
          style={{ background: GLASS_BG, border: GLASS_BORDER }}
        >
          <p className="text-[13px] font-semibold text-foreground">
            No questions are available for this topic right now.
          </p>
          <p className="text-[12px] text-muted-foreground/60">
            Try another topic, or come back later.
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("config");
            }}
            className="rounded-xl bg-primary px-5 py-2.5 text-micro font-bold uppercase tracking-wider text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Choose another topic
          </button>
        </div>
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
      {wellbeing.breakInfo && (
        <BreakOverlay
          kind={wellbeing.breakInfo.kind}
          seconds={wellbeing.breakInfo.seconds}
          onDone={wellbeing.dismissBreak}
        />
      )}
      <ExamShell
        header={
          <>
            <div
              ref={headerRef}
              className="flex items-center justify-between mb-3 max-[359px]:mb-2 max-[359px]:gap-1.5"
            >
              <span className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 whitespace-nowrap">
                Practice &middot; {session.topicLabel}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/55 whitespace-nowrap">
                {currentIndex + 1}/{session.questions.length}
              </span>
            </div>

            <div
              className="h-1.5 w-full rounded-full mb-5 max-[359px]:mb-4"
              style={{ background: GLASS_BG }}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{
                  width: `${((currentIndex + (revealed ? 1 : 0)) / session.questions.length) * 100}%`,
                }}
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
                {currentIndex >= session.questions.length - 1 ? "See Results" : "Next"}{" "}
                <ChevronRight size={16} />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center gap-1.5 md:hidden">
              {session.questions.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2 rounded-full transition-all duration-300",
                    i === currentIndex
                      ? "bg-primary scale-125"
                      : i < currentIndex || answers[session.questions[i]?.id] !== undefined
                        ? "bg-primary/40"
                        : "bg-white/10",
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
            <p className="text-[16px] font-bold leading-snug text-foreground mb-5 tracking-[-0.01em]">
              <MathText text={question.text} />
            </p>
            {!question.hint && (
              <ServerHintPanel key={question.id} templateId={question.id} disabled={revealed} />
            )}
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
                  <div
                    className="rounded-2xl border backdrop-blur-xl p-4 max-[359px]:p-3"
                    style={{ borderColor: CTA_20, background: CTA_04 }}
                  >
                    <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.18em] text-primary/80 mb-1.5">
                      <Lightbulb size={12} /> Hint
                    </p>
                    <p className="text-[13px] leading-relaxed text-foreground/80">
                      {question.hint}
                    </p>
                  </div>
                )}
              </div>
            )}
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
                    disabled={revealed}
                    className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[15px] font-semibold text-foreground outline-none focus:border-primary/40 disabled:opacity-70"
                    placeholder="Enter a number"
                  />
                </label>
                {textVerdict === "unparsable" && (
                  <p role="alert" className="text-[12px] text-destructive">
                    Enter a valid numeric answer.
                  </p>
                )}
                {revealed && textVerdict === "correct" && (
                  <p className="text-[12px] font-semibold text-primary">Correct.</p>
                )}
                {revealed && textVerdict === "incorrect" && (
                  <p className="text-[12px] font-semibold text-destructive">
                    Not quite. Expected answer: {question.expectedAnswer}
                  </p>
                )}
                {revealed && textVerdict === "deferred" && (
                  <p className="text-[12px] text-muted-foreground">
                    This answer is awaiting server-side grading.
                  </p>
                )}
                {!revealed && (
                  <Button type="button" onClick={handleTextSubmit} disabled={!textAnswer.trim()}>
                    Check answer <ChevronRight size={14} />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-[359px]:gap-2">
                {question.options.map((option, i) => {
                  const isSelected = answers[question.id] === i;
                  const isCorrect = i === question.correctIndex;
                  let style: React.CSSProperties = {
                    borderColor: GLASS_BORDER,
                    background: GLASS_BG,
                  };
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
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-xl text-[11px] font-bold",
                          labelClass,
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 text-[13px] font-medium">{option}</span>
                      {revealed && isCorrect && (
                        <Check size={18} className="text-[var(--cta-lime)] shrink-0" />
                      )}
                      {revealed && isSelected && !isCorrect && (
                        <X size={18} className="text-destructive shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {revealed && (
              <div className="mt-5 space-y-3">
                {question.explanation ? (
                  <div
                    className="rounded-2xl border backdrop-blur-xl p-4 max-[359px]:p-3"
                    style={{ borderColor: CTA_20, background: CTA_04 }}
                  >
                    <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.18em] text-primary/80 mb-1.5">
                      <Lightbulb size={12} /> Why it&apos;s this
                    </p>
                    <p className="text-[13px] leading-relaxed text-foreground/80">
                      {question.explanation}
                    </p>
                  </div>
                ) : (
                  question.hint && (
                    <GlassCard radius="2xl" className="p-4 max-[359px]:p-3">
                      <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
                        {question.hint}
                      </p>
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
