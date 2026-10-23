"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  Play,
  Clock,
  Zap,
  Award,
  ChevronRight,
  Target,
  Calendar,
  Users,
  ShoppingBag,
  Rss,
  Home,
  Plus,
  ArrowUpRight,
  Flame,
  BookOpen,
  Sparkles,
  TrendingUp,
  GraduationCap,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { AMBER, AMBER_DARK, AMBER_LIGHT, AMBER_LIGHT_12, BG_SOFT, BLACK_30, CYAN, CYAN_LIGHT, CYAN_LIGHT_12, EMERALD, EMERALD_12, EMERALD_SOLID, GLASS_03, GLASS_05, GLASS_06, GLASS_15, GLASS_30, GLASS_BG, GLASS_BORDER, GREEN_SOFT, GREEN_SOFT_12, ROSE_PINK, ROSE_PINK_12, SKY, SLATE, SLATE_DARKEST, VIOLET_DARK, VIOLET_DARK_12, VIOLET_PURPLE, VIOLET_PURPLE_2, VIOLET_PURPLE_2_12, YELLOW, hueText } from "@/lib/theme";
import { useAccentHex } from "@/hooks/use-accent-hex";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/hooks/queries/use-dashboard";
import { ExamDateModal } from "@/components/dashboard/exam-date-modal";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useHabitStore } from "@/stores/habit-store";
import { DOMAIN_LABELS } from "@/lib/types/template";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { PlanIntro } from "@/components/onboarding/intros/plan-intro";
import { SeatBuilderIntro } from "@/components/onboarding/intros/seat-builder-intro";
import { ArenaIntro } from "@/components/onboarding/intros/arena-intro";
import { PitchIntro } from "@/components/onboarding/intros/pitch-intro";
import { HabitTrackerModal } from "@/components/dashboard/habit-tracker-modal";
import { DashboardWelcome } from "@/components/dashboard/mascot/dashboard-welcome";
import { StreakXpPill } from "@/components/dashboard/streak-xp-pill";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { InviteCard } from "@/components/dashboard/invite-card";
import { ResumeProtocolCard } from "@/components/adaptive/resume-protocol-card";
import { NumberTicker } from "@/registry/magicui/number-ticker";
import { useResumeStore } from "@/stores/resume-store";

const ACCENT = "var(--primary)";

// Neutral defaults only — never fabricated activity. A missing field renders as
// empty/zero so the real loading and error states stay the only honest sources
// of "no data yet".
const EMPTY_TOPICS: { name: string; value: number; color: "primary" }[] = [];
const EMPTY_RADAR: { label: string; value: number }[] = [];
const EMPTY_STATS = { accuracy: 0, questions: 0, percentile: 0, speed: 0 };
const EMPTY_STREAK = { current: 0, xp: 0, days: [false, false, false, false, false, false, false], labels: ["M", "T", "W", "T", "F", "S", "S"] };
const EMPTY_UPCOMING: { title: string; time: string; tag: string }[] = [];
const EMPTY_LEADERBOARD: { rank: number; name: string; xp: number; me?: boolean }[] = [];
const EMPTY_RECENT: { label: string; score: string; time: string }[] = [];

const QUICK_ACCESS_ITEMS = [
  { label: "Exam Prep", icon: Target, color: VIOLET_DARK, bg: VIOLET_DARK_12, href: "/learn" },
  { label: "Skill Build", icon: Zap, color: CYAN_LIGHT, bg: CYAN_LIGHT_12, href: "/learn/mastery" },
  { label: "Train Plan", icon: Calendar, color: VIOLET_PURPLE_2, bg: VIOLET_PURPLE_2_12, href: "/settings/planner" },
  { label: "Clubs", icon: Users, color: AMBER_LIGHT, bg: AMBER_LIGHT_12, href: "/dashboard/clubs" },
  { label: "Store", icon: ShoppingBag, color: ROSE_PINK, bg: ROSE_PINK_12, href: "/dashboard" },
  { label: "Feed", icon: Rss, color: GREEN_SOFT, bg: GREEN_SOFT_12, href: "/dashboard/feed" },
  { label: "Family", icon: Home, color: ROSE_PINK, bg: ROSE_PINK_12, href: "/dashboard" },
];

