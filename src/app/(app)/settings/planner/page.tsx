"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useRef, useEffect } from "react";
import { Calendar, Zap, Flame, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePlanner } from "@/hooks/queries/use-planner";
import { usePageMeta } from "@/hooks/use-page-meta";
import { GLASS_BG } from "@/lib/theme";
import { GlassCard } from "@/components/ui/glass-card";

export default function PlannerPage() {
  usePageMeta("Study Planner — Zuzumik");
  const { data, isLoading, error } = usePlanner();
  const gridRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();

  useEffect(() => {
    if (gridRef.current && data) {
      const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-day-card]");
      staggerIn(cards, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power2.out" });
    }
  }, [data, staggerIn]);

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-2xl">
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Calendar size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">PLANNER</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Plan your sprints and track consistency</p>
      </div>

      <div ref={animateSection} data-section-index="0" className="mt-6">
        {isLoading && (
          <div className="animate-pulse space-y-4">
            <div className="h-24 rounded-3xl" style={{ background: GLASS_BG }} />
            <div className="h-48 rounded-3xl" style={{ background: GLASS_BG }} />
          </div>
        )}

        {error && (
          <GlassCard className="p-6 text-center border-destructive/30 bg-destructive/5">
            <p className="text-[12px] font-semibold text-destructive">Failed to load planner data</p>
          </GlassCard>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-[359px]:gap-2 md:items-stretch">
              <GlassCard className="p-4 max-[359px]:p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Flame size={14} className="text-primary" />
                  <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">STREAK</p>
                </div>
                <p className="text-[20px] font-bold text-foreground">{data.stats.weekStreak}d</p>
              </GlassCard>
              <GlassCard className="p-4 max-[359px]:p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-chart-2" />
                  <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">PLANNED</p>
                </div>
                <p className="text-[20px] font-bold text-foreground">{data.stats.totalPlanned}</p>
              </GlassCard>
              <GlassCard className="p-4 max-[359px]:p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-chart-3" />
                  <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">DONE</p>
                </div>
                <p className="text-[20px] font-bold text-foreground">{data.stats.totalCompleted}</p>
              </GlassCard>
              <GlassCard className="p-4 max-[359px]:p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-chart-4" />
                  <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">RATE</p>
                </div>
                <p className="text-[20px] font-bold text-foreground">{data.stats.completionRate}%</p>
              </GlassCard>
            </div>

            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">This Week</p>
            <div ref={gridRef} className="grid grid-cols-3 gap-2 sm:grid-cols-7 sm:overflow-x-visible max-[359px]:gap-1.5 md:items-stretch">
              {data.days.map((day) => {
                const pct = day.planned > 0 ? Math.round((day.completed / day.planned) * 100) : 0;
                return (
                  <div
                    key={day.date}
                    data-day-card
                    className={cn(
                      "rounded-xl border p-2 sm:p-3 flex flex-col items-center text-center transition-all backdrop-blur-xl max-[359px]:p-1.5",
                      day.isToday
                        ? "border-primary bg-primary/5"
                        : "border-white/[0.06]",
                    )}
                    style={!day.isToday ? { background: GLASS_BG } : undefined}
                  >
                    <p className={cn(
                      "text-micro font-semibold mb-1 whitespace-nowrap",
                      day.isToday ? "text-primary" : "text-muted-foreground/40",
                    )}>
                      {day.dayLabel.slice(0, 2)}
                    </p>
                    <p className={cn(
                      "text-[13px] font-bold",
                      day.isToday ? "text-foreground" : "text-muted-foreground/60",
                    )}>
                      {new Date(day.date).getDate()}
                    </p>
                    <div className="mt-1.5 flex items-center gap-0.5">
                      <span className={cn(
                        "text-micro font-bold font-mono",
                        day.completed >= day.planned && day.planned > 0
                          ? "text-primary"
                          : "text-muted-foreground/40",
                      )}>
                        {day.completed}
                      </span>
                      <span className="text-micro text-muted-foreground/20">/</span>
                      <span className="text-micro font-mono text-muted-foreground/40">{day.planned}</span>
                    </div>
                    {day.planned > 0 && (
                      <div className="mt-2 w-full h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            pct >= 100 ? "bg-primary" : "bg-chart-3/60",
                          )}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-3xl border border-white/[0.06] backdrop-blur-xl p-5 text-center max-[359px]:p-4" style={{ background: GLASS_BG }}>
              <Calendar size={24} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-[12px] font-semibold text-foreground/80">Stay Consistent</p>
              <p className="text-micro text-muted-foreground/60 mt-1">Complete your daily planned sprints to build momentum</p>
            </div>
          </>
        )}
      </div>
      </div>
    </PageContainer>
  );
}
