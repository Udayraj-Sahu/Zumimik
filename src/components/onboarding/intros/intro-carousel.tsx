"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BG_MOSS, FOREST, GLASS_BORDER, PANEL } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { Steps } from "./steps";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  Flame,
  Megaphone,
  Play,
  Skull,
  Star,
  Swords,
  Timer,
  TrendingUp,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StockVideoAd from "@/components/ads/stock-video-ad";
import FirstGhostCta from "@/components/first-ghost-cta/FirstGhostCta";
import { ReviewCarousel } from "@/components/onboarding/slides/review-carousel";
import { HowItWorks } from "@/components/onboarding/slides/how-it-works";
import { ClearanceTiers } from "@/components/paywall/clearance-tiers";
import AlgorithmPitch from "@/components/algorithm-pitch/AlgorithmPitch";
import FirstMoveTimes from "@/components/first-move-times/FirstMoveTimes";
import TrapResults from "@/components/trap-results/TrapResults";
import StallTimer from "@/components/stall-timer/StallTimer";
import TrialTimeline from "@/components/trial-timeline/TrialTimeline";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { DOMAIN_LABELS } from "@/lib/types/template";

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
   * Stretches the slide to the full height of the track instead of letting it
   * size to its content. A `full` slide whose body can shrink (a chart that
   * flexes, a card that scrolls internally) sets this so the slide never
   * overflows the carousel and forces the page to scroll.
   */
  fill?: boolean;
  /**
   * Slide body. A function form receives the live active state so a body can
   * drive entrance work (e.g. chart draw-in) only while its slide is active.
   */
  body: ReactNode | ((isActive: boolean) => ReactNode);
};

/**
 * The Arena intro slide set, in order: the first-three-seconds hook, the move
 * chart, the sponsor reel (video only), the trap results, the stall timer, the
 * reviews and how it works. The hook is skipped until a lane exists.
 */
