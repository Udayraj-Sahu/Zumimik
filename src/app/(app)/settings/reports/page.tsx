"use client";
import { PageContainer } from "@/components/ui/page-container";
import { useState, useRef, useEffect } from "react";
import { FileText, Download, Zap, Target, Clock, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useReports } from "@/hooks/queries/use-reports";
import { usePageMeta } from "@/hooks/use-page-meta";
import { GLASS_BG } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { formatHoursMinutes } from "@/lib/text";
export default function ReportsPage() {
  usePageMeta("Reports — Zuzumik");
  const { data, isLoading, error } = useReports();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const gridRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();
  useEffect(() => {
    if (gridRef.current && data) {
      const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-stat-card]");
      staggerIn(
        cards,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power2.out" },
      );
    }
  }, [data, period, staggerIn]);
  useEffect(() => {
    if (topicRef.current && data) {
      const rows = topicRef.current.querySelectorAll<HTMLElement>("[data-topic-row]");
      staggerIn(
        rows,
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" },
      );
    }
  }, [data, period, staggerIn]);
  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-2xl">
        <div ref={headerRef} className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <FileText size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">REPORTS</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">
            Detailed performance analytics
          </p>
          <div className="mt-3 flex justify-center">
            <Button
              size="sm"
              className="min-h-11 max-[359px]:gap-1 max-[359px]:px-3 max-[359px]:py-1.5 hover:scale-[1.05] active:scale-[0.95]"
            >
              <Download size={14} /> Export
            </Button>
          </div>
        </div>

        <div
          ref={animateSection}
          data-section-index="0"
          className="mt-5 flex gap-2 max-[359px]:gap-1.5"
        >
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "min-h-11 rounded-lg px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring border backdrop-blur-xl whitespace-nowrap",
                period === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-white/[0.06] text-muted-foreground hover:text-foreground active:text-foreground",
              )}
              style={period !== p ? { background: GLASS_BG } : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        <div ref={animateSection} data-section-index="1" className="mt-6">
          {isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-24 rounded-3xl" style={{ background: GLASS_BG }} />
              <div className="h-48 rounded-3xl" style={{ background: GLASS_BG }} />
            </div>
          )}

          {error && (
            <div
              className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center backdrop-blur-xl"
              style={{ background: GLASS_BG }}
            >
              <p className="text-[12px] font-semibold text-destructive">Failed to load reports</p>
            </div>
          )}

          {data && (
            <>
              <div
                ref={gridRef}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-[359px]:gap-2 md:items-stretch"
              >
                <div
                  data-stat-card
                  className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3"
                  style={{ background: GLASS_BG }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-primary" />
                    <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">
                      SPRINTS
                    </p>
                  </div>
                  <p className="text-[20px] font-bold text-foreground">
                    {data.summary.totalSprints}
                  </p>
                </div>
                <div
                  data-stat-card
                  className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3"
                  style={{ background: GLASS_BG }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={14} className="text-chart-2" />
                    <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">
                      TOTAL XP
                    </p>
                  </div>
                  <p className="text-[20px] font-bold text-primary">
                    {data.summary.totalXP.toLocaleString()}
                  </p>
                </div>
                <div
                  data-stat-card
                  className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3"
                  style={{ background: GLASS_BG }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={14} className="text-chart-3" />
                    <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">
                      AVG ACC.
                    </p>
                  </div>
                  <p className="text-[20px] font-bold text-foreground">
                    {data.summary.avgAccuracy}%
                  </p>
                </div>
                <div
                  data-stat-card
                  className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3"
                  style={{ background: GLASS_BG }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-chart-4" />
                    <p className="text-micro text-muted-foreground/50 font-semibold tracking-wider whitespace-nowrap">
                      TOTAL TIME
                    </p>
                  </div>
                  <p className="text-[20px] font-bold text-foreground">
                    {formatHoursMinutes(data.summary.totalTime)}
                  </p>
                </div>
              </div>

              <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40 mb-3">
                {"Exam Breakdown"}
              </p>
              <div
                ref={topicRef}
                className="rounded-3xl border border-white/[0.06] backdrop-blur-xl overflow-hidden divide-y divide-white/[0.06]"
                style={{ background: GLASS_BG }}
              >
                {data.topics.map((t) => (
                  <div
                    key={t.topic}
                    data-topic-row
                    className="flex items-center gap-3 px-4 py-3 max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground/80">{t.label}</p>
                      <div className="flex items-center gap-3 text-micro text-muted-foreground/40 mt-0.5">
                        <span>{t.sprints} sprints</span>
                        {t.xp !== undefined && <span>{t.xp} XP</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 max-[359px]:gap-2">
                      <div className="w-16 sm:w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            t.accuracy >= 80
                              ? "bg-primary"
                              : t.accuracy >= 60
                                ? "bg-chart-3"
                                : "bg-destructive",
                          )}
                          style={{ width: `${t.accuracy}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-[12px] font-bold font-mono w-8 text-right",
                          t.accuracy >= 80
                            ? "text-primary"
                            : t.accuracy >= 60
                              ? "text-chart-3"
                              : "text-destructive",
                        )}
                      >
                        {t.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 backdrop-blur-xl p-4 flex items-center gap-3 max-[359px]:gap-2 max-[359px]:p-3">
                <Award size={20} className="text-primary shrink-0" />
                <div>
                  <p className="text-[12px] font-bold text-primary">
                    Best Accuracy: {data.summary.bestAccuracy}%
                  </p>
                  <p className="text-micro text-muted-foreground/60 mt-0.5">
                    Keep pushing for perfection!
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
