"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Flame, Target, Zap, Swords, Medal, Trophy, LayoutGrid, Timer, Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useAchievements } from "@/hooks/queries/use-achievements";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { AchievementItem, AchievementTier, AchievementCategory } from "@/lib/types/achievements";
import { AMBER, AMBER_15, BRONZE, BRONZE_15, CTA_15, CTA_LIME, GLASS_02, GLASS_03, GLASS_BG, SLATE_40, SLATE_60, SLATE_SOFT, SLATE_SOFT_15, hueText } from "@/lib/theme";

const ICON_MAP: Record<string, LucideIcon> = {
  Flame, Target, Zap, Swords, Medal, Trophy, LayoutGrid, Timer, Users,
};

const CATEGORIES: { id: AchievementCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "streak", label: "Streak" },
  { id: "accuracy", label: "Accuracy" },
  { id: "speed", label: "Speed" },
  { id: "social", label: "Social" },
];

const TIER_STYLES: Record<AchievementTier, { ring: string; ringTrack: string; label: string }> = {
  bronze:   { ring: BRONZE, ringTrack: BRONZE_15, label: "Bronze" },
  silver:   { ring: SLATE_SOFT, ringTrack: SLATE_SOFT_15, label: "Silver" },
  gold:     { ring: AMBER, ringTrack: AMBER_15, label: "Gold" },
  platinum: { ring: CTA_LIME, ringTrack: CTA_15, label: "Platinum" },
};

