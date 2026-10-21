"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Puzzle, Brain, Zap, Clock, Flame, Gamepad2, type LucideIcon } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { AMBER, BLUE, CTA_LIME, GLASS_BG, GLASS_BORDER, PURPLE, SLATE_SOFT, hueText } from "@/lib/theme";

const TABS = [
  { id: "math", label: "Math", icon: Zap, color: AMBER },
  { id: "puzzle", label: "Puzzle", icon: Puzzle, color: CTA_LIME },
  { id: "memory", label: "Memory", icon: Brain, color: BLUE },
  { id: "logic", label: "Logic", icon: Trophy, color: PURPLE },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ModeCard = {
  id: string;
  category: string;
  title: string;
  desc: string;
  color: string;
  icon: LucideIcon;
  badge?: string;
  href?: string;
};

const MATH_MODES: ModeCard[] = [
  {
    id: "sprint",
    category: "MATH",
    title: "SPRINT DUELS",
    desc: "Race to solve the most in 1 minute.",
    color: AMBER,
    icon: Clock,
    href: "/play/configure-sprint",
  },
  {
    id: "fast",
    category: "MATH",
    title: "FAST & FIRST DUELS",
    desc: "Be the first to answer each question.",
    color: CTA_LIME,
    icon: Flame,
    badge: "2P",
    href: "/play/duel",
  },
];

const MODES_BY_TAB: Record<TabId, ModeCard[]> = {
  math: MATH_MODES,
  puzzle: [],
  memory: [],
  logic: [],
};

const COMING_SOON: Record<TabId, string> = {
  math: "",
  puzzle: "Puzzle modes coming soon",
  memory: "Memory modes coming soon",
  logic: "Logic modes coming soon",
};

/* ------------------------------------------------------------------ */
/*  Mode card                                                           */
/* ------------------------------------------------------------------ */
function ModeCardButton({ mode }: { mode: ModeCard }) {
  const router = useRouter();
  const Icon = mode.icon;

  return (
    <button
      type="button"
      onClick={() => mode.href && router.push(mode.href)}
      className="relative w-full rounded-3xl border backdrop-blur-xl p-5 text-left transition-all hover:bg-white/[0.06] active:scale-[0.98] overflow-hidden max-[359px]:p-4"
      style={{ borderColor: GLASS_BORDER, background: GLASS_BG }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${mode.color}, transparent)` }} />

      <div className="flex items-center justify-between mb-4 relative">
        <span
          className="text-micro font-bold tracking-[0.14em] rounded-full px-3 py-1 uppercase"
          style={{
            color: hueText(mode.color),
            background: `color-mix(in srgb, ${hueText(mode.color)} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${hueText(mode.color)} 12%, transparent)`,
          }}
        >
          {mode.category}
        </span>
        {mode.badge && (
          <span className="text-micro font-bold rounded-full px-3 py-1 bg-primary/15 text-primary border border-primary/20">
            {mode.badge}
          </span>
        )}
      </div>

      <h2 className="relative text-[17px] font-bold tracking-[-0.02em] text-foreground mb-1.5">
        {mode.title}
      </h2>
      <p className="relative text-[12px] text-muted-foreground/45 font-normal max-w-[80%] leading-relaxed">
        {mode.desc}
      </p>

      <div className="absolute right-5 bottom-4 opacity-60 max-[359px]:right-4 max-[359px]:bottom-3" style={{ color: hueText(mode.color) }}>
        <Icon size={32} strokeWidth={1.8} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function PlayPage() {
  usePageMeta("Play — Zuzumik");
  const [activeTab, setActiveTab] = useState<TabId>("math");
  const modes = MODES_BY_TAB[activeTab];
  const comingSoon = COMING_SOON[activeTab];

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      {/* Header */}
      <header className="mb-5">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Gamepad2 size={12} className="text-primary" />
          <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">PLAY</span>
        </div>
        <h1 className="text-[20px] font-bold tracking-[-0.02em] text-foreground leading-tight">
          Duels &amp; Challenges
        </h1>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">
          Compete, learn, and climb the leaderboard
        </p>
      </header>

      {/* Tabs */}
      <nav aria-label="Play modes" className="grid grid-cols-4 gap-2.5 mb-5 max-[359px]:gap-1.5">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="tab-tile flex flex-col items-center gap-2 py-3 rounded-2xl transition-all max-[359px]:py-2.5 max-[359px]:gap-1.5"
              data-active={isActive ? "true" : undefined}
            >
              <div
                className="tab-tile-chip h-9 w-9 rounded-xl flex items-center justify-center transition-all"
                style={isActive ? { background: `${tab.color}18` } : undefined}
              >
                <Icon size={16} strokeWidth={2.2} style={{ color: isActive ? hueText(tab.color) : hueText(SLATE_SOFT) }} />
              </div>
              <span
                className="text-micro font-semibold tracking-[0.02em] whitespace-nowrap"
                style={{ color: hueText(isActive ? tab.color : SLATE_SOFT) }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mode Cards */}
      <section className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-stretch md:gap-5">
        {modes.length > 0 ? (
          modes.map((mode) => <ModeCardButton key={mode.id} mode={mode} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-dashed border-white/[0.06] md:col-span-2" style={{ background: GLASS_BG }}>
            <div className="h-14 w-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
              <Trophy size={24} className="text-muted-foreground/20" />
            </div>
            <p className="text-[14px] font-semibold text-muted-foreground/45">
              {comingSoon}
            </p>
            <p className="text-[12px] text-muted-foreground/55 mt-1.5 font-normal">
              Stay tuned for new game modes
            </p>
          </div>
        )}
      </section>
      </div>
    </PageContainer>
  );
}
