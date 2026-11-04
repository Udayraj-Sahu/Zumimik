"use client";

import { useRouter } from "next/navigation";
import { CYAN, EMERALD, GLASS_BG, GLASS_BORDER, ROSE, VIOLET_PURPLE, YELLOW } from "@/lib/theme";
import { useAccentHex } from "@/hooks/use-accent-hex";
import { isNativeRuntime } from "@/lib/native/is-native";
import { useState } from "react";
import {
  Grid3x3,
  Sigma,
  Pentagon,
  Sparkles,
  Target,
  Flame,
  Clock,
  ChevronRight,
  Calculator,
  ListChecks,
  BookOpen,
  Zap,
  Brain,
  TrendingUp,
  ShieldCheck,
  Trophy,
  CalendarDays,
} from "lucide-react";
import { useAdaptiveState, useTodayPlan } from "@/hooks/queries/use-adaptive";
import { useAccountSummary, type AccountSummary } from "@/hooks/queries/use-account-summary";
import { IS_MOCK } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { resolveJourneyProfile } from "@/lib/adaptive/modes";
import type { JourneyProfile, TimeBlock } from "@/lib/adaptive/modes";
import type {
  AdaptiveTopicState,
  PracticeRecommendation,
  MockRecommendation,
  AdaptiveDomainState,
} from "@/lib/types/adaptive";

const TEMPORAL_LABELS: Record<string, string> = {
  this_year: "This Year",
  whenever: "Flexible",
  not_sure: "Exploring",
};

const TOPIC_ICONS: Record<string, { icon: typeof Grid3x3; color: string }> = {
  "Problem Solving": { icon: Calculator, color: EMERALD },
  "Data Sufficiency": { icon: ListChecks, color: CYAN },
  "Sentence Correction": { icon: BookOpen, color: VIOLET_PURPLE },
  "Critical Reasoning": { icon: Target, color: YELLOW },
  "Reading Comp.": { icon: BookOpen, color: ROSE },
  "Quantitative Apt.": { icon: Calculator, color: EMERALD },
  "LR & DI": { icon: ListChecks, color: CYAN },
  "Verbal Ability": { icon: BookOpen, color: VIOLET_PURPLE },
  "Quant Comparison": { icon: Sigma, color: EMERALD },
  "Text Completion": { icon: BookOpen, color: VIOLET_PURPLE },
  "Sentence Equivalence": { icon: Sparkles, color: YELLOW },
  "Numerical Ability": { icon: Calculator, color: EMERALD },
  "General Awareness": { icon: ListChecks, color: YELLOW },
  "Computer Knowledge": { icon: Pentagon, color: VIOLET_PURPLE },
  "Vedic Addition": { icon: Calculator, color: EMERALD },
  "Vedic Subtraction": { icon: Sigma, color: CYAN },
  "Vedic Multiplication": { icon: Zap, color: YELLOW },
  "Squares & Bases": { icon: Pentagon, color: VIOLET_PURPLE },
};

function sprintHref(rec: PracticeRecommendation, domain: string): string {
  return `/play/sprint?topic=${encodeURIComponent(rec.topicId)}&length=${rec.length}&difficulty=${encodeURIComponent(rec.difficulty)}&adaptive=1&domain=${encodeURIComponent(domain)}`;
}

