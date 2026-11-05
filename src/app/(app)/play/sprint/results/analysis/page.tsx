"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, X, TrendingUp, Lightbulb, BookOpen } from "lucide-react";
import { useSprintStore } from "@/stores/sprint-store";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { SprintResult } from "@/lib/types/sprint-session";
import { GLASS_BG, RED_04, RED_06, RED_30 } from "@/lib/theme";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { SessionBreakdownCard } from "@/components/learn/session-breakdown-card";

export default function AnalysisPage() {
  usePageMeta("Analysis — Zuzumik");
  const router = useRouter();

  const lastResult = useSprintStore((s) => s.lastResult);
  const lastSession = useSprintStore((s) => s.lastSession);

  const result: SprintResult | null = lastResult;
  const session = lastSession;

  const wrongAnswers = useMemo(() => {
    if (!result || !session) return [];
    return result.answers
      .filter((a) => !a.correct)
      .map((a) => ({
        answer: a,
        question: session.questions.find((q) => q.id === a.questionId)!,
      }))
      .filter((item) => item.question)
      .map((item, i) => ({ ...item, wrongIndex: i }));
  }, [result, session]);

  if (!result || !session) {
    return (
      <PageContainer className="text-center">
        <p className="text-[13px] text-muted-foreground">No sprint data found.</p>
        <Button
          onClick={() => router.push("/play/configure-sprint")}
          className="mt-4 px-6"
        >
          Start a Sprint
        </Button>
      </PageContainer>
    );
  }

  if (wrongAnswers.length === 0) {
    return (
      <PageContainer className="text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-primary/10 border border-primary/20">
          <Check size={28} className="text-primary" />
        </div>
        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-foreground">Perfect Score!</h2>
        <p className="mt-1 text-[12px] text-muted-foreground/45 font-normal">
          No wrong answers to analyze.
        </p>
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:gap-3 max-[359px]:gap-2">
          <Button
            size="lg"
            onClick={() => router.push("/play/sprint/results")}
            className="md:flex-1 hover:scale-[1.01] max-[359px]:py-3.5"
          >
            Back to Results
          </Button>
          <Button
            variant="glass"
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="md:flex-1 text-[12px] active:bg-white/[0.06] max-[359px]:py-3.5"
          >
            Dashboard
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      {/* Centered pill badge */}
      <div className="flex flex-col items-center gap-2 mb-6 max-[359px]:mb-4 max-[359px]:gap-1.5">
        <div className="inline-flex items-center gap-2 pill px-5 py-2 max-[359px]:px-4">
          <TrendingUp size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">ANALYSIS</h1>
        </div>
        <p className="text-micro text-muted-foreground/45 font-normal">
          {session.topicLabel} &middot; {wrongAnswers.length} wrong answer
          {wrongAnswers.length > 1 ? "s" : ""}
        </p>
      </div>

      <SessionBreakdownCard questions={session.questions} answers={result.answers} />

      {/* Wrong answers list */}
      <div className="grid gap-5 max-[359px]:gap-4 md:grid-cols-2 md:items-start">
        {wrongAnswers.map(({ answer, question, wrongIndex }) => (
          <GlassCard
            key={question.id}
            className="overflow-hidden"
          >
            {/* Question header */}
            <div className="px-4 max-[359px]:px-3 py-3 border-b" style={{ backgroundColor: RED_04, borderColor: GLASS_BG }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider">
                  <span className="grid size-5 place-items-center rounded bg-destructive/10 text-destructive">
                    <X size={10} />
                  </span>
                  Question {wrongIndex + 1} &middot; Incorrect
                </span>
                <span className="text-micro font-mono text-muted-foreground/40">
                  {Math.round(answer.timeSpent)}s
                </span>
              </div>
              <p className="mt-1.5 text-[12px] font-semibold text-foreground/80 leading-relaxed">
                {question.text}
              </p>
            </div>

            {/* User vs correct answer */}
            <div className="grid grid-cols-2 gap-2 max-[359px]:gap-1.5 px-4 max-[359px]:px-3 pt-4">
              <div className="rounded-xl border p-3 max-[359px]:p-2.5 text-center" style={{ backgroundColor: RED_06, borderColor: RED_30 }}>
                <p className="text-micro font-bold uppercase tracking-wider text-muted-foreground/50">
                  Your Answer
                </p>
                <p className="mt-1 text-[13px] font-black text-destructive">
                  {question.options[answer.selectedIndex] ?? "(unanswered)"}
                </p>
              </div>
              <div className="rounded-xl border p-3 max-[359px]:p-2.5 text-center" style={{ backgroundColor: "var(--accent-06)", borderColor: "var(--accent-30)" }}>
                <p className="text-micro font-bold uppercase tracking-wider text-muted-foreground/50">
                  Correct
                </p>
                <p className="mt-1 text-[13px] font-black text-primary">
                  {question.options[question.correctIndex]}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div className="px-4 max-[359px]:px-3 py-4 max-[359px]:py-3.5">
              {question.explanation ? (
                <div className="rounded-2xl border backdrop-blur-xl p-4" style={{ borderColor: "var(--accent-20)", background: "var(--accent-04)" }}>
                  <p className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.18em] text-primary/80 mb-2">
                    <Lightbulb size={12} /> Why the answer is correct
                  </p>
                  <p className="text-[13px] leading-relaxed text-foreground/80">{question.explanation}</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/[0.06] backdrop-blur-xl p-4" style={{ background: GLASS_BG }}>
                  <BookOpen size={16} className="text-muted-foreground/30 shrink-0" />
                  <p className="text-micro font-medium text-muted-foreground/60">
                    No explanation available for this question yet.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:gap-3 max-[359px]:gap-2">
        <Button
          variant="glass"
          size="lg"
          onClick={() => router.push("/play/sprint/results")}
          className="md:flex-1 text-[12px] active:bg-white/[0.06] max-[359px]:py-3.5"
        >
          <ChevronLeft size={16} /> Back to Results
        </Button>
        <Button
          variant="glass"
          size="lg"
          onClick={() => router.push("/dashboard")}
          className="md:flex-1 text-[12px] active:bg-white/[0.06] max-[359px]:py-3.5"
        >
          Dashboard
        </Button>
      </div>
      </div>
    </PageContainer>
  );
}