/* ------------------------------------------------------------------ */
/*  Radar Chart                                                         */
/* ------------------------------------------------------------------ */
function RadarChart({ axes, values, size = 280 }: { axes: string[]; values: number[]; size?: number }) {
  const center = size / 2;
  const radius = size * 0.34;
  const n = axes.length;

  const pointFor = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = values.map((v, i) => pointFor(i, radius * v));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ") + ` ${dataPoints[0].x},${dataPoints[0].y}`;

  return (
    <svg viewBox={`-40 -30 ${size + 80} ${size + 60}`} width="100%" height="auto" className="mx-auto block" style={{ maxWidth: size + 80 }}>
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0.08} />
        </linearGradient>
      </defs>
      {rings.map((r, idx) => {
        const pts = axes.map((_, i) => { const p = pointFor(i, radius * r); return `${p.x},${p.y}`; }).join(" ");
        return <polygon key={idx} points={pts} fill="none" style={{ stroke: GLASS_06, strokeWidth: 0.8 }} />;
      })}
      {axes.map((_, i) => {
        const p = pointFor(i, radius);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} style={{ stroke: GLASS_06, strokeWidth: 0.8 }} />;
      })}
      <polygon points={dataPath} fill="url(#radarFill)" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill={ACCENT} stroke={BLACK_30} strokeWidth={1.5} />)}
      {axes.map((label, i) => {
        const p = pointFor(i, radius + 26);
        return <text key={label} x={p.x} y={p.y} fill={SLATE} fontSize={11} fontWeight={700} letterSpacing={1} textAnchor="middle" dominantBaseline="middle">{label}</text>;
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                     */
/* ------------------------------------------------------------------ */
function SectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-[17px] font-semibold tracking-[-0.02em] text-foreground/90", className)}>
      {children}
    </h3>
  );
}

function SectionLabel({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={cn("text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase", className)} style={style}>
      {children}
    </p>
  );
}

type SlideActionCardProps = {
  accent: string;
  label: string;
  icon: LucideIcon;
  iconFill?: boolean;
  title: string;
  desc: string;
  cta: string;
  ctaFrom: string;
  ctaTo: string;
  href: string;
  glowShadow: string;
};

function SlideActionCard({ accent, label, icon: Icon, iconFill, title, desc, cta, ctaFrom, ctaTo, href, glowShadow }: SlideActionCardProps) {
  const router = useRouter();
  return (
    <div
      className="relative flex-1 rounded-2xl border overflow-hidden flex flex-col px-4 pt-3 pb-3.5"
      style={{ borderColor: `${accent}26`, background: `linear-gradient(180deg, ${accent}1A 0%, var(--glass-02) 100%)` }}
    >
      <div className="flex items-center gap-2.5">
        <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}26` }}>
          <Icon size={15} style={{ color: hueText(accent) }} fill={iconFill ? "currentColor" : "none"} />
        </div>
        <SectionLabel style={{ color: hueText(accent) }}>{label}</SectionLabel>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <h3 className="text-[16px] font-bold tracking-[-0.03em] text-foreground leading-tight">{title}</h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground/45 font-normal">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => router.push(href)}
        className="flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-[11.5px] font-semibold tracking-[-0.01em] text-[var(--on-accent)] transition-all active:scale-95"
        style={{ background: `linear-gradient(90deg, ${ctaFrom}, ${ctaTo})`, boxShadow: `0 0 0 var(--black-00)` }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = glowShadow; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 0 var(--black-00)"; }}
      >
        {cta}
      </button>
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  usePageMeta("Dashboard — Zuzumik");
  const router = useRouter();
  const accentHex = useAccentHex();

  const firstName = useOnboardingStore((s) => s.firstName);
  const persona = useOnboardingStore((s) => s.persona);
  const goal = useOnboardingStore((s) => s.goal);
  const triggers = useOnboardingStore((s) => s.triggers);
  const sex = useOnboardingStore((s) => s.sex);
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activePreps = useOnboardingStore((s) => s.activePreps);
  const examDates = useOnboardingStore((s) => s.examDates);
  const setExamDate = useOnboardingStore((s) => s.setExamDate);
  const isOnboarded = useOnboardingStore((s) => s.isOnboarded);
  const planHookSeen = useOnboardingStore((s) => s.planHookSeen);
  const setPlanHookSeen = useOnboardingStore((s) => s.setPlanHookSeen);
  const arenaHookSeen = useOnboardingStore((s) => s.arenaHookSeen);
  const setArenaHookSeen = useOnboardingStore((s) => s.setArenaHookSeen);
  const pitchHookSeen = useOnboardingStore((s) => s.pitchHookSeen);
  const setPitchHookSeen = useOnboardingStore((s) => s.setPitchHookSeen);
  const temporalWindow = useOnboardingStore((s) => s.temporalWindow);
  const resumeSnapshot = useResumeStore((s) => s.snapshot);
  const hasResume = Boolean(resumeSnapshot);
  const { data, isLoading, isError, error, refetch } = useDashboardData(targetExam);
  const { reduced } = useEntranceAnimations();

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [examDateOpen, setExamDateOpen] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showArena, setShowArena] = useState(false);
  const [showPitch, setShowPitch] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!isOnboarded || onboardingOpen) return;
    const isVedic = targetExam === "vedic-math";
    const eligibleExam = targetExam && !isVedic;
    if (!planHookSeen) setShowPlan(true);
    else if (eligibleExam && !arenaHookSeen && temporalWindow === "this_year") setShowArena(true);
    else if (eligibleExam && !pitchHookSeen && (temporalWindow === "whenever" || temporalWindow === "not_sure")) setShowPitch(true);
  }, [isOnboarded, onboardingOpen, planHookSeen, arenaHookSeen, pitchHookSeen, temporalWindow, targetExam]);

  // The mascot welcome must never play behind a sheet that covers the dashboard.
  const welcomeBlocked =
    onboardingOpen || showPlan || showArena || showPitch || habitModalOpen || examDateOpen;

  const profileSteps = [
    { label: "Name", done: !!firstName.trim() },
    { label: "Persona", done: !!persona },
    { label: "Goal", done: !!goal },
    { label: "Vibe", done: triggers.length > 0 },
    { label: "Details", done: !!sex },
  ];
  const profileDone = profileSteps.filter((s) => s.done).length;
  const profileTotal = profileSteps.length;
  const profileComplete = profileDone === profileTotal;

  const prepExams = useMemo(() => {
    const others = activePreps.filter((id) => id !== targetExam && id in DOMAIN_LABELS);
    const list = [...others];
    if (targetExam && targetExam in DOMAIN_LABELS) list.unshift(targetExam);
    return list;
  }, [activePreps, targetExam]);

  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    const idx = Math.round(scrollLeft / width);
    setCarouselIndex(idx);
  }, []);

  const scrollToSlide = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const width = el.clientWidth;
    el.scrollTo({ left: width * index, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (reduced) return;
    if (!carouselRef.current) return;
    const slides = carouselRef.current.children;
    const active = slides[carouselIndex];
    const card = active?.querySelector("[data-carousel-card]") as HTMLElement | null;
    if (!card) return;
    gsap.fromTo(card, { y: 14, opacity: 0.55, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" });
  }, [carouselIndex, reduced]);

  const topics = data?.topics ?? EMPTY_TOPICS;
  const overallMastery = topics.length > 0 ? Math.round(topics.reduce((sum, t) => sum + t.value, 0) / topics.length) : 0;
  const radarAxes = data?.radarAxes ?? EMPTY_RADAR;
  const stats = data?.stats ?? EMPTY_STATS;
  const streak = data?.streak ?? EMPTY_STREAK;
  // The week strip is Monday-first, so today's completion is the streak day at
  // the matching index (the same data the weekly dots on the card render).
  const todayIndex = (new Date().getDay() + 6) % 7;
  const goalDoneToday = streak.days[todayIndex] ?? false;
  const upcoming = data?.upcoming ?? EMPTY_UPCOMING;
  const leaderboard = data?.leaderboard ?? EMPTY_LEADERBOARD;
  const recent = data?.recent ?? EMPTY_RECENT;

  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const habitCount = habits.length;
  const todayLogs = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return logs.filter((l) => l.date === today && l.completed).map((l) => l.habitId);
  }, [logs]);
  const todayCompleted = todayLogs.length;
  const habitStats = useMemo(() => {
    const completedLogs = logs.filter((l) => l.completed);
    const dates = new Set(completedLogs.map((l) => l.date));
    let bestStreak = 0;
    let current = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (dates.has(d.toISOString().split("T")[0])) {
        current++;
        bestStreak = Math.max(bestStreak, current);
      } else {
        current = 0;
      }
    }
    const thirtyAgo = new Date(today);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const recentCompletions = completedLogs.filter((l) => l.date >= thirtyAgo.toISOString().split("T")[0]);
    const expectedMax = habitCount * 30;
    const completionRate = expectedMax > 0 ? Math.min(100, Math.round((recentCompletions.length / expectedMax) * 100)) : 0;
    return { currentStreak: current, bestStreak, totalCompletions: completedLogs.length, completionRate };
  }, [logs, habitCount]);

  const radarLabels = radarAxes.map((a) => a.label);
  const radarValues = radarAxes.map((a) => a.value);

  const examLabel = DOMAIN_LABELS[targetExam] ?? "Exam";

  const animateSection = useCallback((el: HTMLDivElement | null) => {
    if (!el || el.dataset.animated) return;
    el.dataset.animated = "true";
    if (reduced) return;
    const i = parseInt(el.dataset.sectionIndex || "0");
    gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, delay: i * 0.06, ease: "power3.out" });
  }, [reduced]);

  if (isError) {
    return (
      <PageContainer className="flex items-center justify-center pt-24">
        <div className="w-full max-w-sm text-center">
          <p className="text-[13px] font-semibold text-destructive">Failed to load your dashboard.</p>
          <p className="mt-2 text-[12px] text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              onClick={() => refetch()}
              className="hover:scale-[1.02]"
            >
              Retry
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isLoading && !data) {
    return (
      <PageContainer className="animate-pulse pt-10 md:max-w-3xl">
        <div className="mx-auto w-full max-w-3xl md:max-w-3xl">
          <div className="mx-auto h-16 w-48 rounded-xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
          <div className="mx-auto mt-4 h-10 w-64 rounded-xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
          <div className="mt-10 h-96 rounded-3xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="h-40 rounded-3xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
            <div className="h-40 rounded-3xl backdrop-blur-xl" style={{ backgroundColor: GLASS_BG }} />
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-none pt-0 pb-6 overflow-x-hidden min-[1025px]:pl-[64px] min-[1025px]:pr-[64px]">
      <div className="w-full">

      {/* Ambient glow behind header */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-20 overflow-hidden" style={{ background: "radial-gradient(circle, var(--accent-25) 0%, transparent 70%)" }} />

      {/* Header */}
      <div ref={animateSection} data-section-index={0} className="relative pt-6 pb-2 text-left min-[1025px]:pt-8 max-[359px]:pt-5">
        <div className="relative mb-3 flex flex-wrap items-center justify-start gap-2">
          <div aria-hidden="true" className="inline-flex size-10 items-center justify-center min-[1025px]:hidden">
            <ZuzumikMark className="size-4" />
          </div>
          <div className="order-last mt-5 w-full min-w-0 min-[1025px]:order-none min-[1025px]:mt-0 min-[1025px]:mr-2 min-[1025px]:w-auto min-[1025px]:flex-1">
            <DashboardWelcome
              enabled={!welcomeBlocked}
              greeting={
                <h1 className="text-[15px] font-bold leading-[1.25] tracking-[-0.01em] text-card-foreground sm:text-[16px]">
                  {firstName?.trim() ? (
                    <>
                      <span>Welcome back,</span>{" "}
                      <span className="italic text-primary">{firstName.trim()}</span>
                    </>
                  ) : (
                    <span>
                      <span>Welcome</span>{" "}
                      <span className="italic text-primary">Champion</span>
                    </span>
                  )}
                </h1>
              }
            />
          </div>
          <div data-tour-streak className="ml-auto flex items-center gap-1.5">
            <StreakXpPill streak={streak.current} xp={streak.xp} done={goalDoneToday} />
            <div className="flex shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className="hidden md:block">
          <h1 className="mt-5 text-[28px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground">
            Mastery is an <span className="text-primary">endurance of focus.</span>
          </h1>
          <p className="mt-4 max-w-[560px] text-[13px] font-normal leading-[1.6] tracking-[0.01em] text-muted-foreground/60">
            Your practice adapts to your error threshold in real time.{" "}
            <span className="whitespace-nowrap">Zero lag, zero distractions.</span>
          </p>
        </div>
      </div>

      <div className="md:columns-2 gap-5">

      {/* Carousel */}
      <div ref={animateSection} data-section-index={1.5} className="mt-5 md:mt-0 md:mb-5 break-inside-avoid">
        <div
          ref={carouselRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", width: "100%" }}
          onScroll={handleCarouselScroll}
        >
          {/* Slide 1: Profile status — teaser or complete card */}
          <div className={cn("snap-center shrink-0 w-full h-[420px] sm:h-[380px] transition-all duration-500 ease-out origin-center", carouselIndex === 0 ? "scale-100 opacity-100" : "scale-[0.94] opacity-40")}>
            <div data-carousel-card className="w-full relative overflow-hidden rounded-3xl border border-primary/20 flex flex-col pt-3 px-6 pb-6 h-full" style={{ background: "linear-gradient(135deg, var(--accent-06) 0%, var(--glass-02) 55%, var(--accent-04) 100%)" }}>
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent-40), transparent)" }} />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent-40), transparent)" }} />

              {profileComplete ? (
                <>
                  <header className="relative flex items-center justify-between py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full flex items-center justify-center text-[var(--on-accent)] font-black text-[16px] shrink-0 shadow-[0_0_14px_var(--accent-40)]" style={{ background: `linear-gradient(135deg, var(--cta-from), var(--cta-to))` }}>
                        {(firstName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <p className="text-[13.5px] font-bold text-foreground">Profile complete</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full px-2.5 py-1 border border-primary/20 text-[9px] font-bold text-primary" style={{ background: "var(--accent-08)" }}>
                      <Sparkles size={9} />
                      100%
                    </div>
                  </header>

                  <div className="relative flex flex-1 flex-col items-center justify-center py-2 text-center">
                    <div className="relative size-[92px]">
                      <svg width="92" height="92" viewBox="0 0 64 64" className="-rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" style={{ stroke: GLASS_05, strokeWidth: 5 }} />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 26}`} strokeDashoffset="0" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Sparkles size={17} className="text-primary" />
                        <span className="mt-0.5 text-[8px] font-bold text-primary tracking-wide">100%</span>
                      </div>
                    </div>
                    <h2 className="mt-5 text-[22px] font-bold tracking-[-0.03em] text-foreground leading-tight">You&apos;re all set,</h2>
                    <p className="mt-2 text-[11px] text-muted-foreground/40 font-normal leading-relaxed max-w-[250px]">Your prep is tailored to your goal — let&apos;s make it count.</p>
                    <div className="mt-[22px] flex flex-wrap items-center justify-center gap-2">
                      {profileSteps.map((s) => (
                        <div key={s.label} className="flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold text-foreground/70 border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.05)" }}>
                          <i className="size-[4px] rounded-full bg-[var(--primary)] shrink-0" style={{ boxShadow: "0 0 5px var(--primary)" }} />
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <footer className="relative flex items-center justify-between pt-3 pb-0 text-[9.5px] font-semibold tracking-[0.14em] border-t border-white/[0.06]">
                    <span className="text-muted-foreground/50">PROFILE READY</span>
                    <span className="text-primary">STREAKS UNLOCKED</span>
                  </footer>
                </>
              ) : (
                <>
                  <header className="relative flex items-center justify-between py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_14px_var(--accent-40)]" style={{ background: `linear-gradient(135deg, var(--cta-from), var(--cta-to))` }}>
                        <Sparkles size={14} className="text-[var(--on-accent)]" />
                      </div>
                      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary">Profile setup</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full px-2.5 py-1 border text-[9px] font-bold transition-colors" style={{ borderColor: profileDone > 0 ? "var(--accent-30)" : "rgba(255,255,255,0.07)", background: profileDone > 0 ? "var(--accent-08)" : "transparent", color: profileDone > 0 ? "var(--primary)" : GLASS_30 }}>
                      {profileDone}/{profileTotal}
                    </div>
                  </header>

                  <div className="relative flex flex-1 flex-col items-center justify-center py-2 text-center">
                    <div className="relative size-[88px]">
                      <svg width="88" height="88" viewBox="0 0 64 64" className="-rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" style={{ stroke: GLASS_05, strokeWidth: 5 }} />
                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 26}`} strokeDashoffset={`${2 * Math.PI * 26 * (1 - profileDone / profileTotal)}`} className="transition-all duration-700" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Sparkles size={17} className="text-primary" />
                        <span className="mt-0.5 text-[9px] font-black text-foreground/80">{profileDone}/{profileTotal}</span>
                      </div>
                    </div>
                    <h2 className="mt-5 text-[23px] font-black tracking-[-0.03em] text-foreground leading-tight">Finish your profile</h2>
                    <p className="mt-1.5 text-[11.5px] text-muted-foreground/45 font-normal leading-relaxed max-w-[230px]">Tell us who you are and what you&apos;re aiming for — we&apos;ll tailor everything to you.</p>
                    <div className="mt-[22px] flex flex-wrap items-center justify-center gap-2">
                      {profileSteps.map((s) => (
                        <div key={s.label} className="flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold border transition-colors" style={{ borderColor: s.done ? "var(--accent-30)" : "rgba(255,255,255,0.07)", background: s.done ? "var(--accent-08)" : "rgba(255,255,255,0.05)" }}>
                          <i className="size-[4px] rounded-full shrink-0" style={{ background: s.done ? "var(--primary)" : "var(--accent-30)", boxShadow: s.done ? "0 0 5px var(--primary)" : "none" }} />
                          <span className={cn(s.done ? "text-foreground" : "text-muted-foreground/60")}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={() => setOnboardingOpen(true)} data-tour-continue-setup className="relative flex items-center justify-center gap-2 rounded-full bg-cta px-5 py-3 text-[12px] font-bold tracking-[0.02em] text-[var(--on-accent)] transition-all hover:shadow-[0_0_20px_var(--accent-40)] active:scale-95">
                    CONTINUE SETUP
                    <ChevronRight size={14} className="mt-px" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Slide 2: Your Stats */}
          <div className={cn("snap-center shrink-0 w-full h-[420px] sm:h-[380px] transition-all duration-500 ease-out origin-center", carouselIndex === 1 ? "scale-100 opacity-100" : "scale-[0.94] opacity-40")}>
            <div data-carousel-card className="w-full relative overflow-hidden rounded-3xl border border-white/[0.05] p-4 h-full flex flex-col" style={{ background: "linear-gradient(160deg, var(--accent-04) 0%, var(--glass-02) 45%, var(--glass-02) 100%)" }}>
              <div className="absolute -top-10 right-0 w-36 h-36 rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent-30), transparent)" }} />
              <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-12)" }}>
                    <TrendingUp size={15} className="text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold tracking-[-0.01em] text-foreground">YOUR STATS</span>
                    <span className="text-[9px] text-muted-foreground/60 font-medium">This week</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/analytics")}
                  className="pill flex items-center gap-1 px-3 py-1.5 text-micro font-bold text-foreground/50 transition-all hover:bg-[var(--glass-07)] hover:text-foreground/80 active:scale-95"
                >
                  Details
                  <ArrowUpRight size={10} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 flex-1 content-center">
                {[
                  { label: "Accuracy", value: `${stats.accuracy}%`, icon: Target, color: EMERALD },
                  { label: "Questions", value: stats.questions.toLocaleString(), icon: BookOpen, color: CYAN },
                  { label: "Percentile", value: `${stats.percentile}%ile`, icon: Award, color: VIOLET_PURPLE },
                  { label: "Speed", value: `${stats.speed}s avg`, icon: Zap, color: YELLOW },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => router.push("/dashboard/analytics")}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.05] p-3.5 text-left transition-all hover:bg-white/[0.05] active:scale-[0.97] flex flex-col justify-center"
                  >
                    <div className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity" style={{ background: `radial-gradient(circle at top right, ${s.color}, transparent 75%)` }} />
                    <div className="flex items-center justify-between mb-2.5 relative">
                      <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: s.color + "18" }}>
                        <s.icon size={14} style={{ color: hueText(s.color) }} />
                      </div>
                    </div>
                    <p className="text-[20px] font-bold tracking-[-0.03em] text-foreground relative leading-none">{s.value}</p>
                    <div className="flex items-center justify-between mt-2 relative">
                      <p className="text-[8.5px] font-semibold tracking-[0.14em] text-muted-foreground/60 uppercase">{s.label}</p>
                      <ArrowUpRight size={11} className="text-muted-foreground/20 group-hover:text-primary/60 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slide 3: This Week + Daily Habits */}
          <div className={cn("snap-center shrink-0 w-full h-[420px] sm:h-[380px] transition-all duration-500 ease-out origin-center", carouselIndex === 2 ? "scale-100 opacity-100" : "scale-[0.94] opacity-40")}>
            <div data-carousel-card onClick={() => setHabitModalOpen(true)} className="w-full relative overflow-hidden rounded-3xl border backdrop-blur-xl p-4 sm:p-4 h-full flex flex-col cursor-pointer" style={{ borderColor: GLASS_BORDER, background: "linear-gradient(160deg, var(--emerald-06) 0%, var(--glass-02) 100%)" }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--emerald-30), transparent)" }} />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle, var(--emerald-40), transparent)" }} />

                <header className="relative shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: EMERALD_12 }}>
                      <Flame size={18} className="text-[var(--emerald)]" />
                    </div>
                    <SectionLabel className="text-[var(--emerald)]">THIS WEEK</SectionLabel>
                  </div>
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-[var(--emerald)]">
                    <Flame size={13} />
                    {streak.days.filter(Boolean).length} day
                  </span>
                </header>

                <div className="relative shrink-0 mt-4 sm:mt-3 grid grid-cols-7 gap-1 md:gap-2 lg:gap-2.5 pb-4 sm:pb-3 border-b border-white/[0.06]">
                  {streak.labels.map((day, i) => {
                    const done = streak.days[i];
                    return (
                      <span key={i} className={cn("h-7 w-full max-w-[36px] md:max-w-[40px] lg:max-w-[44px] mx-auto rounded-lg flex items-center justify-center font-mono text-[10px] font-semibold border transition-all", done ? "text-[#05150d] shadow-[0_0_12px_var(--emerald-45)]" : "text-[#4d5552]")} style={{ background: done ? `linear-gradient(135deg, ${EMERALD}, ${EMERALD_SOLID})` : GLASS_03, borderColor: done ? "transparent" : GLASS_06 }}>
                        {day}
                      </span>
                    );
                  })}
                </div>

                <div className="relative shrink-0 mt-4 sm:mt-2">
                  <SectionLabel className="text-[var(--emerald)]">DAILY HABITS</SectionLabel>
                  <h2 className="relative mt-2 sm:mt-1.5 text-[24px] sm:text-[22px] font-bold tracking-[-0.03em] text-foreground leading-tight">Build consistency</h2>
                  <p className="relative mt-2 sm:mt-1.5 text-[12px] text-muted-foreground/60 font-normal leading-snug sm:hidden">Daily check-ins · Streaks · Stay accountable</p>
                </div>

                <div className="relative mt-4 sm:mt-2 flex-1 min-h-0 flex items-center gap-4">
                  <div className="relative shrink-0 size-[76px] sm:size-[56px] rounded-full flex flex-col items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", boxShadow: `inset 0 0 0 5px ${GLASS_05}` }}>
                    <b className="text-[20px] sm:text-[16px] font-bold text-foreground leading-none">{todayCompleted}</b>
                    <small className="text-[9px] text-muted-foreground/55 font-semibold mt-1">/ {habitCount}</small>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-2">
                    <div className="flex items-center gap-3">
                      <div className="size-9 sm:size-8 shrink-0 rounded-[10px] flex items-center justify-center text-[var(--emerald)]" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <Flame size={16} />
                      </div>
                      <div className="flex-1">
                        <strong className="block text-[12px] font-bold text-foreground leading-tight">{habitStats.currentStreak} day streak</strong>
                        <span className="block mt-0.5 text-[10px] text-muted-foreground/60">Best {habitStats.bestStreak} days</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-9 sm:size-8 shrink-0 rounded-[10px] flex items-center justify-center text-[var(--emerald)]" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <Target size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <strong className="text-[12px] font-bold text-foreground leading-tight">Completion</strong>
                          <span className="text-[12px] font-bold text-[var(--emerald)]">{habitStats.completionRate}%</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${habitStats.completionRate}%`, background: `linear-gradient(90deg, ${EMERALD_SOLID}, ${EMERALD})` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative shrink-0 mt-4 sm:mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {habits.slice(0, 3).map((h) => (
                      <span key={h.id} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium text-foreground/80 border" style={{ borderColor: GLASS_06, background: GLASS_03 }}>
                        <i className="size-[4px] rounded-full" style={{ background: GLASS_15 }} />
                        {h.name.split(" ")[0]}
                      </span>
                    ))}
                    {habits.length > 3 && <span className="text-[9px] font-semibold text-foreground/80">+{habits.length - 3}</span>}
                  </div>
                  {habitCount - todayCompleted > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground/70 whitespace-nowrap">
                      <Clock size={10} />
                      {habitCount - todayCompleted} left today
                    </span>
                  )}
                </div>

                <button type="button" onClick={() => setHabitModalOpen(true)} className="group relative mt-4 sm:mt-3 shrink-0 flex h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[var(--emerald-bright)] to-[var(--emerald-solid)] text-[13px] font-semibold tracking-[0.06em] text-[var(--on-accent)] shadow-[0_8px_24px_var(--emerald-30)] transition-all duration-200 hover:shadow-[0_10px_34px_var(--emerald-40)] hover:brightness-105 active:scale-[0.97]">
                  VIEW HABITS
                  <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
          </div>

          {/* Slide 4: Practice + Technique */}
          <div className={cn("snap-center shrink-0 w-full h-[420px] sm:h-[380px] transition-all duration-500 ease-out origin-center", carouselIndex === 3 ? "scale-100 opacity-100" : "scale-[0.94] opacity-40")}>
            <div data-carousel-card className="w-full relative overflow-hidden rounded-3xl border border-white/[0.06] p-3 h-full flex flex-col gap-2.5" style={{ background: "linear-gradient(135deg, var(--cyan-08) 0%, var(--amber-06) 50%, var(--glass-02) 100%)" }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, var(--cyan-25), transparent)" }} />
              <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle, var(--amber-30), transparent)" }} />

              <SlideActionCard
                accent={CYAN}
                label="PRACTICE MODE"
                icon={Play}
                iconFill
                title="Master with templates"
                desc="Guided exercises · Build speed & accuracy"
                cta="PRACTICE NOW"
                ctaFrom={CYAN}
                ctaTo={SKY}
                href="/learn/practice"
                glowShadow="0 0 16px var(--cyan-30)"
              />

              <SlideActionCard
                accent={AMBER}
                label="TECHNIQUE LIBRARY"
                icon={BookOpen}
                title="Learn a technique"
                desc="Browse core methods · Master each approach"
                cta="EXPLORE TECHNIQUES"
                ctaFrom={AMBER}
                ctaTo={AMBER_DARK}
                href="/learn/explorer"
                glowShadow="0 0 16px var(--amber-30)"
              />
            </div>
          </div>

          {/* Slide 5: Exam Prep Readiness */}
          <div className={cn("snap-center shrink-0 w-full h-[420px] sm:h-[380px] transition-all duration-500 ease-out origin-center", carouselIndex === 4 ? "scale-100 opacity-100" : "scale-[0.94] opacity-40")}>
            <div data-carousel-card className="w-full relative overflow-hidden rounded-3xl border border-white/[0.06] backdrop-blur-xl h-full flex flex-col" style={{ borderColor: GLASS_BORDER, background: "linear-gradient(160deg, var(--accent-08) 0%, var(--cyan-05) 50%, var(--glass-02) 100%)" }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent-30), transparent)" }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, var(--accent-40), transparent)" }} />

              {(() => {
                const masteredCount = topics.filter((t) => t.value >= 80).length;
                const examDate = examDates[targetExam];
                const rawDays = examDate ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000) : 0;
                const daysLeft = examDate ? Math.max(0, rawDays) : 0;
                const hoursLeft = daysLeft !== 0 ? Math.max(0, Math.round(daysLeft * 3.5)) : 0;
                const examLabel = (DOMAIN_LABELS[targetExam] || targetExam).toUpperCase();

                return (
                  <>
                    {/* Readiness section */}
                    <div className="relative p-5 flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-12)" }}>
                            <GraduationCap size={15} className="text-primary" />
                          </div>
                          <SectionLabel>YOUR PROGRESS</SectionLabel>
                        </div>
                        {prepExams.length > 1 && (
                          <span className="text-[9px] font-bold text-primary/60 bg-primary/10 border border-primary/15 rounded-full px-2 py-0.5">{prepExams.length} preps</span>
                        )}
                      </div>

                      <div className="flex items-center gap-5 mt-2">
                        <div className="relative shrink-0">
                          <svg width="92" height="92" viewBox="0 0 92 92">
                            <circle cx="46" cy="46" r="40" fill="none" style={{ stroke: GLASS_06, strokeWidth: 7 }} />
                            <circle
                              cx="46" cy="46" r="40" fill="none"
                              stroke={overallMastery >= 80 ? EMERALD : overallMastery >= 60 ? CYAN : YELLOW}
                              strokeWidth="7" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallMastery / 100)}`}
                              transform="rotate(-90 46 46)"
                              className="transition-all duration-700"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[20px] font-bold text-foreground leading-none">{overallMastery}%</span>
                            <span className="text-[7.5px] text-muted-foreground/35 font-semibold mt-0.5">ready</span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground/50 uppercase">Curriculum preparedness</p>
                          <p className="text-[12px] text-foreground/80 font-normal leading-snug mt-1">
                            You&apos;ve covered <span className="font-bold text-foreground">{masteredCount} of {topics.length || 1}</span> topics expected for {DOMAIN_LABELS[targetExam] || targetExam}.
                          </p>
                           <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-10)] border border-[var(--accent-20)] px-2.5 py-1">
                             <span className="size-1.5 rounded-full bg-[var(--primary)]" />
                             <span className="text-[9px] font-bold text-[var(--primary)]">On track</span>
                           </div>
                        </div>
                      </div>

                      {/* Exam date picker */}
                      <div className="mt-4">
                        {examDate ? (
                          <button
                            type="button"
                            onClick={() => setExamDateOpen(true)}
                            className="w-full flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-left transition-all hover:bg-white/[0.06] active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-12)" }}>
                                <Calendar size={12} className="text-primary" />
                              </div>
                              <span className="text-micro font-semibold text-foreground">Exam {new Date(examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            </div>
                            <Pencil size={11} className="text-muted-foreground/30" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setExamDateOpen(true)}
                            className="w-full flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-all hover:bg-primary/[0.08] active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-12)" }}>
                                <Calendar size={12} className="text-primary" />
                              </div>
                              <div>
                                <span className="text-[11px] font-semibold text-primary block">Set exam date</span>
                                <span className="text-[9px] text-primary/50">Unlock your countdown</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-primary/40" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Countdown section */}
                    <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-5 text-center border-t border-white/[0.06]">
                      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at top, var(--accent-20), transparent 60%)" }} />
                      {examDate ? (
                        <>
                          <p className="relative flex items-baseline justify-center text-[26px] font-black not-italic tracking-tighter leading-none text-white dark:text-white">
                            <NumberTicker value={daysLeft} active={carouselIndex === 4} delay={0.1} duration={1.2} startValue={0} aria-label={`${daysLeft} days`} />
                            <span className="text-[11px] font-bold not-italic tracking-[0.18em] ml-1.5 text-primary/70">DAYS</span>
                          </p>
                          <p className="relative text-[58px] font-black not-italic tracking-tighter leading-none text-white dark:text-white mt-1.5">
                            <NumberTicker value={hoursLeft} active={carouselIndex === 4} delay={0.25} duration={1.4} startValue={0} aria-label={`${hoursLeft} hours`} />
                            <span className="text-[22px] font-bold not-italic align-top ml-1.5 text-primary">HR</span>
                          </p>
                          <p className="relative text-micro font-bold tracking-[0.28em] text-white/60 mt-1">REMAINING FOR {examLabel}</p>
                        </>
                      ) : (
                        <>
                          <p className="relative text-micro font-bold tracking-[0.28em] text-primary/70">SET YOUR TARGET</p>
                          <p className="relative text-[20px] font-black italic tracking-tighter leading-none text-white dark:text-white mt-1">COUNTDOWN</p>
                          <p className="relative text-micro font-bold tracking-[0.28em] text-white/60 mt-1">REMAINING FOR {examLabel}</p>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={carouselIndex === i ? "true" : undefined}
              className="group flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "rounded-full transition-all duration-300",
                  carouselIndex === i ? "h-2 w-5 bg-primary" : "h-2 w-2 bg-white/15 group-hover:bg-white/30"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access + Resume Protocol */}
      <div
        ref={animateSection}
        data-section-index={5}
        className={cn(
          "min-w-0 mt-6 md:mt-0 md:mb-5 break-inside-avoid",
          hasResume && "grid gap-4"
        )}
      >
        <GlassCard className="h-full p-5 max-[359px]:p-4">
          <SectionLabel>QUICK ACCESS</SectionLabel>
          <div
            className={cn(
              "grid gap-3 mt-4 grid-cols-4 max-[359px]:gap-2",
              hasResume ? "md:grid-cols-4 lg:grid-cols-4" : "md:grid-cols-6 lg:grid-cols-8"
            )}
          >
            {QUICK_ACCESS_ITEMS.map((q) => {
              const label = q.label === "Exam Prep" && examLabel !== "Exam" ? `${examLabel} Prep` : q.label;
              return (
              <button
                key={q.label}
                type="button"
                onClick={() => router.push(q.href)}
                className="flex flex-col items-center gap-3 rounded-2xl py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: q.bg }}>
                  <q.icon size={18} color={hueText(q.color)} />
                </div>
                <span className="text-micro font-medium text-foreground/55 text-center leading-tight tracking-[0.01em]">{label}</span>
              </button>
              );
            })}
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-4 opacity-35">
              <div className="h-11 w-11 rounded-full flex items-center justify-center">
                <Plus size={15} className="text-muted-foreground" />
              </div>
              <span className="text-micro font-medium text-muted-foreground text-center leading-tight tracking-[0.01em]">Coming Soon</span>
            </div>
          </div>
        </GlassCard>
        {hasResume && (
          <ResumeProtocolCard accent={accentHex} className="md:mt-0 md:min-w-0 md:h-full" />
        )}
      </div>

      {/* Topic Mastery + Recent Activity */}
      <div className="mt-6 md:contents">
        {/* Topic Mastery */}
        <div ref={animateSection} data-section-index={6} className="md:mb-5 break-inside-avoid">
          <GlassCard className="p-5 h-full">
            <div className="flex items-center justify-between mb-5">
              <SectionHeading>Topic mastery</SectionHeading>
              <button
                type="button"
                onClick={() => router.push("/learn/mastery")}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-primary transition-all hover:gap-2.5"
              >
                View all <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {topics.map((t) => (
                <div key={t.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-muted-foreground/55 font-normal tracking-[0.01em]">{t.name}</span>
                    <span className="text-[13px] font-bold text-primary tracking-[-0.01em]">{t.value}%</span>
                  </div>
                  <div className="h-[7px] w-full rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${t.value}%`,
                        background: "linear-gradient(90deg, var(--accent-50), var(--primary))",
                        boxShadow: "0 0 10px var(--accent-25)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Recent Activity */}
        <div ref={animateSection} data-section-index={7} className="mt-4 md:mt-0 md:mb-5 break-inside-avoid">
          <GlassCard className="p-5 h-full">
            <SectionHeading className="mb-4">Recent activity</SectionHeading>
            <div className="flex flex-col">
              {recent.map((a, i) => (
                <div
                  key={a.label}
                  className={cn("flex items-center justify-between py-3.5", i !== recent.length - 1 && "border-b border-white/[0.05]")}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-[5px] w-[5px] rounded-full bg-primary/50" />
                    <span className="text-[13px] text-muted-foreground/55 font-normal tracking-[0.01em]">{a.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-primary tracking-[-0.01em]">{a.score}</span>
                    <span className="text-[11px] text-muted-foreground/55 w-16 text-right font-normal">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Cognitive Radar + Upcoming */}
      <div className="mt-4 md:contents">
        {/* Cognitive Radar */}
        <div ref={animateSection} data-section-index={8} className="md:break-before-column md:mb-5 break-inside-avoid">
          <GlassCard className="p-4">
            <SectionHeading className="mb-2">Cognitive radar</SectionHeading>
            <RadarChart axes={radarLabels} values={radarValues} size={220} />
            <div className="flex flex-col gap-2 mt-2.5">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2">
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground/55 font-normal">
                  <Zap size={12} className="text-primary" />
                  Action Delay
                </span>
                <span className="text-[12px] font-bold text-primary tracking-[-0.01em]">142ms</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2">
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground/55 font-normal">
                  <ArrowUpRight size={12} className="text-primary" />
                  Focus Density
                </span>
                <span className="text-[12px] font-bold text-primary tracking-[-0.01em]">89%</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Upcoming */}
        <div ref={animateSection} data-section-index={9} className="mt-4 md:mt-0 md:mb-5 break-inside-avoid">
          <GlassCard className="p-5 h-full">
            <SectionHeading className="mb-4">Upcoming</SectionHeading>
            <div className="flex flex-col gap-2.5">
              {upcoming.map((u) => (
                <div
                  key={u.title}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-3.5"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">{u.title}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-normal">{u.time}</p>
                  </div>
                  {u.tag === "LIVE" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--orange-15)] px-3 py-1 text-[11px] font-semibold text-[var(--orange)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
                      {u.tag}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-muted-foreground/50">
                      {u.tag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Leaderboard + Invite Friends & Referral */}
      <div className="mt-4 md:contents">
      <div ref={animateSection} data-section-index={10} className="md:mb-5 break-inside-avoid">
        <GlassCard className="h-full p-5">
          <SectionHeading className="mb-4">Leaderboard</SectionHeading>
          <div className="flex flex-col">
            {leaderboard.map((l, i) => (
              <div
                key={l.rank}
                className={cn(
                  "flex items-center justify-between py-3.5",
                  i !== leaderboard.length - 1 && "border-b border-white/[0.05]",
                  l.me && "rounded-xl px-3 -mx-3 bg-primary/[0.06] border border-primary/10",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[13px] font-bold w-8 tracking-[-0.01em]",
                    l.rank === 1 ? "text-[var(--gold)]" : l.rank === 2 ? "text-[var(--silver)]" : l.rank === 3 ? "text-[var(--bronze)]" : "text-muted-foreground/60"
                  )}>
                    {l.rank <= 3 ? ["🥇", "🥈", "🥉"][l.rank - 1] : `#${l.rank}`}
                  </span>
                  <span className={cn("text-[13px]", l.me ? "font-bold text-primary" : "font-medium text-foreground/65")}>
                    {l.name}
                  </span>
                </div>
                <span className={cn("text-[13px] font-bold tracking-[-0.01em]", l.me ? "text-primary" : "text-muted-foreground/40")}>{l.xp.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div ref={animateSection} data-section-index={11} className="mt-4 md:mt-0 md:mb-5 break-inside-avoid">
        <InviteCard />
      </div>
      </div>
      </div>

      {habitModalOpen && (
        <HabitTrackerModal onClose={() => setHabitModalOpen(false)} />
      )}
      {onboardingOpen && (
        <OnboardingModal onClose={() => setOnboardingOpen(false)} />
      )}
      <ExamDateModal
        open={examDateOpen}
        initialValue={examDates[targetExam]}
        onConfirm={(d) => setExamDate(targetExam, d)}
        onClose={() => setExamDateOpen(false)}
      />
      {showPlan && targetExam === "vedic-math" && (
        <SeatBuilderIntro
          onClose={() => {
            setPlanHookSeen(true);
            setShowPlan(false);
          }}
        />
      )}
      {showPlan && targetExam !== "vedic-math" && (
        <PlanIntro
          onClose={() => {
            setPlanHookSeen(true);
            setShowPlan(false);
          }}
        />
      )}
      {showArena && (
        <ArenaIntro
          onClose={() => {
            setArenaHookSeen(true);
            setShowArena(false);
          }}
        />
      )}
      {showPitch && (
        <PitchIntro
          onClose={() => {
            setPitchHookSeen(true);
            setShowPitch(false);
          }}
        />
      )}
      </div>
    </PageContainer>
  );
}