function CircularGauge({
  percent,
  accent,
  segments,
}: {
  percent: number;
  accent: string;
  segments?: { id: string; color: string; mastery: number }[];
}) {
  const r = 54;
  const c = 2 * Math.PI * r;

  const arcPoint = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: 60 + r * Math.cos(a), y: 60 + r * Math.sin(a) };
  };
  const arcD = (from: number, to: number) => {
    const p0 = arcPoint(from);
    const p1 = arcPoint(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  };

  return (
    <div className="relative size-[120px] shrink-0">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" style={{ stroke: GLASS_BORDER, strokeWidth: 8 }} />
        {segments && segments.length > 0 ? (
          (() => {
            const n = segments.length;
            const slot = 360 / n;
            const gap = 2.5;
            return segments.map((s, i) => {
              const from = i * slot + gap / 2;
              const end = from + (slot - gap) * Math.max(0, Math.min(1, s.mastery / 100));
              if (end - from < 0.4) return null;
              return (
                <path
                  key={s.id}
                  d={arcD(from, end)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                  style={{ filter: `drop-shadow(0 0 6px ${s.color}40)` }}
                />
              );
            });
          })()
        ) : (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0, Math.min(100, percent)) / 100)}
            className="transition-all duration-700"
            style={{
              filter: `drop-shadow(0 0 8px ${accent}55)`,
              transformOrigin: "60px 60px",
              transform: "rotate(-90deg)",
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-black tracking-tight text-foreground leading-none">
          {percent}%
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50 mt-1">
          ready
        </span>
      </div>
    </div>
  );
}

type VariantCtx = {
  /** Real /dashboard/* numbers. null in explicit mock mode, where the fixture state supplies them. */
  live: AccountSummary | null;
  domain: string;
  router: ReturnType<typeof useRouter>;
  data: AdaptiveDomainState;
  profile: JourneyProfile;
  topics: AdaptiveTopicState[];
  mastered: number;
  overall: number;
  bestStreak: number;
  hours: number;
  weak: PracticeRecommendation | null;
  practice: PracticeRecommendation | null;
  mock: MockRecommendation | null;
  timeBudget: TimeBlock[];
  startHref: string;
  daysRemaining: number | null;
};

/* ── Mode-specific blocks ── */

function ModeHeader({
  profile,
  temporalLabel,
  daysRemaining,
}: {
  profile: JourneyProfile;
  temporalLabel: string;
  daysRemaining: number | null;
}) {
  const isPath = profile.headlinePrefix === "Path";
  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-5"
      style={{
        borderColor: GLASS_BORDER,
        background: `linear-gradient(160deg, ${profile.accent}12 0%, var(--glass-02) 60%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(circle, ${profile.accent}, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${profile.accent}66, transparent)`,
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
          style={{ borderColor: `${profile.accent}30`, background: `${profile.accent}0d` }}
        >
          <Target size={11} style={{ color: profile.accent }} />
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: profile.accent }}
          >
            {profile.title}
            {temporalLabel ? ` · ${temporalLabel}` : ""}
          </span>
        </div>
        {daysRemaining !== null && (
          <div className="pill inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5">
            <CalendarDays size={11} style={{ color: profile.accent }} />
            <span className="text-[10px] font-bold" style={{ color: profile.accent }}>
              {daysRemaining} days left
            </span>
          </div>
        )}
      </div>

      <h2
        className="relative mt-3 bg-clip-text text-transparent text-[22px] font-black tracking-[-0.03em] leading-tight"
        style={{
          backgroundImage: `linear-gradient(90deg, ${profile.accent}, var(--glass-92))`,
        }}
      >
        {isPath ? "Your Learning Path" : profile.title}
      </h2>
      <p className="relative mt-1.5 text-[12px] font-medium text-muted-foreground/55">
        {profile.subtitle}
      </p>
    </div>
  );
}

function CardHeader({
  children,
  accent,
  action,
}: {
  children: React.ReactNode;
  accent: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p
        className="text-[9px] font-semibold tracking-[0.18em] uppercase"
        style={{ color: `${accent}d9` }}
      >
        {children}
      </p>
      {action}
    </div>
  );
}

function ExamReadyBlock({ ctx }: { ctx: VariantCtx }) {
  const mission = [
    ...(ctx.weak
      ? [
          {
            n: "01",
            t: ctx.weak.topicLabel,
            d: `${ctx.weak.length} q · ${ctx.weak.difficulty}`,
            href: sprintHref(ctx.weak, ctx.domain),
          },
        ]
      : []),
    ...(ctx.practice
      ? [
          {
            n: "02",
            t: ctx.practice.topicLabel,
            d: `${ctx.practice.length} q · spaced review`,
            href: sprintHref(ctx.practice, ctx.domain),
          },
        ]
      : []),
    ...(ctx.mock
      ? [
          {
            n: "03",
            t: "Full-length Mock",
            d: `${ctx.mock.length} q · exam simulation`,
            href: "/learn?mode=mock",
          },
        ]
      : []),
  ];
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader accent={ctx.profile.accent}>Today&apos;s Mission</CardHeader>
      <div className="mt-3.5 flex flex-col gap-3">
        {mission.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-6 text-center">
            <p className="text-[11px] text-muted-foreground/50">
              Complete a sprint to unlock your mission.
            </p>
          </div>
        )}
        {mission.map((m) => (
          <button
            key={m.n}
            type="button"
            onClick={() => ctx.router.push(m.href)}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] px-4 py-3 text-left transition-all hover:bg-white/[0.04] active:scale-[0.98]"
          >
            <span className="font-mono text-[11px] font-bold" style={{ color: ctx.profile.accent }}>
              {m.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-foreground/85 truncate">{m.t}</p>
              <p className="text-micro text-muted-foreground/50 truncate">{m.d}</p>
            </div>
            <ChevronRight size={12} className="shrink-0 text-muted-foreground/40" />
          </button>
        ))}
      </div>

      <div
        className="mt-4 rounded-2xl border p-4"
        style={{ borderColor: `${ctx.profile.accent}25`, background: `${ctx.profile.accent}0a` }}
      >
        <div className="flex items-center gap-2">
          <Zap size={12} style={{ color: ctx.profile.accent }} />
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: ctx.profile.accent }}
          >
            Tactical Module
          </p>
        </div>
        <p className="mt-1.5 text-[13px] font-bold text-foreground leading-tight">
          {ctx.weak ? `Master ${ctx.weak.topicLabel}` : "Targeted intervention"}
        </p>
        <p className="mt-1 text-micro text-muted-foreground/55">
          {ctx.weak
            ? `${ctx.weak.mastery}% mastered · ${ctx.weak.length} questions → tap to start`
            : "Your engine will create one after your first sprint."}
        </p>
      </div>
    </div>
  );
}

