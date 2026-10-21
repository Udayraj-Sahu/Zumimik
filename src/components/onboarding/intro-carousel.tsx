"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BG_MOSS, FOREST, GLASS_BORDER, LIME, LIME_LIGHT, LIME_TINT, PANEL } from "@/lib/theme-tokens";
import { useThemeStore } from "@/stores/theme-store";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Calendar,
  Flame,
  Layers,
  Megaphone,
  Play,
  Repeat,
  Skull,
  Star,
  Swords,
  TrendingUp,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StockVideoAd from "@/components/ads/stock-video-ad";
import { HeroCard } from "@/components/onboarding/hero-card";
import { FeatureList } from "@/components/onboarding/feature-list";
import { SpeedCard } from "@/components/onboarding/speed-card";
import { HabitProtocol } from "@/components/onboarding/habit-protocol";
import { ReviewCarousel } from "@/components/onboarding/review-carousel";
import { HowItWorks } from "@/components/onboarding/how-it-works";
import { ClearanceTiers } from "@/components/paywall/clearance-tiers";
import StopFeeding from "@/components/stop-feeding/StopFeeding";
import Manifesto from "@/components/manifesto/Manifesto";
import CompoundChart from "@/components/compound-chart/CompoundChart";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { DOMAIN_LABELS } from "@/lib/types/template";
import { useDashboardData } from "@/hooks/queries/use-dashboard";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Using real dashboard data (mock service, backend drop-in) ── */

function useLanes() {
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activePreps = useOnboardingStore((s) => s.activePreps);
  const planLane = useOnboardingStore((s) => s.planLane);
  const isVedic = targetExam === "vedic-math";

  const primary = planLane || targetExam || activePreps[0] || "cat";
  const others = activePreps.filter((p) => p !== primary && p !== "vedic-math");
  const hasSpeed = isVedic || activePreps.includes("vedic-math");

  return {
    primary,
    speedLane: hasSpeed,
    second: others[0],
  };
}

export type Lane = {
  id: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  tone: string;
};

export type IntroSlide = {
  id: string;
  num: string;
  tag: string;
  title: string;
  sub: string;
  Icon: LucideIcon;
  bare?: boolean;
  /** Renders the body full-bleed: the slide owns its own card surface. */
  full?: boolean;
  /**
   * Slide body. A function form receives the live active state so a body can
   * drive entrance work (e.g. chart draw-in) only while its slide is active.
   */
  body: ReactNode | ((isActive: boolean) => ReactNode);
};

/**
 * The Arena intro slide set, in order: hero, feature list, sponsor reel (video
 * only), speed, habit, reviews, how it works. Empty ones are skipped.
 */
export function useArenaIntroSlides(): { slides: IntroSlide[]; lanes: Lane[] } {
  const theme = useThemeStore((s) => s.theme);
  const { primary, speedLane, second } = useLanes();
  const { data } = useDashboardData(primary);

  const upcoming = data?.upcoming ?? [];
  const label = (id: string) => DOMAIN_LABELS[id] ?? id.toUpperCase();

  /* Every lane lives inside a single card, so this is one flat list. */
  const lanes: Lane[] = [];

  if (primary) {
    lanes.push({
      id: primary,
      title: `Lane 01 · ${label(primary)} Quant`,
      desc: "Full syllabus, predictive percentile, timed drills",
      Icon: TrendingUp,
      tone: "text-[var(--lime)] border-[var(--lime-40)] bg-[var(--lime-10)]",
    });
  }
  if (speedLane) {
    lanes.push({
      id: "vedic",
      title: "Lane 02 · Vedic Speed Math",
      desc: "Mental arithmetic bursts and reflex sprints",
      Icon: Zap,
      tone:
        theme === "light"
          ? "text-[var(--cyan)] border-cyan-400/40 bg-cyan-400/10"
          : "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
    });
  }
  if (second) {
    lanes.push({
      id: second,
      title: `Lane 03 · ${label(second)}`,
      desc: "Parallel prep lane synced to the same arena clock",
      Icon: Swords,
      tone:
        theme === "light"
          ? "text-[var(--fuchsia)] border-fuchsia-400/40 bg-fuchsia-400/10"
          : "text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-400/10",
    });
  }

  /** Slides: hero, feature list, sponsor reel (video only), up next. Empty ones are skipped. */
  const slides: IntroSlide[] = [
    ...(lanes.length > 0
      ? [
          {
            id: "lanes",
            num: "01",
            tag: "ACTIVE LANES",
            title: "",
            sub: "",
            Icon: Flame,
            full: true,
            body: <HeroCard />,
          },
        ]
      : []),
    {
      id: "features",
      num: "02",
      tag: "FEATURES",
      title: "",
      sub: "",
      Icon: Layers,
      full: true,
      body: <FeatureList />,
    },
    {
      id: "sponsor",
      num: "03",
      tag: "SPONSOR REEL",
      title: "",
      sub: "",
      Icon: Play,
      bare: true,
      body: (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--glass-border)]">
          <StockVideoAd
            src="/media/stock-ad.mp4"
            poster="/media/stock-ad-poster.webp"
            alt="Sponsor message"
            className="h-full w-full min-h-[160px]"
          />
        </div>
      ),
    },
    ...(upcoming.length > 0
      ? [
          {
            id: "next",
            num: "04",
            tag: "SPEED",
            title: "",
            sub: "",
            Icon: Calendar,
            full: true,
            body: <SpeedCard />,
          },
        ]
      : []),
    {
      id: "habit",
      num: "05",
      tag: "HABIT",
      title: "",
      sub: "",
      Icon: Repeat,
      full: true,
      body: <HabitProtocol />,
    },
    {
      id: "reviews",
      num: "06",
      tag: "REVIEWS",
      title: "",
      sub: "",
      Icon: Star,
      full: true,
      body: <ReviewCarousel />,
    },
    {
      id: "how-it-works",
      num: "07",
      tag: "HOW IT WORKS",
      title: "",
      sub: "",
      Icon: Workflow,
      full: true,
      body: <HowItWorks />,
    },
  ];

  return { slides, lanes };
}