export function useArenaIntroSlides(): { slides: IntroSlide[]; lanes: Lane[] } {
  const theme = useThemeStore((s) => s.theme);
  const { primary, speedLane, second } = useLanes();

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

  /**
   * Slides: the first-three-seconds hook, then the four Pitch slides (move,
   * sponsor reel, trap results, stall timer) and finally the reviews and the
   * how-it-works walkthrough. The hook and the review/walkthrough slides are
   * skipped when they have nothing to show.
   */
  const slides: IntroSlide[] = [
    ...(lanes.length > 0
      ? [
          {
            id: "lanes",
            num: "01",
            tag: "FIRST 3 SECONDS",
            title: "",
            sub: "",
            Icon: Flame,
            full: true,
            fill: true,
            body: () => (
              <FirstGhostCta
                title="Win the first 3 seconds."
                tagline="Quant. LRDI. VARC. One arena."
                stats={[
                  { value: "9 min", label: "lost to stalls", tone: "bad" },
                  { value: "3 min", label: "after the radar", tone: "good" },
                ]}
                points={[
                  "Know exactly where your seconds leak.",
                  "See the trap that fooled the field.",
                  "Race the ghost until you\u2019re the benchmark.",
                ]}
                note="Works offline. Sample data shown."
              />
            ),
          },
        ]
      : []),
    FIRST_MOVE_SLIDE,
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
    TRAP_RESULTS_SLIDE,
    STALL_TIMER_SLIDE,
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
  fill: true,
  body: <AlgorithmPitch />,
};

/**
 * Pitch-only second slide. Like AlgorithmPitch it is a `full` slide (it owns its
 * card surface), so it carries no carousel header — only the carousel tag for
 * its dot.
 */
const FIRST_MOVE_SLIDE: IntroSlide = {
  id: "manifesto",
  num: "02",
  tag: "FIRST MOVE",
  title: "",
  sub: "",
  Icon: Megaphone,
  full: true,
  fill: true,
  body: <FirstMoveTimes />,
};

/**
 * Pitch-only trap-results slide. Like the hooks before it, a `full` slide that
 * owns its card surface and drives its own bar animation from mount.
 */
const TRAP_RESULTS_SLIDE: IntroSlide = {
  id: "compound-chart",
  num: "04",
  tag: "THE TRAP",
  title: "",
  sub: "",
  Icon: TrendingUp,
  full: true,
  fill: true,
  body: <TrapResults />,
};

/**
 * Pitch-only stall-timer slide. Like the hooks before it, a `full` slide that
 * owns its card surface; the body receives the live slide state so the
 * count-up only runs while this slide is the active one.
 */
const STALL_TIMER_SLIDE: IntroSlide = {
  id: "stall-timer",
  num: "05",
  tag: "THE STALL",
  title: "",
  sub: "",
  Icon: Timer,
  full: true,
  fill: true,
  body: (isActive) => <StallTimer isActive={isActive} />,
};

/**
 * Pitch-only trial-timeline slide. A `full` slide like the hooks before it: the
 * card lays out the 7-day trial steps, the cancel-before readout and the
 * verified student reviews on its own surface.
 */
const TRIAL_TIMELINE_SLIDE: IntroSlide = {
  id: "trial-timeline",
  num: "06",
  tag: "TRIAL",
  title: "",
  sub: "",
  Icon: CalendarClock,
  full: true,
  fill: true,
  body: <TrialTimeline />,
};

/** The Pitch-only slides, keyed by id so the order list below stays declarative. */
const PITCH_ONLY_SLIDES: Record<string, IntroSlide> = {
  "stop-feeding": STOP_FEEDING_SLIDE,
  manifesto: FIRST_MOVE_SLIDE,
  "compound-chart": TRAP_RESULTS_SLIDE,
  "stall-timer": STALL_TIMER_SLIDE,
  "trial-timeline": TRIAL_TIMELINE_SLIDE,
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
  "stall-timer",
  "trial-timeline",
];

/**
 * The Pitch intro slide set: the AlgorithmPitch hook, the FirstMoveTimes chart, the sponsor
 * reel, the trap-results panel, the stall timer and the trial timeline.
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
   * Shell arrangement. `stacked` (default) is the single narrow column.
   * `split` lays the clearance tiers and the carousel side by side from `md` up
   * (768px, the same breakpoint Feature Intro switches to its two-column
   * rectangle) — tiers on the left, carousel on the right — and keeps the
   * stacked column below `md` so mobile stays untouched.
   */
  layout?: "stacked" | "split";
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [pricingSheetOpen, setPricingSheetOpen] = useState(false);
  const reducedMotionRef = useRef(false);
  const userInteractedRef = useRef(false);
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [manualNav, setManualNav] = useState(false);
  const slideDurationMs = 3000;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const split = layout === "split";

  const theme = useThemeStore((s) => s.theme);
  const tone = useArenaTone();
  const [active, setActive] = useState(0);
  const [tier, setTier] = useState("dual-lane");

  const TOTAL = slides.length;

  const goTo = useCallback(
    (index: number, opts?: { jump?: boolean }) => {
      const clamped = Math.max(0, Math.min(TOTAL - 1, index));
      setManualNav(true);
      setActive(clamped);
      const track = trackRef.current;
      const slide = track?.children[clamped] as HTMLElement | undefined;
      if (!track || !slide) return;
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "auto" });
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
    if (active >= TOTAL - 1 && index === 0) {
      return;
    }
    setActive((prev) => (prev === index ? prev : Math.max(0, Math.min(TOTAL - 1, index))));
  }, [TOTAL, active]);

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
      if (autoScrollTimerRef.current) {
        clearTimeout(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
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
          split && "md:max-w-[920px] md:max-h-[88vh] lg:max-w-[980px] xl:max-w-[1100px]",
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
        <div className="relative shrink-0 px-5 pt-[max(0.75rem,var(--sat))]" />

        {/* panels: stacked column by default; side-by-side from md in split mode */}
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden",
              split && "md:flex-row-reverse",
            )}
          >
          <section
            aria-roledescription="carousel"
            aria-label="Arena overview"
            className={cn(
              "flex min-h-0 flex-col px-5 pt-3",
              split ? "md:min-w-0 md:flex-[1.4] md:px-5 md:pt-4 md:pb-2 lg:flex-[1.5] lg:px-6" : "flex-1",
            )}
            style={
              split && typeof window !== "undefined" && window.innerWidth < 768
                ? {
                    flex: "0 0 78%",
                    paddingBottom: pricingSheetOpen
                      ? "calc(50% + max(1.5rem, env(safe-area-inset-bottom, 0px)))"
                      : "calc(22% + max(1rem, env(safe-area-inset-bottom, 0px)))",
                    transform: pricingSheetOpen ? "scale(0.98)" : "scale(1)",
                    transformOrigin: "top center",
                    transition: reducedMotionRef.current
                      ? "none"
                      : "flex 520ms cubic-bezier(0.22,1,0.36,1), padding-bottom 520ms cubic-bezier(0.22,1,0.36,1), transform 520ms cubic-bezier(0.22,1,0.36,1)",
                  }
                : undefined
            }
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
                      (card.bare || card.fill) && "self-stretch",
                    )}
                  >
                    <div
                      className={cn(
                        "flex min-h-0 flex-1 flex-col border-0 bg-transparent p-0",
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

            <div className="mt-2.5 shrink-0">
              {(() => {
                const isPitch = slides === usePitchIntroSlides().slides || (typeof window !== "undefined" && location.pathname.includes("pitch"));
                // Build groups based on typical mappings
                if (isPitch) {
                  const groups = [
                    { label: "Stop", slideIndexes: slides.map((_, i) => i).filter((i) => i === 0) },
                    { label: "Fight", slideIndexes: slides.map((_, i) => i).filter((i) => i === 1) },
                    { label: "Rank", slideIndexes: slides.map((_, i) => i).filter((i) => [2].includes(i)) },
                    { label: "Rise", slideIndexes: slides.map((_, i) => i).filter((i) => [3, 4].includes(i)) },
                    { label: "Join", slideIndexes: slides.map((_, i) => i).filter((i) => [5].includes(i)) },
                  ].filter((g) => g.slideIndexes.length > 0);
                  if (groups.length === 0) return null;
              const stopIdx = groups.find(g=>g.label==="Stop")?.slideIndexes[0] ?? 0;
              return <Steps groups={groups} currentIndex={active} onGroupClick={(idx) => { const joinIdx = groups.find(g=>g.label==="Join")?.slideIndexes[0]; if (joinIdx !== undefined && idx === joinIdx) { goTo(stopIdx); return; } goTo(idx); }} disabled={false} totalSlides={slides.length} autoAdvance={!reducedMotionRef.current} slideDurationMs={slideDurationMs} onAutoAdvance={() => goTo(active >= TOTAL - 1 ? stopIdx : active + 1)} reducedMotion={reducedMotionRef.current} />;
                }
                // Arena groups
                const groups = [
                  { label: "Stop", slideIndexes: slides.map((_, i) => i).filter((i) => i === 0) },
                  { label: "Fight", slideIndexes: slides.map((_, i) => i).filter((i) => i === 1) },
                  { label: "Rank", slideIndexes: slides.map((_, i) => i).filter((i) => i === 2) },
                  { label: "Rise", slideIndexes: slides.map((_, i) => i).filter((i) => i === 3 || i === 4) },
                  { label: "Join", slideIndexes: slides.map((_, i) => i).filter((i) => i >= 5) },
                ].filter((g) => g.slideIndexes.length > 0);
                if (groups.length === 0) return null;
                const stopIdx = groups.find(g=>g.label==="Stop")?.slideIndexes[0] ?? 0;
                return <Steps groups={groups} currentIndex={active} onGroupClick={(idx) => { const joinIdx = groups.find(g=>g.label==="Join")?.slideIndexes[0]; if (joinIdx !== undefined && idx === joinIdx) { goTo(stopIdx); return; } goTo(idx); }} disabled={false} totalSlides={slides.length} autoAdvance={!reducedMotionRef.current} slideDurationMs={slideDurationMs} onAutoAdvance={() => goTo(active >= TOTAL - 1 ? stopIdx : active + 1)} reducedMotion={reducedMotionRef.current} />;
              })()}
            </div>
          </section>

          <div
            onClick={(e) => {
              if (!split) return;
              const target = e.target as HTMLElement;
              if (target.closest("button") || target.closest("a") || target.closest('[role="radio"]')) {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setPricingSheetOpen(true);
                }
                return;
              }
              if (typeof window === "undefined" || window.innerWidth >= 768) return;
              setPricingSheetOpen((v) => !v);
            }}
              className={cn(
                "relative mx-auto w-full max-w-[400px] px-5 pb-[max(0.5rem,var(--sab))] pt-0 sm:max-w-none max-[359px]:px-4 transition-[height,transform] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                split
                  ? "md:mx-0 md:w-[280px] md:min-h-0 md:flex-[0.6] md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-5 md:pb-[calc(96px+max(1rem,var(--sab)))] md:pt-4 lg:w-[320px] lg:flex-[0.5] lg:px-6 lg:pb-[calc(104px+max(1rem,var(--sab)))] lg:pt-4 xl:w-[340px] xl:flex-[0.5]"
                  : "flex shrink-0 flex-col",
                split && "max-[767px]:absolute max-[767px]:bottom-0 max-[767px]:left-0 max-[767px]:right-0 max-[767px]:mx-auto max-[767px]:z-50 max-[767px]:rounded-t-[20px] max-[767px]:overflow-hidden",
                split && (theme === "light" ? "max-[767px]:bg-black/[0.08]" : "max-[767px]:bg-[#141414]/90"),
              )}
            style={
              split && typeof window !== "undefined" && window.innerWidth < 768
                ? {
                    height: pricingSheetOpen ? "50%" : "26%",
                    transform: pricingSheetOpen ? "translateY(0)" : "translateY(-4px)",
                    boxShadow: pricingSheetOpen
                      ? "0 -40px 80px -40px rgba(0,0,0,0.8), 0 -2px 0 rgba(255,255,255,0.06) inset, 0 -4px 14px -10px rgba(0,0,0,0.7)"
                      : "0 -24px 56px -32px rgba(0,0,0,0.7), 0 -1px 0 rgba(255,255,255,0.04) inset",
                    transition: reducedMotionRef.current
                      ? "none"
                      : "height 520ms cubic-bezier(0.22,1,0.36,1), box-shadow 520ms cubic-bezier(0.22,1,0.36,1), transform 520ms cubic-bezier(0.22,1,0.36,1)",
                    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
                  }
                : undefined
            }
          >
            <div className={cn(split && "md:my-auto")}>
              <div className="mx-auto mt-1 mb-2 h-1 w-8 rounded-full bg-white/20 max-[767px]:block hidden" />
              {/* clearance tiers: replaces the stock video, mirrors the paywall */}
              <div className="mt-1 shrink-0">
                <ClearanceTiers value={tier} onChange={setTier} />
              </div>

              {/* fixed CTA */}
              <footer className="mt-2.5 shrink-0 md:absolute md:bottom-4 md:left-0 md:right-0 md:mt-0 md:px-5 lg:bottom-6 lg:px-6 xl:bottom-6">
                <button
                  onClick={() => exit(onClose)}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3 text-[11px] font-bold tracking-[0.1em] text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(90deg, var(--lime-solid), var(--lime-light))`,
                    boxShadow: "0 10px 34px var(--lime-mid-25), 0 1px 0 var(--glass-25) inset",
                  }}
                >
                  {tier === "initiate"
                    ? "Join Free"
                    : tier === "single-lane"
                      ? "15 Days Unrestricted Access"
                      : lanesCount > 1
                        ? "ENTER MULTI-LANE"
                        : "ENTER YOUR ARENA"}
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
