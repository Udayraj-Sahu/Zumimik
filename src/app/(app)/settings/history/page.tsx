"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { Clock, Award, ChevronRight, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useHistory } from "@/hooks/queries/use-history";
import { getTopicFilters, DIFFICULTY_FILTER } from "@/lib/mock/history";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type { HistoryEntry } from "@/lib/types/history";
import { usePageMeta } from "@/hooks/use-page-meta";
import { GLASS_BG } from "@/lib/theme";
import { formatTime } from "@/lib/text";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function HistoryRow({
  entry, onSelect,
}: {
  entry: HistoryEntry; index: number; onSelect: (e: HistoryEntry) => void;
}) {
  return (
    <button
      type="button"
      data-history-row
      onClick={() => onSelect(entry)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-white/[0.06] active:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ring rounded-xl max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-2.5"
    >
      <div className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl",
        entry.accuracy >= 80 ? "bg-primary/10" : entry.accuracy >= 50 ? "bg-chart-3/10" : "bg-destructive/10",
      )}>
        <span className={cn(
          "text-micro font-bold font-mono",
          entry.accuracy >= 80 ? "text-primary" : entry.accuracy >= 50 ? "text-chart-3" : "text-destructive",
        )}>
          {entry.accuracy}%
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground/80 truncate">{entry.topicLabel}</p>
        <div className="flex items-center gap-2 text-micro text-muted-foreground/40 mt-0.5 max-[359px]:gap-1.5">
          <span>{entry.difficulty}</span>
          <span>&middot;</span>
          <span>{entry.score}/{entry.total}</span>
          <span>&middot;</span>
          <span>+{entry.xpEarned} XP</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-micro font-mono text-muted-foreground/40">{formatTime(entry.totalTimeSpent)}</p>
        <p className="text-micro text-muted-foreground/50 mt-0.5">{formatDate(entry.completedAt)}</p>
      </div>
      <ChevronRight size={14} className="text-muted-foreground/20 shrink-0" />
    </button>
  );
}

export default function HistoryPage() {
  usePageMeta("Sprint History — Zuzumik");
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const domain = targetExam;
  const TOPICS_FILTER_HISTORY = getTopicFilters(domain);
  const { data: entries, isLoading, error } = useHistory(targetExam);
  const [topicFilter, setTopicFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 10;
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn, reduced } = useEntranceAnimations();

  useEffect(() => {
    if (listRef.current && entries && entries.length > 0) {
      const rows = listRef.current.querySelectorAll<HTMLElement>("[data-history-row]");
      staggerIn(rows, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: "power2.out" });
    }
  }, [entries, topicFilter, diffFilter, sortAsc, page, staggerIn]);

  useEffect(() => {
    if (reduced) return;
    if (detailRef.current && selected) {
      gsap.fromTo(detailRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
    }
  }, [selected, reduced]);

  const filtered = (entries ?? []).filter((e) => {
    if (topicFilter !== "all" && e.topic !== topicFilter) return false;
    if (diffFilter !== "all" && e.difficulty !== diffFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.completedAt).getTime();
    const db = new Date(b.completedAt).getTime();
    return sortAsc ? da - db : db - da;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paged = sorted.slice(page * perPage, (page + 1) * perPage);

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Clock size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">HISTORY</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Review your past sprint performances</p>
      </div>

      <div ref={animateSection} data-section-index="0" className="mt-5 space-y-2 max-[359px]:space-y-1.5">
        <div className="flex w-fit max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 min-h-[28px]" style={{ backgroundColor: GLASS_BG }}>
          <Filter size={11} className="shrink-0 text-muted-foreground/40" />
          <select
            value={topicFilter}
            onChange={(e) => { setTopicFilter(e.target.value); setPage(0); }}
            aria-label="Filter by topic"
            className="min-h-11 bg-transparent text-[12px] font-bold uppercase tracking-wider text-foreground outline-none appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded whitespace-nowrap"
          >
            {TOPICS_FILTER_HISTORY.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-[359px]:gap-1.5">
          <div className="flex flex-wrap gap-1 max-[359px]:gap-0.5">
            {DIFFICULTY_FILTER.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { setDiffFilter(d.id); setPage(0); }}
                className={cn(
                  "min-h-11 rounded-lg px-2 py-1 text-[12px] font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
                  diffFilter === d.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.06] text-muted-foreground hover:text-foreground active:text-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSortAsc(!sortAsc)}
            className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground outline-none hover:text-foreground active:text-foreground active:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring min-h-11 max-[359px]:gap-0.5 whitespace-nowrap"
            style={{ backgroundColor: GLASS_BG }}
          >
            <ArrowUpDown size={12} />
            {sortAsc ? "Oldest" : "Newest"}
          </button>
        </div>
      </div>

      <div ref={animateSection} data-section-index="1" className="mt-4">
        {selected && (
          <div ref={detailRef} className="mb-4 rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3" style={{ backgroundColor: GLASS_BG }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-foreground/80">{selected.topicLabel}</p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="min-h-[44px] px-3 py-2 text-micro text-muted-foreground/40 outline-none hover:text-foreground active:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center mb-3 max-[359px]:gap-1.5 md:items-stretch">
              <div className="rounded-xl p-2" style={{ backgroundColor: GLASS_BG }}>
                <p className="text-micro text-muted-foreground/40">Score</p>
                <p className="text-[13px] font-bold text-foreground">{selected.score}/{selected.total}</p>
              </div>
              <div className="rounded-xl p-2" style={{ backgroundColor: GLASS_BG }}>
                <p className="text-micro text-muted-foreground/40">Accuracy</p>
                <p className={cn(
                  "text-[13px] font-bold",
                  selected.accuracy >= 80 ? "text-primary" : selected.accuracy >= 50 ? "text-chart-3" : "text-destructive",
                )}>
                  {selected.accuracy}%
                </p>
              </div>
              <div className="rounded-xl p-2" style={{ backgroundColor: GLASS_BG }}>
                <p className="text-micro text-muted-foreground/40">XP</p>
                <p className="text-[13px] font-bold text-chart-2">+{selected.xpEarned}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-micro text-muted-foreground/40">
              <span>{selected.difficulty}</span>
              <span>{formatTime(selected.totalTimeSpent)}</span>
              <span>{formatDate(selected.completedAt)}</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: GLASS_BG }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[12px] font-semibold text-destructive">Failed to load history</p>
          </div>
        )}

        {sorted.length === 0 && (
          <div className="py-14 text-center">
            <Award size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-[12px] text-muted-foreground/60">No sprint history yet. Complete a sprint to see it here!</p>
          </div>
        )}

        {sorted.length > 0 && (
          <div ref={listRef} className="rounded-3xl border border-white/[0.06] backdrop-blur-xl divide-y divide-white/[0.06] overflow-hidden" style={{ backgroundColor: GLASS_BG }}>
            {paged.map((entry, i) => (
              <HistoryRow key={entry.id} entry={entry} index={i} onSelect={setSelected} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 max-[359px]:gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={cn(
                  "min-w-[44px] min-h-[44px] rounded-xl text-micro font-bold font-mono outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.06]",
                  page === i ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-muted-foreground hover:text-foreground active:text-foreground",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>
    </PageContainer>
  );
}