/**
 * Pitch-only opening slide. It is a `full` slide (it owns its card surface),
 * so it carries no carousel header — only the carousel tag for its dot.
 */
const STOP_FEEDING_SLIDE: IntroSlide = {
  id: "stop-feeding",
  num: "01",
  tag: "TACTICAL EFFICIENCY",
  title: "",
  sub: "",
  Icon: Skull,
  full: true,
  body: <StopFeeding />,
};

/**
 * Pitch-only second slide. Like StopFeeding it is a `full` slide (it owns its
 * card surface), so it carries no carousel header — only the carousel tag for
 * its dot.
 */
const MANIFESTO_SLIDE: IntroSlide = {
  id: "manifesto",
  num: "02",
  tag: "MANIFESTO",
  title: "",
  sub: "",
  Icon: Megaphone,
  full: true,
  body: <Manifesto />,
};

/**
 * Pitch-only compound-interest chart slide. Like the two hooks before it, a
 * `full` slide that owns its card surface and drives its own entrance animation
 * from the live active state (never from being mounted).
 */
const COMPOUND_CHART_SLIDE: IntroSlide = {
  id: "compound-chart",
  num: "04",
  tag: "COMPOUND EFFECT",
  title: "",
  sub: "",
  Icon: TrendingUp,
  full: true,
  body: (isActive) => <CompoundChart isActive={isActive} />,
};

/** The Pitch-only slides, keyed by id so the order list below stays declarative. */
const PITCH_ONLY_SLIDES: Record<string, IntroSlide> = {
  "stop-feeding": STOP_FEEDING_SLIDE,
  manifesto: MANIFESTO_SLIDE,
  "compound-chart": COMPOUND_CHART_SLIDE,
};

/**
 * The Pitch slide order, by id. Arena slides are reused exactly as the Arena
 * flow defines them; the hero (lanes), feature list, speed card and habit
 * protocol are simply not listed. Curation (add / remove / reorder) is an edit
 * to this one list, so Arena's own slide set stays untouched.
 */
const PITCH_SLIDE_ORDER = [
  "stop-feeding",
  "manifesto",
  "sponsor",
  "compound-chart",
  "reviews",
  "how-it-works",
];

/**
 * The Pitch intro slide set: the StopFeeding hook, the Manifesto, the sponsor
 * reel, the compound-interest chart, reviews and how-it-works.
 */
export function usePitchIntroSlides(): { slides: IntroSlide[]; lanes: Lane[] } {
  const { slides, lanes } = useArenaIntroSlides();
  const available = new Map<string, IntroSlide>([
    ...Object.entries(PITCH_ONLY_SLIDES),
    ...slides.map((slide) => [slide.id, slide] as const),
  ]);

  return {
    slides: PITCH_SLIDE_ORDER.flatMap((id) => {
      const slide = available.get(id);
      return slide ? [slide] : [];
    }),
    lanes,
  };
}

type Tone = {
  card: string;
  panel: string;
  inset: string;
  soft: string;
  faint: string;
  rest: string;
  dot: string;
};

