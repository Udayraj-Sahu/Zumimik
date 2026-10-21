"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BG_2, FOREST_2, LIME, LIME_LIGHT, LIME_MID_2, PANEL_2 } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Calculator,
  Check,
  CheckCircle2,
  FileText,
  Flame,
  Flower2,
  Moon,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Accent tokens — every colour resolves through app theme variables.  */
/* ------------------------------------------------------------------ */

type Accent = "lime" | "emerald" | "violet";

const ACCENT: Record<Accent, { text: string; border: string; bg: string; fill: string }> = {
  lime: {
    text: "text-[var(--lime)]",
    border: "border-[var(--lime-20)]",
    bg: "bg-[var(--lime-07)]",
    fill: "bg-[var(--lime)]",
  },
  emerald: {
    text: "text-[var(--emerald)]",
    border: "border-[var(--emerald-20)]",
    bg: "bg-[var(--emerald-08)]",
    fill: "bg-[var(--emerald)]",
  },
  violet: {
    text: "text-[var(--violet)]",
    border: "border-[var(--violet-deep-28)]",
    bg: "bg-[var(--violet-deep-14)]",
    fill: "bg-[var(--violet)]",
  },
};

/* ------------------------------------------------------------------ */
/* Commercial copy                                                    */
/* Not yet backed by app pricing or a shipped guarantee — keep these  */
/* in one place so they can be edited or removed without touching JSX. */
/* ------------------------------------------------------------------ */

const CTA = {
  badge: "HOUSEHOLD PASS ACTIVE",
  offer: "30% OFF EXTRA SEATS",
  label: "SET UP FAMILY SEATS",
} as const;

/* ------------------------------------------------------------------ */
/* Slide model                                                        */
/* ------------------------------------------------------------------ */

const SLIDES = [
  { num: "01", label: "AGES 6–12", tag: "DAILY HABIT", accent: "emerald", title: "AGES 6–12: THREE SKILLS, ONE PLAY HABIT" },
  { num: "02", label: "DIFFERENTIATOR", tag: "INSIGHT ENGINE", accent: "emerald", title: "PARENT INSIGHT: SEE THE WHOLE PICTURE" },
  { num: "03", label: "COOPERATIVE DOJO", tag: "SHARED JOY", accent: "violet", title: "FAMILY MODE: LEARN TOGETHER" },
  { num: "04", label: "EXECUTIVE EXAM TRACK", tag: "CAT · GMAT · GRE", accent: "lime", title: "AGES 16+: ZUZUMIK" },
  { num: "05", label: "PROCESS", tag: "3-STEP LOOP", accent: "lime", title: "HOW IT WORKS" },
] as const satisfies readonly { num: string; label: string; tag: string; accent: Accent; title: string }[];

const TOTAL = SLIDES.length;

/* ------------------------------------------------------------------ */
/* Theme-aware surfaces (no hardcoded white/black)                     */
/* ------------------------------------------------------------------ */

