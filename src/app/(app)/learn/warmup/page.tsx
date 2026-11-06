"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Sparkles } from "lucide-react";
import { IS_MOCK } from "@/lib/platform";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { checkPracticeAnswer } from "@/lib/answer-check";
import { WARMUP_SIZE, summarise, type WarmupAttempt, type WarmupDraft, type WarmupQuestion } from "@/lib/learning/calibration";
import { ageFromDob, DEFAULT_AGE } from "@/lib/learning/learner-state";
import { clearWarmupDraft, loadCalibration, loadWarmupDraft, saveCalibration, saveWarmupDraft } from "@/services/calibration";
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
          return { id: q.id, text: q.text, options: [], correctIndex: -1, answerType: "text", skillId: q.skillId, techniqueId: q.skillId, difficulty: q.difficulty, sourceId: q.id, feedsMastery: true, trustStatus: "trusted", timeLimit: 30 };
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
          accuracy: answers.length ? Math.round((answers.filter((x) => x.correct).length / answers.length) * 100) : 0,
          totalTimeSpent: answers.reduce((s, x) => s + x.timeSpent, 0),
          xpEarned: 0,
        };
        const events = await queueSessionSync({ topic: "Warm-up", questions }, result, targetExam || undefined, "practice", { calibration: record });
        await sendSyncBatch(events);
        saveCalibration(userId, record);
        clearWarmupDraft(userId);
        if (record.activePath) useOnboardingStore.getState().setActivePath(record.activePath);
        void queryClient.invalidateQueries({ queryKey: ["warmup-offer"] });
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
      saveCalibration(userId, { status: "skipped", updatedAt: Date.now(), priors: {}, ansBaselineMs: 0, activePath: null, answered: 0 });
      clearWarmupDraft(userId);
      void queryClient.invalidateQueries({ queryKey: ["warmup-offer"] });
      router.replace("/learn?mode=adaptive");
      return;
    }
    void finish(draft, "partial");
  };

  const submit = () => {
    if (!draft || !current || saving) return;
    const verdict = checkPracticeAnswer(answer, current.expectedAnswer, (current.answerCheck as "client_extract" | "server_sympy") ?? "client_extract");
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
      next.attempts = [...draft.attempts, { techniqueId: current.skillId, problemId: current.id, correct: verdict === "correct", hinted, responseTimeMs: Math.max(1, now - shownAt.current) } satisfies WarmupAttempt];
    }
    saveWarmupDraft(userId, next);
    setDraft(next);
    if (next.attempts.length >= next.questions.length) void finish(next, "completed");
  };

  if (finished) {
    return (
      <PageContainer className="text-center">
        <p role="status" className="py-10 text-[13px] text-muted-foreground/70">Your warm-up is already done. Practice is tuned to you.</p>
        <Button onClick={() => router.replace("/learn?mode=adaptive")}>Back to Adaptive Learning</Button>
      </PageContainer>
    );
  }
  if (!draft) {
    if (session.isError) {
      return (
        <PageContainer className="text-center">
          <p role="alert" className="py-10 text-[13px] text-muted-foreground/70">{session.error instanceof Error ? session.error.message : "Couldn't load the warm-up."}</p>
          <Button onClick={() => void session.refetch()}>Try again</Button>
        </PageContainer>
      );
    }
    return <PageContainer><p role="status" className="py-10 text-center text-[13px] text-muted-foreground/60">Getting your warm-up ready…</p></PageContainer>;
  }

  return (
    <PageContainer>
      <div className="mx-auto w-full space-y-4 md:max-w-xl">
        <h1 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <Sparkles size={14} aria-hidden /> Quick warm-up · {Math.min(draft.attempts.length + 1, draft.questions.length)} / {draft.questions.length}
        </h1>
        {current && (
          <GlassCard className="p-6">
            <p className="text-[16px] font-semibold leading-relaxed text-foreground" data-testid="warmup-question">{current.text}</p>
            {current.hint && (
              hinted ? (
                <p className="mt-3 text-[12px] text-muted-foreground/70" data-testid="warmup-hint">Hint: {current.hint}</p>
              ) : (
                <button type="button" className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary" onClick={() => setHinted(true)}>
                  <Lightbulb size={12} aria-hidden /> Show a hint
                </button>
              )
            )}
            <label className="mt-4 block text-[12px] text-muted-foreground/60" htmlFor="warmup-answer">Your answer</label>
            <input
              id="warmup-answer"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setMessage(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {message && <p role="alert" className="mt-2 text-[12px] text-red-500">{message}</p>}
          </GlassCard>
        )}
        {error && (
          <div role="alert" className="space-y-2 text-[12px] text-red-500">
            <p>{error}</p>
            <Button size="sm" onClick={() => void finish(draft, draft.attempts.length >= draft.questions.length ? "completed" : "partial")}>Try again</Button>
          </div>
        )}
        <Button fullWidth size="lg" onClick={submit} disabled={saving || !current}>{saving ? "Saving…" : draft.attempts.length + 1 >= draft.questions.length ? "Finish" : "Next"}</Button>
        <button type="button" onClick={skipAll} disabled={saving} className="block w-full text-center text-[12px] text-muted-foreground/60 underline-offset-2 hover:underline">
          {draft.attempts.length > 0 ? "Skip the rest" : "Skip for now"}
        </button>
        <p className="text-center text-[11px] text-muted-foreground/50">No pressure and no score: this only helps us pick where to start you.</p>
      </div>
    </PageContainer>
  );
}

export default function WarmupPage() {
  if (IS_MOCK) return <FeatureUnavailable title="Warm-up" description="The warm-up needs the live server, so it isn't shown in demo mode." />;
  return <WarmupContent />;
}
