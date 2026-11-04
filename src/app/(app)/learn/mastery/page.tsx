"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useRef, useEffect, useMemo } from "react";
import { useDashboardData } from "@/hooks/queries/use-dashboard";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { Target } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { GLASS_BG } from "@/lib/theme";

export default function MasteryPage() {
  usePageMeta("Topic Mastery — Zuzumik");
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const { data, isLoading, error } = useDashboardData(targetExam);
  const topics = useMemo(() => data?.topics ?? [], [data?.topics]);
  const gridRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();

  useEffect(() => {
    if (gridRef.current && topics.length > 0) {
      const bars = gridRef.current.querySelectorAll<HTMLElement>("[data-mastery-bar]");
      staggerIn(bars, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.06, ease: "power2.out" });
    }
  }, [topics, staggerIn]);

  const average = topics.length > 0
    ? Math.round(topics.reduce((s, t) => s + t.value, 0) / topics.length)
    : 0;

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 max-[359px]:px-3 mb-3">
          <Target size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">MASTERY</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">
          {topics.length > 0 ? `${average}% average across ${topics.length} topics` : "Track your progress across topics"}
        </p>
      </div>

      {/* Summary stat */}
      {topics.length > 0 && (
        <div ref={animateSection} data-section-index="0" className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 max-[359px]:gap-2">
          <div className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3 text-center" style={{ background: GLASS_BG }}>
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">AVERAGE</p>
            <p className="text-[20px] font-bold text-primary mt-1">{average}%</p>
          </div>
          <div className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3 text-center" style={{ background: GLASS_BG }}>
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">TOPICS</p>
            <p className="text-[20px] font-bold text-foreground mt-1">{topics.length}</p>
          </div>
          <div className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3 text-center" style={{ background: GLASS_BG }}>
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">BEST</p>
            <p className="text-[20px] font-bold text-chart-2 mt-1">
              {Math.max(...topics.map((t) => t.value))}%
            </p>
          </div>
          <div className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3 text-center" style={{ background: GLASS_BG }}>
            <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">NEEDS WORK</p>
            <p className="text-[20px] font-bold text-chart-3 mt-1">
              {Math.min(...topics.map((t) => t.value))}%
            </p>
          </div>
        </div>
      )}

      {/* Topic list */}
      <div ref={animateSection} data-section-index="1" className="mt-6">
        {isLoading && (
          <div className="space-y-3 max-[359px]:space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-3xl animate-pulse" style={{ background: GLASS_BG }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[12px] font-semibold text-destructive">Failed to load mastery data</p>
          </div>
        )}

        {!isLoading && topics.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-[12px] text-muted-foreground/60">No mastery data yet. Complete a sprint to see your progress.</p>
          </div>
        )}

        {topics.length > 0 && (
          <div ref={gridRef} className="rounded-3xl border border-white/[0.06] backdrop-blur-xl divide-y divide-white/[0.06] overflow-hidden" style={{ background: GLASS_BG }}>
            {topics.map((t) => (
              <div
                key={t.name}
                data-mastery-bar
                className="px-5 py-4 max-[359px]:px-4 max-[359px]:py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-foreground/80">{t.name}</span>
                  <span className={cn(
                    "text-[13px] font-bold font-mono",
                    t.value >= 80 ? "text-primary" : t.value >= 50 ? "text-chart-3" : "text-destructive",
                  )}>
                    {t.value}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${t.value}%`,
                      background: t.value >= 80
                        ? "var(--primary)"
                        : t.value >= 50
                          ? "var(--chart-3)"
                          : "var(--destructive)",
                    }}
                  />
                </div>
                <p className="mt-1.5 text-micro text-muted-foreground/40">
                  {t.value >= 80 ? "Strong" : t.value >= 50 ? "Developing" : "Needs practice"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </PageContainer>
  );
}