/** Theme-aware class sets — no raw colour literals in the markup. */
function useArenaTone(): Tone {
  const theme = useThemeStore((s) => s.theme);
  const light = theme === "light";
  return {
    card: light ? "border-black/[0.10] bg-black/[0.04]" : "border-white/[0.08] bg-black/25",
    panel: light ? "border-black/[0.10] bg-black/[0.04]" : "border-white/[0.07] bg-white/[0.02]",
    inset: light
      ? "border-black/[0.10] bg-black/[0.03]"
      : "border-[var(--lime-20)] bg-[var(--lime-04)]",
    soft: light ? "text-black/70" : "text-white/70",
    faint: light ? "text-black/60" : "text-white/60",
    rest: light ? "border-black/[0.10] bg-black/[0.04]" : "border-white/10 bg-black/30",
    dot: light ? "bg-black/10" : "bg-white/10",
  };
}

/**
 * The shared intro carousel: page background, shell, slide track, dots,
 * clearance tiers and the fixed CTA. `ArenaIntro` and `PitchIntro` both render
 * this so their layout, motion and interactions stay identical.
 */
export function IntroCarousel({
  slides,
  lanesCount,
  onClose,
  onSkip,
  preloaded = false,
  titleId,
  badge = "ARENA",
  heading = { lead: "The arena is", highlight: "live." },
  layout = "stacked",
}: {
  slides: IntroSlide[];
  lanesCount: number;
  onClose: () => void;
  /** "Skip for now": dismiss the whole intro with no goal recorded. */
  onSkip?: () => void;
  preloaded?: boolean;
  /** a11y id of the hook heading, so each intro keeps its own labelled trigger. */
  titleId: string;
  /** Pill label above the hero heading. */
  badge?: string;
  /** Hero heading: plain lead text plus the gradient-highlighted tail. */
  heading?: { lead: string; highlight: string };
  /**
   * Shell arrangement. `stacked` (default) is the single narrow column used by
   * Pitch. `split` lays the carousel and the clearance tiers side by side from
   * `lg` up — tiers on the left, carousel on the right — and keeps the stacked
   * column below that so mobile and tablet stay untouched.
   */
  layout?: "stacked" | "split";
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const split = layout === "split";

  const theme = useThemeStore((s) => s.theme);
  const tone = useArenaTone();
  const [active, setActive] = useState(0);
  const [tier, setTier] = useState("dual-lane");

  const TOTAL = slides.length;

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(TOTAL - 1, index));
      setActive(clamped);
      const track = trackRef.current;
      const slide = track?.children[clamped] as HTMLElement | undefined;
      if (!track || !slide) return;
      const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior });
    },
    [TOTAL],
  );

  /** Keeps dots in sync when the user swipes by hand. */
  const onTrackScroll = useCallback(() => {
    const track = trackRef.current;
    const slide = track?.firstElementChild as HTMLElement | null;
    if (!track || !slide || slide.offsetWidth === 0) return;
    const index = Math.round(
      (track.scrollLeft + track.offsetLeft - slide.offsetLeft) / slide.offsetWidth,
    );
    setActive((prev) => (prev === index ? prev : Math.max(0, Math.min(TOTAL - 1, index))));
  }, [TOTAL]);

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
  }, [preloaded, active, goTo]);

  useLayoutEffect(() => {
    if (preloaded) return;
    document.body.style.overflow = "hidden";
    if (overlayRef.current) {
      overlayRef.current.animate(
        [{ transform: "translateX(100%)" }, { transform: "translateX(0%)" }],
        {
          duration: 320,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [preloaded]);

  const exit = useCallback((cb: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = overlayRef.current;
    if (!el) return cb();
    el.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], {
      duration: 280,
      easing: "cubic-bezier(0.55, 0, 0.55, 0.2)",
      fill: "forwards",
    }).addEventListener("finish", cb, { once: true });
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      data-theme-scope
      data-intro-layout={layout}
      className={cn(
        "fixed inset-0 z-[var(--z-intro)] flex overflow-hidden flex-col sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm",
        preloaded && "invisible pointer-events-none",
        theme === "light" && "light",
      )}
      role="dialog"
      aria-modal="true"
      aria-hidden={preloaded || undefined}
      aria-labelledby={titleId}
    >
      <div
        className={cn(
          "relative flex h-full w-full shrink-0 flex-col sm:h-auto sm:max-h-[92vh] sm:max-w-md sm:overflow-hidden sm:rounded-3xl sm:border sm:shadow-2xl",
          split && "lg:max-w-5xl xl:max-w-[1180px]",
        )}
        style={{
          borderColor: GLASS_BORDER,
          background:
            theme === "light"
              ? "linear-gradient(180deg, var(--screen-tint) 0%, var(--overlay-solid) 100%)"
              : `radial-gradient(130% 90% at 50% 0%, ${PANEL} 0%, ${BG_MOSS} 48%, ${FOREST} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: "radial-gradient(var(--glass-045) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        {/* brand + hero */}
        <div className="relative shrink-0 px-5 pt-[max(0.75rem,var(--sat))] text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--lime-25)] bg-[var(--lime-07)] px-3.5 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--lime)] opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--lime)]" />
            </span>
            <span className="text-[10px] font-bold tracking-[0.22em] text-[var(--lime)]">{badge}</span>
          </div>
          <h1
            id={titleId}
            className="mt-2 text-[clamp(21px,6vw,28px)] font-extrabold uppercase leading-[1.02] tracking-tight text-foreground"
          >
            {heading.lead}{" "}
            <span
              className="text-transparent"
              style={{
                background: `linear-gradient(90deg, ${LIME}, ${LIME_TINT})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              {heading.highlight}
            </span>
          </h1>
        </div>

        {/* panels: stacked column by default; side-by-side from lg in split mode */}
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col",
            split && "lg:flex-row-reverse",
          )}
        >
          <section
            aria-roledescription="carousel"
            aria-label="Arena overview"
            className={cn(
              "flex min-h-0 flex-1 flex-col px-5 pt-3",
              split && "lg:min-w-0 lg:px-6 lg:pt-4 lg:pb-2",
            )}
          >
            <div
              ref={trackRef}
              onScroll={onTrackScroll}
              className="flex min-h-0 flex-1 snap-x snap-mandatory items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {slides.map((card, i) => {
                const Icon = card.Icon;
                return (
                  <article
                    key={card.id}
                    aria-label={`${i + 1} of ${TOTAL}: ${card.tag}`}
                    aria-hidden={i !== active ? "true" : undefined}
                    className={cn(
                      "flex w-full shrink-0 snap-start snap-always flex-col overflow-hidden",
                      card.bare && "self-stretch",
                    )}
                  >
                    <div
                      className={cn(
                        "flex min-h-0 flex-1 flex-col rounded-[18px] border p-2.5",
                        tone.card,
                        card.full && "border-0 bg-transparent p-0",
                      )}
                    >
                      {!card.bare && !card.full && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black leading-none text-[var(--lime)]">
                              {card.num}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[8px] font-bold uppercase tracking-[0.16em] text-foreground">
                              {card.tag}
                            </span>
                            <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-[var(--lime-25)] bg-[var(--lime-08)] text-[var(--lime)]">
                              <Icon size={12} />
                            </span>
                          </div>

                          {card.title && (
                            <h2 className="mt-3 text-[14px] font-bold uppercase leading-[1.15] tracking-[-0.01em] text-foreground">
                              {card.title}
                            </h2>
                          )}
                          {card.sub && (
                            <p className={cn("mt-1.5 text-[10px] leading-snug", tone.soft)}>{card.sub}</p>
                          )}
                        </>
                      )}

                      <div className={cn("flex min-h-0 flex-1 flex-col", card.bare || card.full ? "" : "mt-4")}>
                        {typeof card.body === "function" ? card.body(i === active) : card.body}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* dots */}
            <nav className="mt-2.5 flex shrink-0 items-center justify-center gap-2">
              {slides.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1} of ${TOTAL}: ${c.tag}`}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === active ? "w-5 bg-[var(--lime)]" : "w-1.5 bg-white/25",
                  )}
                />
              ))}
            </nav>
          </section>

          <div
            className={cn(
              "relative mx-auto flex w-full max-w-[400px] shrink-0 flex-col px-5 pb-[max(0.5rem,var(--sab))] pt-0 sm:max-w-none max-[359px]:px-4",
              split && "lg:mx-0 lg:w-[460px] lg:min-h-0 lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-6 lg:pb-6 lg:pt-4 xl:w-[520px]",
            )}
          >
            <div className={cn(split && "lg:my-auto")}>
              {/* clearance tiers: replaces the stock video, mirrors the paywall */}
              <div className="mt-3 shrink-0">
                <ClearanceTiers value={tier} onChange={setTier} />
              </div>

              {/* fixed CTA */}
              <footer className="mt-2.5 shrink-0">
                <button
                  onClick={() => exit(onClose)}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-[12px] font-bold tracking-[0.12em] text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(90deg, ${LIME}, ${LIME_LIGHT})`,
                    boxShadow: "0 10px 34px var(--lime-mid-25), 0 1px 0 var(--glass-25) inset",
                  }}
                >
                  ENTER {lanesCount > 1 ? "MULTI-LANE" : "YOUR"} ARENA
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => exit(onSkip ?? onClose)}
                  className={cn(
                    "mx-auto mt-2 block text-[10px] underline-offset-2 transition-colors hover:text-muted-foreground hover:underline",
                    tone.faint,
                  )}
                >
                  Skip for now
                </button>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
