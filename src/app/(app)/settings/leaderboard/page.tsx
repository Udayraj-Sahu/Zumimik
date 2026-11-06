"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useCallback } from "react";
import gsap from "gsap";
import { Trophy, Medal, ArrowUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useLeaderboard } from "@/hooks/queries/use-leaderboard";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { LeaderboardEntry } from "@/lib/types/dashboard";
import { GLASS_06, GLASS_BG } from "@/lib/theme";

const PERIODS = ["all", "week", "month"] as const;

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={18} className="text-chart-3" />;
  if (rank === 2) return <Medal size={18} className="text-muted-foreground" />;
  if (rank === 3) return <Medal size={18} className="text-chart-4" />;
  return null;
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry; index: number }) {
  return (
    <div
      data-leaderboard-row
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-2.5",
        entry.me ? "bg-primary/5 border border-primary/20" : "hover:bg-white/[0.04] active:bg-white/[0.06]",
      )}
    >
      <span className={cn(
        "w-8 text-center text-[12px] font-bold font-mono",
        entry.rank <= 3 ? "text-foreground" : "text-muted-foreground/40",
        entry.me && "text-primary",
      )}>
        {entry.rank <= 3 ? <RankMedal rank={entry.rank} /> : entry.rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[12px] font-semibold truncate",
          entry.me ? "text-primary" : "text-foreground/80",
        )}>
          {entry.name}
          {entry.me && <span className="ml-2 text-micro text-primary/60 font-normal">(You)</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 max-[359px]:gap-1.5">
        <div className="hidden sm:block w-20 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60"
            style={{ width: `${Math.min(100, (entry.xp / 5000) * 100)}%` }}
          />
        </div>
        <span className={cn(
          "text-[12px] font-bold font-mono",
          entry.me ? "text-primary" : "text-foreground/80",
        )}>
          {entry.xp.toLocaleString()}
        </span>
        <span className="text-micro text-muted-foreground/40 hidden sm:inline">XP</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  usePageMeta("Leaderboard — Zuzumik");
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const { data: entries, isLoading, error } = useLeaderboard();
  const { headerRef, animateSection, reduced } = useEntranceAnimations();

  const animateRows = useCallback((el: HTMLDivElement | null) => {
    if (el && !el.dataset.animated) {
      el.dataset.animated = "true";
      if (reduced) return;
      const cards = el.querySelectorAll<HTMLElement>("[data-leaderboard-row]");
      if (cards.length) {
        gsap.fromTo(cards, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.03, ease: "power2.out" });
      } else {
        gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
      }
    }
  }, [reduced]);

  const me = entries?.find((e) => e.me);
  const prevRank = me ? entries?.find((e) => e.rank === me.rank - 1) : null;
  const xpToNext = prevRank && me ? prevRank.xp - me.xp : 0;

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      {/* Header */}
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Trophy size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">LEADERBOARD</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Track your ranking across all arenas</p>
      </div>

      {/* Period tabs */}
      <div ref={animateSection} data-section-index="0" className="mt-5 flex gap-2 max-[359px]:gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "min-h-11 rounded-lg px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
              period === p
                ? "bg-primary text-primary-foreground"
                : "border border-white/[0.06] text-muted-foreground hover:text-foreground active:text-foreground",
              period !== p && `backdrop-blur-xl`,
            )}
            style={period !== p ? { background: GLASS_BG, borderColor: GLASS_06 } : undefined}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={animateRows} data-section-index="1" className="mt-4">
        {isLoading && (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-3xl" style={{ background: GLASS_BG }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[12px] font-semibold text-destructive">Failed to load leaderboard</p>
            <p className="mt-1 text-micro text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
          </div>
        )}

        {entries && entries.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[12px] text-muted-foreground/60">No rankings yet. Complete a sprint to get on the board!</p>
          </div>
        )}

        {entries && entries.length > 0 && (
          <>
            <div className="rounded-3xl border border-white/[0.06] backdrop-blur-xl divide-y divide-white/[0.06] overflow-hidden" style={{ background: GLASS_BG }}>
              {entries.map((entry, i) => (
                <LeaderboardRow key={`${entry.rank}-${i}`} entry={entry} index={i} />
              ))}
            </div>

            {/* Your rank summary */}
            {me && (
              <div ref={animateSection} data-section-index="2" className="mt-6 rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 sm:p-5 max-[359px]:p-3" style={{ background: GLASS_BG }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 max-[359px]:gap-2">
                  <div className="flex items-center gap-3 max-[359px]:gap-2">
                    <div className="grid size-10 place-items-center rounded-full bg-primary/10">
                      <Target size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-foreground">Your Rank</p>
                      <p className="text-micro text-muted-foreground/60">
                        #{me.rank} of {entries.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 text-[12px] max-[359px]:gap-2">
                    <div>
                      <span className="text-muted-foreground/60">XP: </span>
                      <span className="font-bold font-mono text-foreground">{me.xp.toLocaleString()}</span>
                    </div>
                    {xpToNext > 0 && prevRank && (
                      <div className="flex items-center gap-1 text-chart-3 max-[359px]:gap-0.5 whitespace-nowrap">
                        <ArrowUp size={14} />
                        <span className="font-bold font-mono">{xpToNext.toLocaleString()} XP</span>
                        <span className="text-muted-foreground/60 text-micro">to #{prevRank.rank}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </PageContainer>
  );
}
