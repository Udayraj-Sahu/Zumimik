"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Leaf, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/math-text";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { checkPracticeAnswer } from "@/lib/answer-check";
import {
  WARMUP_SIZE,
  summarise,
  type WarmupAttempt,
  type WarmupDraft,
  type WarmupQuestion,
} from "@/lib/learning/calibration";
import { ageFromDob, DEFAULT_AGE } from "@/lib/learning/learner-state";
import {
  clearWarmupDraft,
  loadCalibration,
  loadWarmupDraft,
  saveCalibration,
  saveWarmupDraft,
} from "@/services/calibration";
import { getPracticeSession, WARMUP_TOPIC } from "@/services/practice";
import { queueSessionSync, sendSyncBatch } from "@/services/telemetry";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";
/** Only problems the server will count for mastery and that name a canonical skill can calibrate it. */
function toWarmupQuestions(questions: ReadonlyArray<Question>): WarmupQuestion[] {
  return questions
    .filter((q) => !!q.skillId && q.feedsMastery !== false && q.trustStatus !== "sandbox")
    .slice(0, WARMUP_SIZE)
    .map((q) => ({
      id: q.id,
      skillId: q.skillId as string,
      text: q.text,
      hint: q.hint,
      expectedAnswer: q.expectedAnswer ?? null,
      answerCheck: q.answerCheck ?? "client_extract",
      difficulty: q.difficulty,
    }));
}
function WarmupContent() {
  usePageMeta("Warm-up — Zuzumik");
  const router = useRouter();
  const { headerRef } = useEntranceAnimations();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const dob = useOnboardingStore((s) => s.dob);
  const age = ageFromDob(dob) ?? DEFAULT_AGE;
  // A saved draft resumes the same six questions after a reload or app restart.
  const [draft, setDraft] = useState<WarmupDraft | null>(() => loadWarmupDraft(userId));
  const finished = useMemo(() => loadCalibration(userId), [userId]);
  const fetchNeeded = !draft && !finished;
  const session = useQuery({
    queryKey: ["warmup-questions", userId],
    queryFn: () => getPracticeSession(WARMUP_TOPIC, WARMUP_SIZE, "Adaptive"),
    enabled: fetchNeeded && !!userId,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  useEffect(() => {
    if (draft || !session.data) return;
    const questions = toWarmupQuestions(session.data.questions);
    if (questions.length === 0) return;
    const created: WarmupDraft = { questions, attempts: [], startedAt: Date.now() };
    saveWarmupDraft(userId, created);
    setDraft(created);
  }, [draft, session.data, userId]);
  const [answer, setAnswer] = useState("");
  const [hinted, setHinted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const answeredAt = useRef<number[]>([]);
  const index = draft ? draft.attempts.length : 0;
  const current = draft?.questions[index];
  useEffect(() => {
    shownAt.current = Date.now();
    setAnswer("");
    setHinted(false);
    setMessage(null);
  }, [index]);
  const finish = useCallback(
    async (finalDraft: WarmupDraft, status: "completed" | "partial") => {
      setSaving(true);
      setError(null);
      try {
        const record = summarise(finalDraft.attempts, targetExam, age, status);
        const byId = new Map(finalDraft.questions.map((q) => [q.id, q]));
        const questions: Question[] = finalDraft.attempts.map((a) => {
          const q = byId.get(a.problemId) as WarmupQuestion;
          return {
            id: q.id,
            text: q.text,
            options: [],
            correctIndex: -1,
            answerType: "text",
            skillId: q.skillId,
            techniqueId: q.skillId,
            difficulty: q.difficulty,
            sourceId: q.id,
            feedsMastery: true,
            trustStatus: "trusted",
            timeLimit: 30,
          };
        });
        const answers: SprintAnswer[] = finalDraft.attempts.map((a, i) => ({
          questionId: a.problemId,
          selectedIndex: -1,
          answerText: "submitted",
          correct: a.correct,
          timeSpent: a.responseTimeMs / 1000,
          answeredAt: answeredAt.current[i] ?? finalDraft.startedAt + (i + 1) * 1000,
        }));
        const result = {
          answers,
          score: answers.filter((x) => x.correct).length,
          total: answers.length,
          accuracy: answers.length
            ? Math.round((answers.filter((x) => x.correct).length / answers.length) * 100)
            : 0,
          totalTimeSpent: answers.reduce((s, x) => s + x.timeSpent, 0),
          xpEarned: 0,
        };
        const events = await queueSessionSync(
          { topic: "Warm-up", questions },
          result,
          targetExam || undefined,
          "practice",
          { calibration: record },
        );
        await sendSyncBatch(events);
        saveCalibration(userId, record);
        clearWarmupDraft(userId);
        if (record.activePath) useOnboardingStore.getState().setActivePath(record.activePath);
        void queryClient.invalidateQueries({ queryKey: ["warmup-offer"] });
        for (const key of ["analytics", "dashboard", "account-summary"]) void queryClient.invalidateQueries({ queryKey: [key] });
        router.replace("/learn?mode=adaptive");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save your warm-up. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [age, queryClient, router, targetExam, userId],
  );
  const skipAll = () => {
    if (!draft || draft.attempts.length === 0) {
      saveCalibration(userId, {
        status: "skipped",
        updatedAt: Date.now(),
        priors: {},
        ansBaselineMs: 0,
        activePath: null,
        answered: 0,
      });
      clearWarmupDraft(userId);
      void queryClient.invalidateQueries({ queryKey: ["warmup-offer"] });
      router.replace("/learn?mode=adaptive");
      return;
    }
    void finish(draft, "partial");
  };
  const submit = () => {
    if (!draft || !current || saving) return;
    const verdict = checkPracticeAnswer(
      answer,
      current.expectedAnswer,
      (current.answerCheck as "client_extract" | "server_sympy") ?? "client_extract",
    );
    if (verdict === "unparsable") {
      setMessage("Enter a number to continue.");
      return;
    }
    const now = Date.now();
    const next: WarmupDraft = { ...draft };
    if (verdict === "deferred") {
      // A server-graded problem cannot be scored here, so it does not count towards the warm-up.
      next.questions = draft.questions.filter((_, i) => i !== index);
    } else {
      answeredAt.current[draft.attempts.length] = now;
      next.attempts = [
        ...draft.attempts,
        {
          techniqueId: current.skillId,
          problemId: current.id,
          correct: verdict === "correct",
          hinted,
          responseTimeMs: Math.max(1, now - shownAt.current),
        } satisfies WarmupAttempt,
      ];
    }
    saveWarmupDraft(userId, next);
    setDraft(next);
    if (next.attempts.length >= next.questions.length) void finish(next, "completed");
  };
  if (finished) {
    return (
      <PageContainer className="justify-center">
        <GlassCard className="mx-auto w-full max-w-md px-6 py-10 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
            <CheckCircle2 size={26} aria-hidden />
          </span>
          <p role="status" className="mt-4 text-[15px] font-semibold text-foreground">
            Your warm-up is already done. Practice is tuned to you.
          </p>
          <Button className="mt-6" fullWidth size="lg" onClick={() => router.replace("/learn?mode=adaptive")}>
            Back to Adaptive Learning
          </Button>
        </GlassCard>
      </PageContainer>
    );
  }
  if (!draft) {
    if (session.isError) {
      return (
        <PageContainer className="justify-center">
          <GlassCard className="mx-auto w-full max-w-md px-6 py-10 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
              <AlertTriangle size={24} aria-hidden />
            </span>
            <p role="alert" className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
              {session.error instanceof Error ? session.error.message : "Couldn't load the warm-up."}
            </p>
            <Button className="mt-6" fullWidth size="lg" onClick={() => void session.refetch()}>
              Try again
            </Button>
          </GlassCard>
        </PageContainer>
      );
    }
    return (
      <PageContainer className="justify-center">
        <div className="mx-auto w-full max-w-md">
          <GlassCard className="p-6" aria-busy="true">
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="mt-5 space-y-2.5">
              <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.07]" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/[0.07]" />
            </div>
            <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
          </GlassCard>
          <p role="status" className="mt-5 flex items-center justify-center gap-2 text-[13px] text-muted-foreground/70">
            <Loader2 size={14} className="animate-spin" aria-hidden /> Getting your warm-up ready…
          </p>
        </div>
      </PageContainer>
    );
  }
  const total = draft.questions.length;
  const position = Math.min(draft.attempts.length + 1, total);
  const isFinal = draft.attempts.length + 1 >= total;
  return (
    <PageContainer>
      <div className="mx-auto w-full space-y-5 md:max-w-xl">
        <header ref={headerRef} className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5">
            <Sparkles size={12} className="text-primary" aria-hidden />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">QUICK WARM-UP</h1>
          </div>
          <p className="mt-3 text-[20px] font-bold tracking-[-0.02em] text-foreground">Let&apos;s find your starting point</p>
          <p className="mt-1 text-[12px] text-muted-foreground/60">A few quick questions so practice fits you from day one.</p>
        </header>

        <div>
          <div
            role="progressbar"
            aria-label="Warm-up progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={draft.attempts.length}
            className="flex gap-1.5"
          >
            {draft.questions.map((q, i) => (
              <span
                key={q.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  i < draft.attempts.length ? "bg-primary" : i === draft.attempts.length ? "bg-primary/45" : "bg-white/[0.08]",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            Question {position} of {total}
          </p>
        </div>

        {current && (
          <GlassCard className="overflow-hidden p-0">
            <div
              aria-hidden
              className="h-[3px] w-full"
              style={{ background: "linear-gradient(90deg, var(--primary), var(--cta-to))" }}
            />
            <div className="p-5 sm:p-6">
              <p
                className="text-[19px] font-semibold leading-[1.55] tracking-[-0.01em] text-foreground"
                data-testid="warmup-question"
              >
                <MathText text={current.text} />
              </p>
              {current.hint &&
                (hinted ? (
                  <p
                    className="mt-4 flex gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/80"
                    data-testid="warmup-hint"
                  >
                    <Lightbulb size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    <span>Hint: {current.hint}</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.07] px-3.5 text-[12px] font-semibold text-primary outline-none transition-colors hover:bg-primary/[0.12] focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setHinted(true)}
                  >
                    <Lightbulb size={13} aria-hidden /> Show a hint
                  </button>
                ))}
              <label
                className="mt-6 block text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/55"
                htmlFor="warmup-answer"
              >
                Your answer
              </label>
              <input
                id="warmup-answer"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                placeholder="Type your answer"
                aria-invalid={message ? true : undefined}
                aria-describedby={message ? "warmup-message" : undefined}
                className={cn(
                  "mt-2 w-full rounded-2xl border bg-white/[0.04] px-4 py-3.5 text-[18px] font-semibold text-foreground outline-none transition-colors placeholder:text-[14px] placeholder:font-normal placeholder:text-muted-foreground/40 focus:border-primary focus-visible:ring-2 focus-visible:ring-ring",
                  message ? "border-destructive/50" : "border-white/[0.1]",
                )}
              />
              {message && (
                <p id="warmup-message" role="alert" className="mt-2 text-[12px] font-medium text-destructive">
                  {message}
                </p>
              )}
            </div>
          </GlassCard>
        )}
        {error && (
          <div role="alert" className="space-y-2 rounded-2xl border border-destructive/25 bg-destructive/[0.07] p-4 text-[12px] text-destructive">
            <p>{error}</p>
            <Button
              size="sm"
              onClick={() =>
                void finish(
                  draft,
                  draft.attempts.length >= draft.questions.length ? "completed" : "partial",
                )
              }
            >
              Try again
            </Button>
          </div>
        )}
        <Button fullWidth size="lg" onClick={submit} disabled={saving || !current} className="gap-2">
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden /> Saving…
            </>
          ) : isFinal ? (
            <>
              Finish <Check size={16} aria-hidden />
            </>
          ) : (
            <>
              Next <ArrowRight size={16} aria-hidden />
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={skipAll}
          disabled={saving}
          className="block min-h-10 w-full rounded-xl text-center text-[12px] font-medium text-muted-foreground/60 underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {draft.attempts.length > 0 ? "Skip the rest" : "Skip for now"}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/50">
          <Leaf size={12} aria-hidden /> No pressure and no score: this only helps us pick where to start you.
        </p>
      </div>
    </PageContainer>
  );
}
export default function WarmupPage() {
  return <WarmupContent />;
}