function GapCloserBlock({ ctx }: { ctx: VariantCtx }) {
  const gap = 100 - ctx.overall;
  const gaps = [...ctx.topics].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader
        accent={ctx.profile.accent}
        action={
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: `${ctx.profile.accent}12`, color: ctx.profile.accent }}
          >
            {gap}% gap
          </span>
        }
      >
        Your Preparation Gap
      </CardHeader>
      <div className="mt-3.5 flex items-center gap-5">
        <CircularGauge
          percent={ctx.overall}
          accent={ctx.profile.accent}
          segments={ctx.topics.map((t) => ({ id: t.id, color: t.color, mastery: t.mastery }))}
        />
        <div>
          <p className="text-[13px] font-semibold text-foreground/80">
            You don&apos;t need to rush.
            <br />
            You need to become ready.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground/55">
            Current readiness{" "}
            <span className="font-bold" style={{ color: ctx.profile.accent }}>
              {ctx.overall}%
            </span>
          </p>
        </div>
      </div>
      {gaps.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-2">
            Your biggest gaps
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((t) => (
              <span
                key={t.id}
                className="pill px-3 py-1 text-[10px] font-bold text-muted-foreground/70"
                style={{ background: `${t.color}12` }}
              >
                {t.name} · {t.mastery}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DISCOVERY_PHASES = [
  { t: "Build Foundation", d: "Core concepts, no pressure" },
  { t: "Discover Weak Areas", d: "See where you need reps" },
  { t: "Develop Consistency", d: "Daily check-ins add up" },
  { t: "Track Your Readiness", d: "Watch the gauge climb" },
];

function DiscoveryBlock({ ctx }: { ctx: VariantCtx }) {
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader accent={ctx.profile.accent}>Current Focus</CardHeader>
      <p className="mt-3.5 mb-4 text-[12px] text-muted-foreground/55">
        Your exam date isn&apos;t fixed yet — that&apos;s okay. We&apos;ll build your skills while
        you figure it out.
      </p>
      <div className="flex flex-col gap-2.5">
        {DISCOVERY_PHASES.map((p, i) => (
          <div
            key={p.t}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] px-4 py-3"
          >
            <span className="font-mono text-[11px] font-bold" style={{ color: ctx.profile.accent }}>
              0{i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-foreground/85">{p.t}</p>
              <p className="text-micro text-muted-foreground/50">{p.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuidedLearningBlock({ ctx }: { ctx: VariantCtx }) {
  const weak = ctx.topics[0];
  const next = ctx.topics[1] ?? weak;
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader accent={ctx.profile.accent}>Today&apos;s Lesson</CardHeader>
      <div className="mt-3.5 flex flex-col gap-2">
        {ctx.topics.slice(0, 3).map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] px-4 py-3"
          >
            <span
              className="grid size-7 place-items-center rounded-lg"
              style={{ background: `${t.color}15` }}
            >
              <span className="text-[11px] font-bold" style={{ color: t.color }}>
                {["①", "②", "③"][i]}
              </span>
            </span>
            <p className="text-[13px] font-bold text-foreground/85">{t.name}</p>
            <span className="ml-auto text-micro font-bold" style={{ color: t.color }}>
              {["Foundation", "Learn", "Practice"][i]}
            </span>
          </div>
        ))}
      </div>
      {weak && (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{ borderColor: `${ctx.profile.accent}25`, background: `${ctx.profile.accent}0a` }}
        >
          <div className="flex items-center gap-2">
            <Brain size={12} style={{ color: ctx.profile.accent }} />
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: ctx.profile.accent }}
            >
              Adaptive Note
            </p>
          </div>
          <p className="mt-1.5 text-[12px] text-foreground/75 leading-snug">
            {weak.mastery === 0
              ? `Start with ${weak.name.toLowerCase()} — we'll keep it light and build up.`
              : `${weak.name} is ${weak.mastery}% there. Next recommended skill: ${next?.name?.toLowerCase() ?? "a review round"}.`}
          </p>
        </div>
      )}
    </div>
  );
}

function SpeedTrainingBlock({ ctx }: { ctx: VariantCtx }) {
  const accuracy = ctx.live ? (ctx.live.accuracy ?? 0) : (ctx.data?.lastSession?.accuracy ?? 0);
  // Real mode: measured average seconds/question from /dashboard/stats, or unknown. Never a made-up default.
  const avgSec: number | null = ctx.live
    ? ctx.live.speed
    : ctx.data && (ctx.data.totalTimeSpent ?? 0) > 0 && (ctx.data.sessionCount ?? 0) > 0
      ? Math.max(
          3,
          Math.round(
            (ctx.data.totalTimeSpent ?? 0) /
              ((ctx.data.sessionCount ?? 0) * Math.max(ctx.data.topics.length, 1)) /
              6,
          ),
        )
      : 8.4;
  const target = avgSec === null ? null : Math.max(4, avgSec - 1.5);
  const weak = ctx.topics[0];
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader accent={ctx.profile.accent}>Speed Training</CardHeader>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-white/[0.06] p-3.5">
          <p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
            Current Speed
          </p>
          <p className="mt-1.5 text-[22px] font-black tracking-tight text-foreground leading-none">
            {avgSec ?? "--"}
            {avgSec !== null && <span className="text-[12px] font-bold text-muted-foreground/50"> sec/q</span>}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] p-3.5">
          <p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
            Accuracy
          </p>
          <p className="mt-1.5 text-[22px] font-black tracking-tight text-foreground leading-none">
            {accuracy > 0 ? `${accuracy}%` : "--"}
            <span className="text-[12px] font-bold text-muted-foreground/50"> {ctx.live ? "overall" : "last"}</span>
          </p>
        </div>
      </div>
      {weak && (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{ borderColor: `${ctx.profile.accent}25`, background: `${ctx.profile.accent}0a` }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-foreground">Today&apos;s Challenge</p>
            {target !== null && (
              <span
                className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
                style={{ color: ctx.profile.accent }}
              >
                Target &lt; {target}s
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-foreground/70">
            {(ctx.practice?.length ?? ctx.weak?.length) ? `${ctx.practice?.length ?? ctx.weak?.length} calculations · ` : ""}focus: {weak.name}
          </p>
        </div>
      )}
    </div>
  );
}

function PerformanceBlock({ ctx }: { ctx: VariantCtx }) {
  const weak = ctx.topics[0];
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader accent={ctx.profile.accent}>Competitive Exam Mode</CardHeader>
      <div className="mt-3.5 flex items-center gap-5">
        <CircularGauge percent={ctx.overall} accent={ctx.profile.accent} />
        <div>
          <p className="text-[13px] font-semibold text-foreground/80">
            Speed + accuracy under exam conditions.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground/55">
            Weak area:{" "}
            <span className="font-bold" style={{ color: ctx.profile.accent }}>
              {weak?.name ?? "—"}
            </span>
          </p>
        </div>
      </div>
      {weak && (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{ borderColor: `${ctx.profile.accent}25`, background: `${ctx.profile.accent}0a` }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} style={{ color: ctx.profile.accent }} />
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: ctx.profile.accent }}
            >
              Tactical Module
            </p>
          </div>
          <p className="mt-1.5 text-[13px] font-bold text-foreground leading-tight">
            {ctx.weak?.topicLabel ?? `Rapid ${weak.name}`}
          </p>
          <p className="mt-1 text-micro text-muted-foreground/55">
            {ctx.weak
              ? `${ctx.weak.length} questions · target 90%+ accuracy`
              : "Start with a sprint to calibrate speed."}
          </p>
        </div>
      )}
    </div>
  );
}