/* ------------------------------------------------------------------ */
/*  SVG Circular Progress Ring                                          */
/* ------------------------------------------------------------------ */
function ProgressRing({ progress, tier, size = 44, stroke = 3 }: { progress: number; tier: AchievementTier; size?: number; stroke?: number }) {
  const styles = TIER_STYLES[tier];
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={styles.ringTrack}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={styles.ring}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Shimmer overlay for locked cards                                    */
/* ------------------------------------------------------------------ */
function ShimmerOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] opacity-[0.07]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--glass-40) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Achievement Card                                                    */
/* ------------------------------------------------------------------ */
function AchievementCard({ item }: { item: AchievementItem; index: number }) {
  const Icon = ICON_MAP[item.icon] ?? Flame;
  const tier = TIER_STYLES[item.tier];
  const isRecent = useMemo(() => {
    if (!item.unlockedAt) return false;
    const diff = Date.now() - new Date(item.unlockedAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }, [item.unlockedAt]);

  return (
    <div
      data-achievement-card
      className={cn(
        "relative rounded-3xl border p-4 flex flex-col items-center text-center transition-all backdrop-blur-xl overflow-hidden max-[359px]:p-3",
        item.unlocked
          ? "border-white/[0.06]"
          : "border-dashed border-white/[0.08] opacity-60",
      )}
      style={{
        backgroundColor: item.unlocked ? GLASS_BG : GLASS_02,
      }}
    >
      {isRecent && (
        <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full" style={{ backgroundColor: tier.ring }} />
      )}

      {!item.unlocked && <ShimmerOverlay />}

      {/* Ring + Icon */}
      <div className="relative mb-3">
        {item.unlocked ? (
          <ProgressRing progress={100} tier={item.tier} size={52} stroke={3} />
        ) : item.progress !== undefined && item.progress > 0 ? (
          <ProgressRing progress={item.progress} tier={item.tier} size={52} stroke={3} />
        ) : (
          <svg width={52} height={52}>
            <circle
              cx={26} cy={26} r={23}
              fill="none"
              stroke={tier.ringTrack}
              strokeWidth={3}
            />
          </svg>
        )}
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="grid size-8 place-items-center rounded-lg"
            style={{
              backgroundColor: item.unlocked ? `${tier.ring}18` : GLASS_BG,
            }}
          >
            <Icon
              size={16}
              style={{ color: item.unlocked ? hueText(tier.ring) : SLATE_40 }}
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <p
        className="text-[12px] font-bold tracking-wide"
        style={{ color: item.unlocked ? "var(--foreground)" : SLATE_60 }}
      >
        {item.label}
      </p>

      {/* Description */}
      <p className="text-micro text-muted-foreground/50 mt-0.5 leading-tight">
        {item.description}
      </p>

      {/* Tier badge */}
      <span
        className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
        style={{
          color: item.unlocked ? hueText(tier.ring) : SLATE_40,
          backgroundColor: item.unlocked ? `${tier.ring}12` : GLASS_03,
        }}
      >
        {tier.label}
      </span>

      {/* Progress text for locked */}
      {!item.unlocked && item.progress !== undefined && item.progress > 0 && (
        <p className="mt-1.5 text-micro text-muted-foreground/40 font-mono">{item.progress}%</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function AchievementsPage() {
  usePageMeta("Achievements — Zuzumik");
  const { data: achievements, isLoading, error } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();

  useEffect(() => {
    if (gridRef.current && achievements && achievements.length > 0) {
      const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-achievement-card]");
      staggerIn(cards, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power2.out" });
    }
  }, [achievements, activeCategory, staggerIn]);

  const filtered = useMemo(() => {
    if (!achievements) return [];
    if (activeCategory === "all") return achievements;
    return achievements.filter((a) => a.category === activeCategory);
  }, [achievements, activeCategory]);

  const unlocked = achievements?.filter((a) => a.unlocked).length ?? 0;
  const total = achievements?.length ?? 0;
  const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      {/* Header */}
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Trophy size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">ACHIEVEMENTS</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">
          {total > 0 ? `${unlocked}/${total} unlocked` : "Unlock badges as you train"}
        </p>
      </div>

      {/* Hero ring + stats */}
      {total > 0 && (
        <div ref={animateSection} data-section-index="0" className="mt-5">
          <div className="rounded-3xl border border-white/[0.06] backdrop-blur-xl p-5 flex items-center gap-5 max-[359px]:gap-3 max-[359px]:p-4" style={{ background: GLASS_BG }}>
            {/* Large ring */}
            <div className="relative shrink-0">
              <ProgressRing progress={percent} tier="platinum" size={80} stroke={4} />
              <div className="absolute inset-0 grid place-items-center">
                <span className="text-[18px] font-bold text-foreground">{percent}%</span>
              </div>
            </div>
            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 gap-3 max-[359px]:gap-2 md:items-stretch">
              <div>
                <p className="text-[18px] font-bold text-foreground">{unlocked}</p>
                <p className="text-micro text-muted-foreground/40 font-semibold uppercase tracking-wider whitespace-nowrap">Unlocked</p>
              </div>
              <div>
                <p className="text-[18px] font-bold text-foreground">{total - unlocked}</p>
                <p className="text-micro text-muted-foreground/40 font-semibold uppercase tracking-wider whitespace-nowrap">Remaining</p>
              </div>
              <div>
                <p className="text-[18px] font-bold" style={{ color: TIER_STYLES.gold.ring }}>
                  {achievements?.filter((a) => a.tier === "gold" && a.unlocked).length ?? 0}
                </p>
                <p className="text-micro text-muted-foreground/40 font-semibold uppercase tracking-wider whitespace-nowrap">Gold</p>
              </div>
              <div>
                <p className="text-[18px] font-bold" style={{ color: TIER_STYLES.platinum.ring }}>
                  {achievements?.filter((a) => a.tier === "platinum" && a.unlocked).length ?? 0}
                </p>
                <p className="text-micro text-muted-foreground/40 font-semibold uppercase tracking-wider whitespace-nowrap">Platinum</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div ref={animateSection} data-section-index="1" className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-[359px]:gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring min-h-11 backdrop-blur-xl max-[359px]:px-2.5 whitespace-nowrap",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "border border-white/[0.06] text-muted-foreground hover:text-foreground active:text-foreground",
            )}
            style={activeCategory !== cat.id ? { background: GLASS_BG } : undefined}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={animateSection} data-section-index="2" className="mt-5">
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-[359px]:gap-2 md:items-stretch">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-3xl animate-pulse"
                style={{ backgroundColor: GLASS_BG }}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center backdrop-blur-xl">
            <p className="text-[12px] font-semibold text-destructive">Failed to load achievements</p>
            <p className="mt-1 text-micro text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
          </div>
        )}

        {achievements && filtered.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[12px] text-muted-foreground/60">No achievements in this category yet.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-[359px]:gap-2 md:items-stretch">
            {filtered.map((item, i) => (
              <AchievementCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Shimmer keyframes via style tag */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      </div>
    </PageContainer>
  );
}