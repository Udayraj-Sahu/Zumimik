"use client";

import { TrendingUp } from "lucide-react";
import { useAnalyticsData } from "@/hooks/queries/use-analytics";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";


export default function AnalyticsPage() {
  usePageMeta("Analytics — Zuzumik");
  const { data, isLoading, error } = useAnalyticsData();
  const { headerRef, animateSection } = useEntranceAnimations();

  if (isLoading) {
    return (
      <div className="min-h-screen px-5 pt-6 pb-4 flex items-center justify-center max-[359px]:px-4">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen px-5 pt-6 pb-4 flex flex-col items-center justify-center gap-4 max-[359px]:px-4">
        <p className="text-[13px] text-muted-foreground">Failed to load analytics.</p>
        <Button
          size="sm"
          onClick={() => window.location.reload()}
          className="rounded-xl px-5 py-2.5 hover:scale-[1.02] max-[359px]:px-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  const { stats, weekly, recent } = data;

  return (
      <PageContainer>
        <div className="mx-auto w-full md:max-w-3xl">
        <div ref={headerRef} className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <TrendingUp size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">ANALYTICS</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Deep-dive performance metrics from your last {stats.totalSessions} sessions.</p>
        </div>

        <div className="flex flex-col gap-6 mt-6 max-[359px]:gap-4">
          <div
            ref={animateSection} data-section-index={0}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-[359px]:gap-2"
          >
            {[
              { label: "TOTAL SESSIONS", value: String(stats.totalSessions) },
              { label: "AVG SCORE", value: `${stats.avgScore}%` },
              { label: "BEST STREAK", value: `${stats.bestStreak}d` },
              { label: "ARENA RANK", value: `#${stats.arenaRank}` },
            ].map((s, i) => (
              <GlassCard key={i} className="p-4 max-[359px]:p-3" style={{ border: "1px solid var(--glass-06)" }}>
                <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-1.5">
                  {s.label}
                </p>
                <p className="text-[20px] font-bold tracking-tight text-primary leading-none">
                  {s.value}
                </p>
              </GlassCard>
            ))}
          </div>

          <GlassCard
            ref={animateSection} data-section-index={1}
            className="p-5 max-[359px]:p-4"
            style={{ border: "1px solid var(--glass-06)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold tracking-[0.08em] text-foreground">
                WEEKLY ACTIVITY
              </h2>
              <TrendingUp size={13} className="text-muted-foreground/50" />
            </div>

            <div className="flex justify-between mb-1">
              {weekly.map((d) => (
                <span
                  key={d.day}
                  className="text-micro text-center flex-1 font-mono text-muted-foreground/50 whitespace-nowrap"
                >
                  {d.pct}%
                </span>
              ))}
            </div>

            <div className="flex items-end justify-between gap-[3px] sm:gap-1.5 h-16 sm:h-20">
              {weekly.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 rounded-t-sm bg-primary"
                  style={{ height: `${d.pct}%`, minHeight: "4px" }}
                />
              ))}
            </div>

            <div className="flex justify-between mt-1">
              {weekly.map((d) => (
                <span
                  key={d.day}
                  className="text-micro text-center flex-1 tracking-[0.05em] text-muted-foreground/50 whitespace-nowrap"
                >
                  {d.day}
                </span>
              ))}
            </div>
          </GlassCard>

          <GlassCard
            ref={animateSection} data-section-index={2}
            className="p-5 max-[359px]:p-4"
            style={{ border: "1px solid var(--glass-06)" }}
          >
            <h2 className="text-[13px] font-bold tracking-[0.08em] text-foreground mb-3">
              RECENT ACTIVITY
            </h2>
            <div className="flex flex-col">
              {recent.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between py-3 border-b border-white/[0.06]"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground/80">{a.title}</p>
                    <p className="text-[12px] text-muted-foreground/60 mt-0.5">{a.sub}</p>
                  </div>
                  <span className="text-micro font-mono text-muted-foreground/50 whitespace-nowrap ml-4">
                    {a.time}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
        </div>
      </PageContainer>
  );
}