function BrainGymBlock({ ctx }: { ctx: VariantCtx }) {
  const score = Math.round(ctx.overall * 0.9);
  const pb = Math.max(score, 91);
  const workouts = [
    { t: "Quick Calculation", d: "5 min" },
    { t: "Number Pattern", d: "5 min" },
    { t: "Mental Arithmetic", d: "5 min" },
    { t: "Memory Challenge", d: "5 min" },
  ];
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader accent={ctx.profile.accent}>Today&apos;s Mental Workout</CardHeader>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-white/[0.06] p-3.5">
          <div className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
            <Trophy size={11} style={{ color: ctx.profile.accent }} /> Today&apos;s Score
          </div>
          <p className="mt-1.5 text-[22px] font-black tracking-tight text-foreground leading-none">
            {score}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] p-3.5">
          <div className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
            <TrendingUp size={11} style={{ color: ctx.profile.accent }} /> Personal Best
          </div>
          <p className="mt-1.5 text-[22px] font-black tracking-tight text-foreground leading-none">
            {pb}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {workouts.map((w, i) => (
          <div
            key={w.t}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] px-4 py-2.5"
          >
            <span className="font-mono text-[10px] font-bold" style={{ color: ctx.profile.accent }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[12px] font-bold text-foreground/80">{w.t}</p>
            <span className="ml-auto text-micro text-muted-foreground/50">{w.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared blocks ── */

function StatsBlock({ ctx }: { ctx: VariantCtx }) {
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5 overflow-hidden"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader
        accent={ctx.profile.accent}
        action={
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: `${ctx.profile.accent}12`, color: ctx.profile.accent }}
          >
            {ctx.overall}% ready
          </span>
        }
      >
        Curriculum Preparedness
      </CardHeader>
      <div className="mt-3.5 flex flex-col items-center gap-4">
        <CircularGauge
          percent={ctx.overall}
          accent={ctx.profile.accent}
          segments={ctx.topics.map((t) => ({ id: t.id, color: t.color, mastery: t.mastery }))}
        />
        <div className="w-full min-w-0 flex flex-col gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="size-7 rounded-lg flex items-center justify-center"
              style={{ background: `${ctx.profile.accent}12` }}
            >
              <Grid3x3 size={12} style={{ color: ctx.profile.accent }} />
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/80">Topics Mastered</span>
            <span className="ml-auto shrink-0 text-[13px] font-bold" style={{ color: ctx.profile.accent }}>
              {ctx.mastered}/{ctx.topics.length}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="size-7 rounded-lg flex items-center justify-center"
              style={{ background: `${ctx.profile.accent}12` }}
            >
              <Flame size={12} style={{ color: ctx.profile.accent }} />
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/80">Daily Streak</span>
            <span className="ml-auto shrink-0 text-[13px] font-bold" style={{ color: ctx.profile.accent }}>
              {ctx.live ? (ctx.live.streakDays == null ? "--" : `${ctx.live.streakDays} days`) : `${ctx.bestStreak} days`}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="size-7 rounded-lg flex items-center justify-center"
              style={{ background: `${ctx.profile.accent}12` }}
            >
              <Clock size={12} style={{ color: ctx.profile.accent }} />
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/80">Time Spent</span>
            <span className="ml-auto shrink-0 text-[13px] font-bold" style={{ color: ctx.profile.accent }}>
              {ctx.live && !(ctx.data.totalTimeSpent ?? 0) ? "--" : `${ctx.hours}h`}
            </span>
          </div>
        </div>
      </div>
      {ctx.topics.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/[0.06] p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/50">
              Pending Across Topics
            </p>
            <span className="text-[10px] font-bold" style={{ color: ctx.profile.accent }}>
              {ctx.topics.length - ctx.mastered} topics
            </span>
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {[...ctx.topics]
              .sort((a, b) => a.mastery - b.mastery)
              .map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: t.color, boxShadow: `0 0 6px ${t.color}66` }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground/70">
                    {t.name}
                  </span>
                  <span
                    className="shrink-0 text-[10px] font-mono font-bold"
                    style={{ color: t.color }}
                  >
                    {100 - t.mastery}% pending
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimeBudgetBlock({ ctx }: { ctx: VariantCtx }) {
  if (ctx.timeBudget.length === 0) return null;
  const total = ctx.timeBudget.reduce((s, b) => s + b.minutes, 0);
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[9px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: `${ctx.profile.accent}d9` }}
        >
          Daily Budget
        </p>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold"
          style={{ background: `${ctx.profile.accent}12`, color: ctx.profile.accent }}
        >
          {total} min
        </span>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        {ctx.timeBudget.map((b, i) => (
          <div
            key={b.label}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] px-4 py-2.5"
          >
            <span
              className="font-mono text-[10px] font-bold"
              style={{ color: `${ctx.profile.accent}99` }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 truncate text-[12px] font-semibold text-foreground/80">
              {b.label}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((b.minutes / total) * 100)}%`,
                  background: `${ctx.profile.accent}99`,
                }}
              />
            </div>
            <span className="shrink-0 text-[12px] font-bold" style={{ color: ctx.profile.accent }}>
              {b.minutes}m
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicMasteryList({ ctx }: { ctx: VariantCtx }) {
  const mastered = ctx.topics.filter((t) => t.mastery >= 80).length;
  return (
    <div
      className="rounded-3xl border backdrop-blur-xl p-5"
      style={{ borderColor: GLASS_BORDER }}
    >
      <CardHeader
        accent={ctx.profile.accent}
        action={
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: `${ctx.profile.accent}12`, color: ctx.profile.accent }}
          >
            {mastered}/{ctx.topics.length} mastered
          </span>
        }
      >
        Your Topics
      </CardHeader>
      <div className="mt-3.5 flex flex-col gap-2">
        {ctx.topics.map((t) => {
          const iconMeta = TOPIC_ICONS[t.name];
          const Icon = iconMeta?.icon ?? Grid3x3;
          const iconColor = iconMeta?.color ?? t.color;
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] px-4 py-3"
            >
              <div
                className="size-8 shrink-0 rounded-lg flex items-center justify-center"
                style={{ background: `${iconColor}12` }}
              >
                <Icon size={14} style={{ color: iconColor }} />
              </div>
              <span className="max-w-[110px] truncate text-[13px] font-semibold text-foreground/85">
                {t.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${t.mastery}%`,
                    background: `linear-gradient(90deg, ${t.color}88, ${t.color})`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-[13px] font-bold" style={{ color: t.color }}>
                {t.mastery}%
              </span>
              {t.status === "NEW" && (
                <span
                  className="text-[8px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{ background: `${t.color}18`, color: t.color }}
                >
                  New
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Root dispatcher ── */

export function AdaptiveDashboard({ domain }: { domain: string }) {
  const router = useRouter();
  const accent = useAccentHex();
  const [isNative] = useState(() => isNativeRuntime());
  const temporalWindow = useOnboardingStore((s) => s.temporalWindow);
  const vedicUseCase = useOnboardingStore((s) => s.vedicUseCase);
  const focusMode = useOnboardingStore((s) => s.focusMode);
  const dailyMinutes = useOnboardingStore((s) => s.dailyMinutes);
  const examDates = useOnboardingStore((s) => s.examDates);
  const { data } = useAdaptiveState(domain);
  const { data: liveSummary } = useAccountSummary();
  const live: AccountSummary | null = IS_MOCK ? null : (liveSummary ?? { streakDays: null, xp: null, questions: null, rank: null, accuracy: null, speed: null, percentile: null });
  const plan = useTodayPlan(domain).data;

  const temporalLabel = temporalWindow ? (TEMPORAL_LABELS[temporalWindow] ?? "") : "";

  const profile: JourneyProfile = {
    ...resolveJourneyProfile({
      domain,
      temporalWindow,
      vedicUseCase,
      focusMode,
      dailyMinutes: dailyMinutes ?? 30,
    }),
    accent,
  };

  const daysRemaining = (() => {
    const raw = examDates[domain];
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return Math.max(0, Math.ceil((parsed.getTime() - Date.now()) / 86400000));
  })();

  if (!data) {
    return (
      <div
        className="rounded-3xl border border-white/[0.08] px-5 py-6"
        style={{ background: GLASS_BG }}
      >
        <div className="h-4 w-40 rounded-xl bg-white/[0.06] animate-pulse mb-4" />
        <div className="size-[120px] rounded-full bg-white/[0.06] animate-pulse mx-auto" />
        <div className="h-3 w-3/4 rounded-xl bg-white/[0.05] animate-pulse mt-5 mx-auto" />
      </div>
    );
  }

  const topics = data.topics;
  const mastered = topics.filter((t) => t.mastery >= 80).length;
  const overall =
    topics.length > 0 ? Math.round(topics.reduce((s, t) => s + t.mastery, 0) / topics.length) : 0;
  const bestStreak = topics.reduce((m, t) => Math.max(m, t.bestStreak), 0);
  const hours = Math.max(0, Math.round((data.totalTimeSpent ?? 0) / 3600));

  const weak = plan?.weakTopic ?? null;
  const practice = plan?.practice ?? null;
  const mock = plan?.mock ?? null;
  const startRec = weak ?? practice;
  const startHref = startRec ? sprintHref(startRec, domain) : "/play/configure-sprint";

  const ctx: VariantCtx = {
    live,
    domain,
    router,
    data,
    profile,
    topics,
    mastered,
    overall,
    bestStreak,
    hours,
    weak,
    practice,
    mock,
    timeBudget: plan?.timeBudget ?? [],
    startHref,
    daysRemaining,
  };

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
      {/* Left column — mission + daily work */}
      <div className="md:col-span-3 flex flex-col gap-4 min-w-0">
        <ModeHeader profile={profile} temporalLabel={temporalLabel} daysRemaining={daysRemaining} />

        {profile.mode === "exam_ready" && <ExamReadyBlock ctx={ctx} />}
        {profile.mode === "gap_closer" && <GapCloserBlock ctx={ctx} />}
        {profile.mode === "discovery" && <DiscoveryBlock ctx={ctx} />}
        {profile.mode === "guided_learning" && <GuidedLearningBlock ctx={ctx} />}
        {profile.mode === "speed" && <SpeedTrainingBlock ctx={ctx} />}
        {profile.mode === "performance" && <PerformanceBlock ctx={ctx} />}
        {profile.mode === "brain_gym" && <BrainGymBlock ctx={ctx} />}
      </div>

      {/* Right column — live instruments */}
      <div className="md:col-span-2 flex flex-col gap-4 min-w-0">
        <StatsBlock ctx={ctx} />
      </div>

      {/* Daily budget + your topics — side by side on web, native keeps stacked on phones */}
      <div
        className={cn(
          "md:col-span-5 grid gap-4 items-start min-w-0",
          isNative ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2",
        )}
      >
        <TimeBudgetBlock ctx={ctx} />
        <TopicMasteryList ctx={ctx} />
      </div>
    </div>
  );
}
