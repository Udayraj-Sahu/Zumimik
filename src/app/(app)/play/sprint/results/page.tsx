"use client";
import { AdInterstitial } from "@/components/ads/ad-interstitial";
import { PageContainer } from "@/components/ui/page-container";

import { useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import gsap from "gsap";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useSprintStore } from "@/stores/sprint-store";
import { useRateStore } from "@/stores/rate-store";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { syncSprintResult } from "@/services/telemetry";
import type { SprintResult, Question } from "@/lib/types/sprint-session";
import { GLASS_BG } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { formatTime } from "@/lib/text";
import { GhostPanel } from "@/components/ghosts/ghost-panel";
import { SessionChangeCard } from "@/components/adaptive/session-change-card";
import { NextStepCard } from "@/components/adaptive/next-step-card";
import { useLearnerView } from "@/hooks/queries/use-learner-view";
import { IS_MOCK } from "@/lib/platform";

export default function SprintResultsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="animate-pulse">
          <div className="h-14 rounded-xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
          <div className="h-48 rounded-3xl backdrop-blur-xl mb-4" style={{ backgroundColor: GLASS_BG }} />
          <div className="h-12 rounded-xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
        </PageContainer>
      }
    >
      <SprintResultsContent />
    </Suspense>
  );
}

function SprintResultsContent() {
  usePageMeta("Sprint Results — Zuzumik");
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastResult = useSprintStore((s) => s.lastResult);
  const lastSession = useSprintStore((s) => s.lastSession);
  const incrementSprint = useRateStore((s) => s.increment);
  const learnerView = useLearnerView();
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const queryClient = useQueryClient();

  const isAdaptive = searchParams.get("adaptive") === "1";
  const adaptiveDomain = searchParams.get("domain") ?? targetExam;

  const recordSession = useMutation({
    mutationFn: (input: {
      session: NonNullable<typeof lastSession>;
      result: SprintResult;
      domain?: string;
      sessionType: string;
    }) => syncSprintResult(input.session, input.result, input.domain, input.sessionType, useSprintStore.getState().psychometricEvents),
    onSuccess: (_data, input) => {
      if (input.sessionType === "adaptive" && input.domain) {
        queryClient.invalidateQueries({ queryKey: ["adaptive-state", input.domain] });
      }
      // The learner model just changed: everything derived from it is read again.
      for (const key of ["learner-view", "review-items", "adaptive-state", "mastery-history"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });

  useEffect(() => {
    incrementSprint();
  }, [incrementSprint]);

  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current) return;
    if (!lastResult || !lastSession || !lastSession.topic) return;
    // Backend mock exams are already recorded server-side by /mocks/submit; do not re-sync them as sprints.
    if (lastSession.mockId) return;
    recordedRef.current = true;
    recordSession.mutate({
      session: lastSession,
      result: lastResult,
      domain: adaptiveDomain ?? undefined,
      sessionType: isAdaptive ? "adaptive" : "sprint",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdaptive, lastResult, lastSession, adaptiveDomain]);

  const resultRef = useRef<HTMLDivElement>(null);
  const { reduced } = useEntranceAnimations();

  const result: SprintResult | null = lastResult;
  const session: { questions: Question[]; topic: string; topicLabel: string; difficulty: string } | null = lastSession;

  useEffect(() => {
    if (reduced) return;
    if (resultRef.current && result) {
      gsap.fromTo(resultRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
    }
  }, [result, reduced]);

  const handleAnalysis = useCallback(() => {
    router.push("/play/sprint/results/analysis");
  }, [router]);

  if (!result || !session) {
    return (
      <PageContainer className="text-center">
        <p className="text-[13px] text-muted-foreground">No sprint results found.</p>
        <Button
          onClick={() => router.push("/play/configure-sprint")}
          className="mt-4 px-6"
        >
          Start a Sprint
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdInterstitial />
      <div className="mx-auto w-full md:max-w-3xl">
      {/* Header */}
      <div ref={resultRef}>
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 pill px-5 py-2 max-[359px]:px-4">
            <BarChart3 size={10} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">SPRINT RESULTS</h1>
          </div>
        </div>
        <p className="mt-2 text-center text-[12px] text-muted-foreground/45 font-normal">
          {session.topicLabel} &middot; {session.difficulty}
        </p>
      </div>

      {/* Score row — 4 stat cards */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-[359px]:gap-2">
        <GlassCard className="p-4 max-[359px]:p-3.5 text-center">
          <p className="text-micro font-bold uppercase tracking-wider text-primary">Accuracy</p>
          <p className={cn(
            "mt-1 text-[20px] font-black",
            result.accuracy >= 80 ? "text-primary" : result.accuracy >= 50 ? "text-chart-3" : "text-destructive",
          )}>
            {result.accuracy}%
          </p>
          <p className="text-micro text-muted-foreground/40 mt-0.5">
            {result.accuracy >= 80 ? "Excellent" : result.accuracy >= 50 ? "Good" : "Needs work"}
          </p>
        </GlassCard>
        <GlassCard className="p-4 max-[359px]:p-3.5 text-center">
          <p className="text-micro font-bold uppercase tracking-wider text-chart-2">XP Earned</p>
          <p className="mt-1 text-[20px] font-black text-chart-2">+{result.xpEarned}</p>
          <p className="text-micro text-muted-foreground/40 mt-0.5">points</p>
        </GlassCard>
        <GlassCard className="p-4 max-[359px]:p-3.5 text-center">
          <p className="text-micro font-bold uppercase tracking-wider text-foreground/60">Time</p>
          <p className="mt-1 text-[20px] font-black text-foreground/80">
            {formatTime(Math.round(result.totalTimeSpent))}
          </p>
          <p className="text-micro text-muted-foreground/40 mt-0.5">total</p>
        </GlassCard>
        <GlassCard className="p-4 max-[359px]:p-3.5 text-center">
          <p className="text-micro font-bold uppercase tracking-wider text-chart-3">Correct</p>
          <p className="mt-1 text-[20px] font-black text-chart-3">{result.score}/{result.total}</p>
          <p className="text-micro text-muted-foreground/40 mt-0.5">
            {result.score === result.total ? "Perfect!" : `${Math.round(result.score / result.total * 100)}%`}
          </p>
        </GlassCard>
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: GLASS_BG }}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            result.accuracy >= 80 ? "bg-primary" : result.accuracy >= 50 ? "bg-chart-3" : "bg-destructive",
          )}
          style={{ width: `${result.accuracy}%` }}
        />
      </div>

      {/* Final answer banner */}
      <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-5 max-[359px]:p-4 text-center backdrop-blur-xl">
        <p className="text-micro font-bold uppercase tracking-[0.18em] text-primary/60">Final Verdict</p>
        <p className="mt-1 text-[16px] font-black text-primary">
          {result.accuracy >= 80 ? "Great Work!" : result.accuracy >= 50 ? "Keep Going!" : "Keep Practicing!"}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground/60">
          {result.score} of {result.total} correct &middot; {session.topicLabel}
        </p>
      </div>

      {!lastSession?.mockId && <SessionChangeCard change={recordSession.data} />}
      {!lastSession?.mockId && !IS_MOCK && <NextStepCard next={learnerView.data?.next} />}

      {!lastSession?.mockId && (
        <GhostPanel ghostId={searchParams.get("ghost")} skill={session.topic} domain={targetExam} questions={session.questions} result={result} />
      )}

      {/* CTA buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 max-[359px]:gap-2">
        <Button
          onClick={handleAnalysis}
          size="lg"
          className="flex-1 hover:scale-[1.01] active:scale-[0.99] max-[359px]:py-3.5"
        >
          <BarChart3 size={16} /> Analysis
        </Button>
        <Button
          variant="glass"
          size="lg"
          onClick={() => router.push("/dashboard")}
          className="flex-1 text-[12px] active:bg-white/[0.06] max-[359px]:py-3.5"
        >
          Dashboard
        </Button>
      </div>
      </div>
    </PageContainer>
  );
}
