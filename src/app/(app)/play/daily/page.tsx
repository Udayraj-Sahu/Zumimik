"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Trophy } from "lucide-react";
import { IS_MOCK } from "@/lib/platform";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useDailyChallenge, useDailyLeaderboard, useSubmitDaily } from "@/hooks/queries/use-daily";
import { gatedFeatureMessage } from "@/services/flags";
import { ApiError } from "@/services/api";
import type { DailyLeaderboard, DailyResult } from "@/services/daily";

function formatTime(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Leaderboard({ board }: { board: DailyLeaderboard }) {
  if (board.mode === "hidden") return <p className="text-[12px] text-muted-foreground/60">Today&apos;s leaderboard isn&apos;t shown for your account.</p>;
  return (
    <div className="space-y-2" data-testid="daily-leaderboard">
      {board.me && (
        <p className="text-[13px] font-semibold text-foreground">
          You are #{board.me.rank} with {board.me.score} pts{board.me.percentile != null ? ` · top ${Math.max(1, 100 - Math.round(board.me.percentile))}%` : ""}
        </p>
      )}
      {board.mode === "percentile_only" && <p className="text-[12px] text-muted-foreground/60">{board.participants} played today. Names are hidden for your account.</p>}
      {board.entries.length === 0 && board.mode !== "percentile_only" && <p className="text-[12px] text-muted-foreground/60">No scores yet today.</p>}
      <ol className="space-y-1.5">
        {board.entries.map((e) => (
          <li key={`${e.rank}-${e.name}`} className="flex items-center justify-between rounded-xl px-3 py-2 text-[13px]">
            <span className="font-mono text-muted-foreground/60">#{e.rank}</span>
            <span className="flex-1 truncate px-3 text-foreground">{e.name}</span>
            <span className="font-semibold text-foreground">{e.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DailyContent() {
  usePageMeta("Daily Challenge — Zuzumik");
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDailyChallenge();
  const submit = useSubmitDaily();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<DailyResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);

  const played = result ?? data?.submitted ?? null;
  const board = useDailyLeaderboard(!!played);

  useEffect(() => {
    if (data && !data.submitted && startedAt.current === null) startedAt.current = Date.now();
  }, [data]);

  const problems = data?.problems ?? [];
  const current = problems[index];

  const finish = async (all: string[]) => {
    setSubmitError(null);
    try {
      const res = await submit.mutateAsync({
        answers: problems.map((_, i) => (all[i]?.trim() ? all[i].trim() : null)),
        totalTimeMs: Date.now() - (startedAt.current ?? Date.now()),
      });
      setResult(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        void refetch(); // already played today: show the stored score instead
        return;
      }
      setSubmitError(gatedFeatureMessage(e, "The daily challenge") ?? (e instanceof Error ? e.message : "Couldn't submit your score."));
    }
  };

  const next = () => {
    const all = [...answers];
    all[index] = draft;
    setAnswers(all);
    setDraft("");
    if (index + 1 < problems.length) setIndex(index + 1);
    else void finish(all);
  };

  if (isLoading) return <PageContainer><p role="status" className="py-10 text-center text-[13px] text-muted-foreground/60">Loading today&apos;s challenge…</p></PageContainer>;
  if (error || !data) {
    const msg = gatedFeatureMessage(error, "The daily challenge") ?? (error instanceof Error ? error.message : "Couldn't load today's challenge.");
    return (
      <PageContainer className="text-center">
        <p role="alert" className="py-10 text-[13px] text-muted-foreground/70">{msg}</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </PageContainer>
    );
  }

  if (played) {
    return (
      <PageContainer>
        <div className="mx-auto w-full space-y-4 md:max-w-xl">
          <GlassCard className="p-6 text-center" data-testid="daily-result">
            <Trophy size={26} className="mx-auto mb-2 text-[var(--primary)]" aria-hidden />
            <h1 className="text-[18px] font-bold tracking-[-0.02em] text-foreground">Today&apos;s challenge done</h1>
            <p className="mt-2 text-[13px] text-muted-foreground/70">
              {played.correct}/{played.total} correct · {played.score} pts{played.timeMs ? ` · ${formatTime(played.timeMs)}` : ""}
              {played.rank ? ` · rank #${played.rank}` : ""}{played.xpAwarded ? ` · +${played.xpAwarded} XP` : ""}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground/50">A new challenge opens tomorrow (UTC).</p>
          </GlassCard>
          <GlassCard className="p-5">
            <h2 className="mb-3 text-[14px] font-bold text-foreground">Leaderboard</h2>
            {board.isLoading ? <p role="status" className="text-[12px] text-muted-foreground/60">Loading…</p>
              : board.data ? <Leaderboard board={board.data} />
              : <p className="text-[12px] text-muted-foreground/60">Leaderboard unavailable.</p>}
          </GlassCard>
          <Button fullWidth variant="glass" onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
        </div>
      </PageContainer>
    );
  }

  if (problems.length === 0) return <PageContainer><p role="status" className="py-10 text-center text-[13px] text-muted-foreground/60">No daily challenge is available right now.</p></PageContainer>;

  return (
    <PageContainer>
      <div className="mx-auto w-full space-y-4 md:max-w-xl">
        <h1 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <CalendarCheck size={14} aria-hidden /> Daily challenge · {index + 1} / {problems.length}
        </h1>
        <GlassCard className="p-6">
          <p className="text-[16px] font-semibold leading-relaxed text-foreground" data-testid="daily-question">{current.text}</p>
          <label className="mt-4 block text-[12px] text-muted-foreground/60" htmlFor="daily-answer">Your answer</label>
          <input
            id="daily-answer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !submit.isPending) next(); }}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </GlassCard>
        {submitError && (
          <div role="alert" className="space-y-2 text-[12px] text-red-500">
            <p>{submitError}</p>
            <Button size="sm" onClick={() => void finish(answers)}>Retry submit</Button>
          </div>
        )}
        <Button fullWidth size="lg" onClick={next} disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : index + 1 < problems.length ? "Next" : "Submit"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground/50">Leave it blank to skip. One attempt per day; speed only counts when every answer is right.</p>
      </div>
    </PageContainer>
  );
}

export default function DailyPage() {
  // The daily challenge exists only on the real backend; there are no fixtures for it.
  if (IS_MOCK) return <FeatureUnavailable title="Daily challenge" description="The daily challenge needs the live server, so it isn't shown in demo mode." />;
  return <DailyContent />;
}