function useIntroTone() {
  const theme = useThemeStore((s) => s.theme);
  const light = theme === "light";
  return {
    card: light
      ? "border-black/[0.10] bg-black/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]"
      : "keep-white border-white/[0.07] bg-white/[0.03]",
    panel: light ? "border-black/[0.08] bg-black/[0.03]" : "border-white/[0.06] bg-white/[0.02]",
    inset: light ? "border-black/[0.10] bg-black/[0.04]" : "keep-white border-white/[0.06] bg-black/25",
    soft: light ? "text-black/70" : "text-white/70",
    faint: light ? "text-black/55" : "text-white/60",
    rest: light
      ? "border-black/[0.12] bg-black/[0.04] text-black/70"
      : "border-white/[0.08] bg-black/25 text-white/70",
    dot: light ? "bg-black/25" : "bg-white/25",
    pill: light
      ? "border-black/[0.12] bg-black/[0.05] text-black/65"
      : "keep-white border-white/10 bg-black/30 text-muted-foreground",
    pillMuted: light ? "border-black/[0.10] text-black/55" : "keep-white border-white/[0.08] text-muted-foreground",
  };
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Primitives                                                         */
/* ------------------------------------------------------------------ */

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anim = el.animate(
      [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 500, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
    );
    return () => anim.cancel();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function GlowBall({ className }: { className: string }) {
  return <div aria-hidden className={cn("pointer-events-none absolute rounded-full blur-[90px]", className)} style={{ willChange: "transform" }} />;
}

function SlideHeader({ num, label, tag, accent }: { num: string; label: string; tag?: string; accent: Accent }) {
  const a = ACCENT[accent];
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-[15px] font-bold leading-none", a.text)}>{num}</span>
      <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-foreground">{label}</span>
      {tag && <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider", a.border, a.bg, a.text)}>{tag}</span>}
    </div>
  );
}

/**
 * The main slide card. The `01 / AGES 6–12 / DAILY HABIT` header and the text
 * below it form the card head — every other card on the slide sits inside it.
 */
function SlideMainCard({
  slide,
  sub,
  children,
}: {
  slide: (typeof SLIDES)[number];
  sub: string;
  children: React.ReactNode;
}) {
  const tone = useIntroTone();
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border p-3", tone.card)}>
      <SlideHeader num={slide.num} label={slide.label} tag={slide.tag} accent={slide.accent} />
      <h2 className="mt-2 text-[16px] font-bold uppercase leading-[1.1] tracking-[-0.02em] text-foreground">
        {slide.title}
      </h2>
      <p className={cn("mt-1.5 text-[10.5px] leading-relaxed", tone.soft)}>{sub}</p>

      <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 — three skills, one play habit                            */
/* ------------------------------------------------------------------ */

const SKILLS: { name: string; tag: string; accent: Accent; desc: string }[] = [
  {
    name: "QUANT",
    tag: "VEDIC & SPEED",
    accent: "lime",
    desc: "Number sense, mental math and pattern speed through printable Vedic grids and 5-minute dot battles.",
  },
  {
    name: "LOGIC",
    tag: "REASONING",
    accent: "emerald",
    desc: "Sequences, puzzles and “what comes next” challenges that build reasoning and working memory.",
  },
  {
    name: "VERBAL",
    tag: "VOCAB & SENSE",
    accent: "violet",
    desc: "Word games, analogies and reading-for-meaning drills that build vocabulary and clear expression.",
  },
];

const TABS: { small: string; label: string; accent: Accent; target: number }[] = [
  { small: "AGES 6–12", label: "Quant · Logic · Verbal", accent: "emerald", target: 0 },
  { small: "AGES 10–15", label: "Co-op", accent: "violet", target: 2 },
  { small: "AGES 16+", label: "Exam Prep", accent: "lime", target: 3 },
];

function Slide1() {
  const tone = useIntroTone();
  return (
    <SlideMainCard
      slide={SLIDES[0]}
        sub="Not school lessons. Short games that build the thinking skills school doesn’t measure."
      >

      {SKILLS.map((s) => {
        const a = ACCENT[s.accent];
        const Icon = s.name === "QUANT" ? Calculator : s.name === "LOGIC" ? Network : BookOpen;
        return (
          <div key={s.name} className={cn("rounded-2xl border p-2.5", tone.panel, a.border)}>
            <div className="flex items-center gap-2">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", a.bg, a.text)}>
                <Icon size={14} />
              </span>
              <span className="text-[11.5px] font-bold tracking-wide text-foreground">{s.name}</span>
              <span className={cn("ml-auto rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", a.border, a.bg, a.text)}>
                {s.tag}
              </span>
            </div>
            <p className={cn("mt-1.5 text-[9.5px] leading-snug", tone.soft)}>{s.desc}</p>
          </div>
        );
      })}
    </SlideMainCard>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 — parent insight                                           */
/* ------------------------------------------------------------------ */

/** Sections the app actually serves, from the CAT/GMAT topic breakdown. */
const SECTIONS: { name: string; value: number; accent: Accent }[] = [
  { name: "QUANTITATIVE APTITUDE", value: 92, accent: "lime" },
  { name: "PROBLEM SOLVING", value: 85, accent: "lime" },
  { name: "READING COMPREHENSION", value: 60, accent: "violet" },
];

const PARENT_TOOLS: { title: string; body: string; accent: Accent }[] = [
  {
    title: "FOUR NUMBERS THAT MATTER",
    body: "Accuracy, questions attempted, percentile and speed — plain figures a parent reads in one glance.",
    accent: "lime",
  },
  {
    title: "WEAKEST SECTION FIRST",
    body: "The next drill comes from the lowest section, not the one they already ace.",
    accent: "violet",
  },
];

function Slide2() {
  const tone = useIntroTone();
  return (
    <SlideMainCard
      slide={SLIDES[1]}
        sub="Know where your child is strong, where they’re stuck, and what to try next."
      >

      <div className={cn("rounded-2xl border p-2.5", tone.panel)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-foreground">SKILL SNAPSHOT</span>
          <span className={cn("text-[7px] font-bold uppercase tracking-[0.14em]", ACCENT.emerald.text)}>
            LIVE TELEMETRY
          </span>
        </div>

        <div className="mt-2.5 space-y-2">
          {SECTIONS.map((b) => {
            const a = ACCENT[b.accent];
            return (
              <div key={b.name}>
                <div className={cn("flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.1em]", a.text)}>
                  <span>{b.name}</span>
                  <span>{b.value}%</span>
                </div>
                <div className={cn("mt-1 h-1.5 overflow-hidden rounded-full", tone.dot)}>
                  <div className={cn("h-full rounded-full", a.fill)} style={{ width: `${b.value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {PARENT_TOOLS.map((t) => {
        const a = ACCENT[t.accent];
        return (
          <div key={t.title} className={cn("rounded-2xl border p-2.5", tone.panel, a.border)}>
            <div className={cn("text-[8px] font-bold uppercase tracking-[0.14em]", a.text)}>{t.title}</div>
            <p className={cn("mt-1 text-[9.5px] leading-snug", tone.soft)}>{t.body}</p>
          </div>
        );
      })}
    </SlideMainCard>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 3 — family mode                                              */
/* ------------------------------------------------------------------ */

const SPARRING: { title: string; body: string; accent: Accent; icon: React.ReactNode }[] = [
  {
    title: "STREAKS THAT SURVIVE REAL LIFE",
    body: "The daily streak is the one thing the whole family can see. Miss a day and it resets.",
    accent: "lime",
    icon: <Flame size={14} />,
  },
  {
    title: "BADGES WORTH SHOWING OFF",
    body: "Streak Champion, Accuracy Master, Speed Demon, Perfect Round, Veteran.",
    accent: "emerald",
    icon: <Award size={14} />,
  },
  {
    title: "CLUBS WITH REAL PEOPLE IN THEM",
    body: "CAT Warriors, GMAT Strategy Circle, Quant Speed Demons — moderated groups, not a comment section.",
    accent: "violet",
    icon: <Users size={14} />,
  },
];

function Slide3() {
  const tone = useIntroTone();
  return (
    <SlideMainCard
      slide={SLIDES[2]}
        sub="Turn practice into something the whole family looks forward to."
      >

      {SPARRING.map((s) => {
        const a = ACCENT[s.accent];
        return (
          <div key={s.title} className={cn("rounded-2xl border p-3", tone.panel, a.border)}>
            <div className={cn("flex items-center gap-2 text-[11px] font-bold tracking-wide", a.text)}>
              {s.icon}
              {s.title}
            </div>
            <p className={cn("mt-2 text-[10.5px] leading-relaxed", tone.soft)}>{s.body}</p>
          </div>
        );
      })}
    </SlideMainCard>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 4 — zuzumik                                               */
/* ------------------------------------------------------------------ */

const PILLARS: { title: string; value: string; sub: string; accent: Accent; icon: React.ReactNode }[] = [
  { title: "SPEED", value: "< 1.2s", sub: "Sub-1.2s rapid reflex", accent: "lime", icon: <Zap size={13} /> },
  { title: "ACCURACY", value: "99%+", sub: "99% verified mastery", accent: "emerald", icon: <CheckCircle2 size={13} /> },
  { title: "REASONING", value: "Agile Logic", sub: "Pattern & logic agility", accent: "violet", icon: <Brain size={13} /> },
  { title: "COMPOSURE", value: "Calm Focus", sub: "Calm under time pressure", accent: "lime", icon: <Flower2 size={13} /> },
];

const PAPERS: { title: string; kind: string; accent: Accent }[] = [
  { title: "CAT 2025 SLOT 1 QUESTION PAPER", kind: "FULL MOCK", accent: "lime" },
  { title: "GMAT FOCUS OFFICIAL MOCK", kind: "FULL MOCK", accent: "emerald" },
];

function Slide4() {
  const tone = useIntroTone();
  return (
    <SlideMainCard
      slide={SLIDES[3]}
        sub="Same three skills, now at exam speed: quant, logical reasoning, verbal ability."
      >

      <div className={cn("rounded-2xl border p-2.5", tone.panel)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-foreground">
            4-PILLAR COGNITIVE STATE ARCHITECTURE
          </span>
          <span className={cn("shrink-0 text-[7px] font-bold uppercase tracking-[0.14em]", ACCENT.lime.text)}>
            CALIBRATED HUD
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {PILLARS.map((p) => {
            const a = ACCENT[p.accent];
            return (
              <div key={p.title} className={cn("rounded-xl border p-2", tone.card)}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-[7px] font-bold uppercase tracking-[0.14em]", tone.faint)}>{p.title}</span>
                  <span className={a.text}>{p.icon}</span>
                </div>
                <div className={cn("mt-1 text-[14px] font-bold leading-none", a.text)}>{p.value}</div>
                <div className={cn("mt-1 text-[8px] leading-snug", tone.faint)}>{p.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn("rounded-2xl border p-2.5", tone.panel)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-foreground">
            REAL PAPERS, REAL FORMATS
          </span>
          <span className={cn("text-[7px] font-bold uppercase tracking-[0.14em]", ACCENT.emerald.text)}>
            IN THE LIBRARY
          </span>
        </div>

        <div className="mt-2 space-y-1.5">
          {PAPERS.map((p) => {
            const a = ACCENT[p.accent];
            return (
              <div
                key={p.title}
                className={cn("flex items-center gap-2 rounded-xl border p-2", a.border, tone.panel)}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg", a.bg, a.text)}>
                  <FileText size={12} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-foreground">
                  {p.title}
                </span>
                <span className={cn("shrink-0 text-[7px] font-bold uppercase tracking-[0.12em]", a.text)}>
                  {p.kind}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SlideMainCard>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 5 — how it works                                             */
/* ------------------------------------------------------------------ */

const STEPS: { n: number; title: string; body: string; accent: Accent; icon: React.ReactNode }[] = [
  { n: 1, title: "1. PLAY", body: "A quick round or a speed drill — 5 minutes is a real session.", accent: "emerald", icon: <ArrowDown size={14} /> },
  { n: 2, title: "2. SCAN", body: "Accuracy, questions, percentile and speed land on one screen.", accent: "violet", icon: <ArrowDown size={14} /> },
  { n: 3, title: "3. IMPROVE", body: "Next round targets the lowest section. Missed questions resurface.", accent: "lime", icon: <Check size={14} /> },
];

const TRUST: { label: string; accent: Accent; icon: React.ReactNode }[] = [
  { label: "DPDP & COPPA compliant", accent: "lime", icon: <ShieldCheck size={14} /> },
  { label: "Ad-free", accent: "emerald", icon: <Sparkles size={14} /> },
  { label: "Works offline", accent: "violet", icon: <WifiOff size={14} /> },
];

function Slide5() {
  const tone = useIntroTone();
  return (
    <SlideMainCard
      slide={SLIDES[4]}
        sub="A lightweight habit that turns daily play into lasting cognitive growth."
      >

      {STEPS.map((s) => {
        const a = ACCENT[s.accent];
        return (
          <div key={s.n} className={cn("flex items-center gap-3 rounded-2xl border p-3", tone.panel)}>
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border text-[12px] font-bold", a.bg, a.text, a.border)}>
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold tracking-wide text-foreground">{s.title}</div>
              <p className={cn("mt-0.5 text-[10px] leading-snug", tone.soft)}>{s.body}</p>
            </div>
            <span className={a.text}>{s.icon}</span>
          </div>
        );
      })}

      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border p-3", tone.inset)}>
        {TRUST.map((t) => {
          const a = ACCENT[t.accent];
          return (
            <span key={t.label} className={cn("inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider", a.text)}>
              {t.icon}
              {t.label}
            </span>
          );
        })}
      </div>
    </SlideMainCard>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function FamilyIntro({
  onDone,
  onClose,
  onSkip,
  preloaded = false,
}: {
  onDone: () => void;
  onClose: () => void;
  /** "Skip for now": dismiss the whole intro with no goal recorded. */
  onSkip?: () => void;
  preloaded?: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const theme = useThemeStore((s) => s.theme);
  const [active, setActive] = useState(0);
  const tone = useIntroTone();

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(TOTAL - 1, index));
    setActive(clamped);
    const track = trackRef.current;
    const slide = track?.children[clamped] as HTMLElement | undefined;
    if (!track || !slide) return;
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior });
  }, []);

  /** Keeps dots in sync when the user swipes by hand. */
  const onTrackScroll = useCallback(() => {
    const track = trackRef.current;
    const slide = track?.firstElementChild as HTMLElement | null;
    if (!track || !slide || slide.offsetWidth === 0) return;
    const index = Math.round((track.scrollLeft + track.offsetLeft - slide.offsetLeft) / slide.offsetWidth);
    setActive((prev) => (prev === index ? prev : Math.max(0, Math.min(TOTAL - 1, index))));
  }, []);

  useEffect(() => {
    if (preloaded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(active + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(active - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, preloaded]);

  useLayoutEffect(() => {
    if (preloaded) return;
    document.body.style.overflow = "hidden";
    if (overlayRef.current) {
      overlayRef.current.animate(
        [{ transform: "translateX(100%)" }, { transform: "translateX(0%)" }],
        { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [preloaded]);

  const exit = (cb: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = overlayRef.current;
    if (!el) return cb();
    el.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], {
      duration: 280,
      easing: "cubic-bezier(0.55, 0, 0.55, 0.2)",
      fill: "forwards",
    }).addEventListener(
      "finish",
      () => {
        setTimeout(cb, 60);
      },
      { once: true },
    );
  };

  return createPortal(
    <div
      ref={overlayRef}
      data-theme-scope
      className={cn(
        "fixed inset-0 z-[var(--z-intro)] overflow-hidden sm:flex sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm",
        preloaded && "invisible pointer-events-none",
        theme === "light" && "light",
      )}
      role="dialog"
      aria-modal="true"
      aria-hidden={preloaded || undefined}
      aria-labelledby="family-hook-title"
    >
      <div
        className="relative flex h-full w-full flex-col sm:min-h-0 sm:max-w-md sm:max-h-[92vh] sm:rounded-3xl sm:border sm:border-white/[0.06] sm:shadow-2xl"
        style={{
          background:
            theme === "light"
              ? "linear-gradient(180deg, var(--screen-tint) 0%, var(--overlay-solid) 100%)"
              : `radial-gradient(120% 90% at 50% 0%, ${PANEL_2} 0%, ${BG_2} 46%, ${FOREST_2} 100%)`,
        }}
      >
        <GlowBall className="left-1/2 top-[-70px] h-56 w-56 -translate-x-1/2 bg-[var(--lime-14)]" />
        <GlowBall className="right-[-60px] top-[38%] h-52 w-52 bg-[var(--emerald-10)]" />
        <GlowBall className="bottom-[12%] left-[-70px] h-52 w-52 bg-[var(--violet-deep-14)]" />

        <div className="relative mx-auto flex min-h-0 w-full max-w-[400px] flex-1 flex-col px-5 pb-[max(1rem,var(--sab))] pt-[max(1rem,var(--sat))] max-[359px]:px-4">
          {/* fixed heading */}
          <header className="shrink-0 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lime-25)] bg-[var(--lime-07)] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--lime)]">
              <Sparkles size={11} /> FAMILY HUB · EARLY PREVIEW
            </span>
            <h1
              id="family-hook-title"
              className="mt-3 text-[24px] font-extrabold uppercase leading-[1.02] tracking-[-0.03em] text-foreground sm:text-[30px]"
            >
              Know how your child thinks.
              <br />
              <span
                className="text-transparent"
                style={{
                  background: `linear-gradient(90deg,${LIME},${LIME_MID_2})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                Grow it through play.
              </span>
            </h1>
            <p className={cn("mx-auto mt-2 max-w-[330px] text-[11px] leading-relaxed", tone.soft)}>
              Quick games and family challenges that build quant, logic and verbal skills.
            </p>

            <div className="mt-3 flex gap-1.5">
              {TABS.map((t) => {
                const a = ACCENT[t.accent];
                const isOn = active === t.target;
                return (
                  <button
                    key={t.small}
                    type="button"
                    onClick={() => goTo(t.target)}
                    aria-current={isOn ? "true" : undefined}
                    className={cn(
                      "flex-1 rounded-xl border px-2 py-1.5 text-left transition-colors",
                      isOn ? cn(a.border, a.bg) : tone.pillMuted,
                    )}
                  >
                    <span className={cn("block text-[7px] font-bold uppercase tracking-[0.14em]", isOn ? a.text : "opacity-70")}>
                      {t.small}
                    </span>
                    <span className="block truncate text-[9.5px] font-semibold text-foreground">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {/* carousel */}
          <section
            className="mt-4 flex min-h-0 flex-1 flex-col"
            role="group"
            aria-roledescription="carousel"
            aria-label="Family Hub preview"
          >
            <div
              ref={trackRef}
              onScroll={onTrackScroll}
              className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {SLIDES.map((s, i) => (
                <article
                  key={s.num}
                  className="flex w-full shrink-0 snap-start snap-always flex-col gap-2 overflow-hidden"
                >
                  {i === 0 && <Slide1 />}
                  {i === 1 && <Slide2 />}
                  {i === 2 && <Slide3 />}
                  {i === 3 && <Slide4 />}
                  {i === 4 && <Slide5 />}
                </article>
              ))}
            </div>

            <nav className="flex shrink-0 items-center justify-center py-2.5" aria-label="Slides">
              {SLIDES.map((s, i) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1} of ${TOTAL}: ${s.label}`}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "mx-1 h-2 rounded-full transition-all duration-200",
                    i === active
                      ? "w-6 bg-[var(--lime)] shadow-[0_0_10px_var(--lime-mid-25)]"
                      : cn("w-2", tone.dot),
                  )}
                />
              ))}
            </nav>
          </section>

          {/* fixed CTA */}
          <footer className="shrink-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--lime)]">
                <span className="size-1.5 rounded-full bg-[var(--lime)] shadow-[0_0_8px_var(--lime-mid-25)]" />
                {CTA.badge}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--emerald)]">
                {CTA.offer}
              </span>
            </div>

            <button
              onClick={() => exit(onDone)}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] py-4 text-[12px] font-bold tracking-[0.12em] text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.98]"
              style={{
                background: `linear-gradient(90deg, ${LIME}, ${LIME_LIGHT})`,
                boxShadow: "0 10px 34px var(--lime-mid-28), 0 1px 0 var(--glass-25) inset",
              }}
            >
              {CTA.label}
              <ArrowRight size={14} />
            </button>

            <div className="mt-3">
              <button
                onClick={() => exit(onSkip ?? onClose)}
                className={cn(
                  "mx-auto flex items-center gap-1.5 text-[10px] underline-offset-2 transition-colors hover:text-muted-foreground hover:underline",
                  tone.faint,
                )}
              >
                <Moon size={11} /> Skip for now
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
