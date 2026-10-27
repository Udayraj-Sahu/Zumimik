"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BG_MOSS, FOREST, GLASS_BORDER, PANEL } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Baby,
  Clock,
  Flame,
  GraduationCap,
  HeartHandshake,
  Home,
  NotebookPen,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StockVideoAd from "@/components/onboarding/ads/stock-video-ad";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SEATS: { id: string; label: string; desc: string; Icon: typeof Baby }[] = [
  { id: "little", label: "Little", desc: "Tactile base", Icon: Baby },
  { id: "child", label: "Child", desc: "Co-op drills", Icon: Star },
  { id: "teen", label: "Teen", desc: "Exam engine", Icon: GraduationCap },
  { id: "parent", label: "Parent", desc: "Guardian eye", Icon: HeartHandshake },
  { id: "grand", label: "Grand", desc: "Keep-sharp", Icon: User },
  { id: "guest", label: "Guest", desc: "Momentum seat", Icon: Sparkles },
];

const WALL: { Icon: typeof Flame; title: string; desc: string }[] = [
  {
    Icon: Flame,
    title: "One household streak",
    desc: "Every seat's minutes merge into a single flame the whole house protects.",
  },
  {
    Icon: NotebookPen,
    title: "One board, all lanes",
    desc: "Each member's next drill shows up on the same shared wall. No hunting.",
  },
  {
    Icon: Star,
    title: "Wins are shared",
    desc: "A chest by any seat lights up the whole house — that's the point of a family.",
  },
];

const SAVINGS: { Icon: typeof PiggyBank; title: string; text: string }[] = [
  {
    Icon: PiggyBank,
    title: "Stack seats, save 30%",
    text: "Two or more seats drop the household bill.",
  },
  {
    Icon: ShieldCheck,
    title: "One dashboard",
    text: "Every member's data, one calm page, zero clutter.",
  },
  {
    Icon: Clock,
    title: "Grows with age",
    text: "The same routine upgrades the whole house forward.",
  },
];

/** The three pitch cards, shown one per slide. */
const CARDS = [
  {
    id: "seats",
    num: "01",
    tag: "OPEN SEATS",
    title: "A lane for everyone",
    sub: "Six seat types, one subscription. Add anyone in the house.",
    Icon: Baby,
    render: (tone: HubTone) => (
      <div className="grid flex-1 grid-cols-3 gap-2">
        {SEATS.map(({ id, label, desc, Icon }) => (
          <div
            key={id}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center",
              tone.panel,
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-lg border border-[var(--lime-25)] text-[var(--lime)]",
                tone.iconBg,
              )}
            >
              <Icon size={15} />
            </span>
            <div className="text-[10.5px] font-bold leading-none text-foreground">{label}</div>
            <div className={cn("text-[8.5px] leading-tight", tone.faint)}>{desc}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "wall",
    num: "02",
    tag: "SHARED FAMILY WALL",
    title: "The whole house moves together",
    sub: "One streak, one board, one set of wins — visible to everyone.",
    Icon: Home,
    render: (tone: HubTone) => (
      <ul className="flex flex-1 flex-col justify-center gap-2">
        {WALL.map(({ Icon, title, desc }) => (
          <li
            key={title}
            className={cn(
              "flex flex-1 items-center gap-3 rounded-xl border px-3 py-2",
              tone.panel,
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--lime-25)] text-[var(--lime)]",
                tone.iconBg,
              )}
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-bold leading-tight text-foreground">{title}</div>
              <div className={cn("mt-0.5 text-[10px] leading-snug", tone.soft)}>{desc}</div>
            </div>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "savings",
    num: "03",
    tag: "HOUSEHOLD VALUE",
    title: "One bill, less per seat",
    sub: "Stack seats and the household cost drops for everyone.",
    Icon: PiggyBank,
    render: (tone: HubTone) => (
      <ul className="flex flex-1 flex-col justify-center gap-2">
        {SAVINGS.map(({ Icon, title, text }) => (
          <li
            key={title}
            className={cn(
              "flex flex-1 items-center gap-3 rounded-xl border px-3 py-2",
              tone.insetRow,
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--lime-25)] text-[var(--lime)]",
                tone.iconBg,
              )}
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-bold leading-tight text-foreground">{title}</div>
              <div className={cn("mt-0.5 text-[10px] leading-snug", tone.soft)}>{text}</div>
            </div>
          </li>
        ))}
      </ul>
    ),
  },
] as const;

const TOTAL = CARDS.length;

type HubTone = {
  card: string;
  panel: string;
  inset: string;
  insetRow: string;
  soft: string;
  faint: string;
  iconBg: string;
  rest: string;
  pillMuted: string;
  dot: string;
};

/** Theme-aware class sets — no raw colour literals in the markup. */
function useHubTone(): HubTone {
  const theme = useThemeStore((s) => s.theme);
  const light = theme === "light";
  return {
    card: light ? "border-black/[0.10] bg-black/[0.04]" : "border-white/10 bg-white/[0.03]",
    panel: light ? "border-black/[0.10] bg-black/[0.04]" : "border-white/[0.08] bg-white/[0.03]",
    inset: light
      ? "border-black/[0.10] bg-black/[0.03]"
      : "border-[var(--lime-20)] bg-[var(--lime-04)]",
    insetRow: light
      ? "border-[var(--lime-25)] bg-[var(--lime-10)]"
      : "border-[var(--lime-20)] bg-[var(--lime-04)]",
    soft: light ? "text-black/70" : "text-white/70",
    faint: light ? "text-black/60" : "text-white/60",
    iconBg: light ? "bg-[var(--lime-10)]" : "bg-black/30",
    rest: light ? "border-black/[0.10] bg-black/[0.04]" : "border-white/10 bg-white/[0.03]",
    pillMuted: light ? "border-black/[0.10] bg-black/[0.04]" : "border-white/[0.08] bg-white/[0.03]",
    dot: light ? "bg-black/10" : "bg-white/10",
  };
}

export function FamilyHubIntro({
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
  const tone = useHubTone();
  const [active, setActive] = useState(0);

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
      className={cn(
        "fixed inset-0 z-[var(--z-intro)] flex overflow-hidden flex-col sm:items-center sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm",
        preloaded && "invisible pointer-events-none",
        theme === "light" && "light",
      )}
      role="dialog"
      aria-modal="true"
      aria-hidden={preloaded || undefined}
      aria-labelledby="family-hub-hook-title"
    >
      <div
        className="relative flex h-full w-full shrink-0 flex-col sm:h-[92vh] sm:max-w-md sm:overflow-hidden sm:rounded-3xl sm:border sm:shadow-2xl"
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

        {/* stock video: top half, edge to edge */}
        <div className="relative shrink-0">
          <StockVideoAd
            src="/media/stock-ad.mp4"
            poster="/media/stock-ad-poster.webp"
            alt="Sponsor message"
            className="h-[clamp(140px,42vh,320px)] w-full"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <div className="relative mx-auto flex w-full max-w-[400px] min-h-0 flex-1 flex-col px-5 pb-[max(0.5rem,var(--sab))] pt-0 sm:max-w-none max-[359px]:px-4">
          {/* headline */}
          <div className="-mt-1 shrink-0 pt-2 text-center">
            <h1
              id="family-hub-hook-title"
              className="text-[clamp(21px,6vw,28px)] font-extrabold uppercase leading-[1.02] tracking-tight text-foreground"
            >
              Whole house.
              <span className="block text-[var(--lime)]">One plan.</span>
            </h1>
          </div>

          {/* carousel: bottom half */}
          <section
            aria-roledescription="carousel"
            aria-label="Household pitch"
            className="mt-3 flex min-h-0 flex-1 flex-col"
          >
            <div
              ref={trackRef}
              onScroll={onTrackScroll}
              className="flex min-h-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {CARDS.map((card, i) => {
                const Icon = card.Icon;
                return (
                  <article
                    key={card.id}
                    aria-label={`${i + 1} of ${TOTAL}: ${card.tag}`}
                    aria-hidden={i !== active ? "true" : undefined}
                    className="flex w-full shrink-0 snap-start snap-always flex-col overflow-hidden"
                  >
                    <div className={cn("flex min-h-0 flex-1 flex-col rounded-[18px] border p-2.5", tone.card)}>
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

                      <h2 className="mt-3 text-[14px] font-bold uppercase leading-[1.15] tracking-[-0.01em] text-foreground">
                        {card.title}
                      </h2>
                      <p className={cn("mt-1.5 text-[10px] leading-snug", tone.soft)}>{card.sub}</p>

                      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-2">
                        {card.render(tone)}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* nav */}
            <nav className="mt-2.5 flex shrink-0 items-center justify-center gap-2">
              {CARDS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to card ${i + 1} of ${TOTAL}: ${c.tag}`}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === active ? "w-5 bg-[var(--lime)]" : "w-1.5 bg-white/25",
                  )}
                />
              ))}
            </nav>
          </section>

          {/* fixed CTA */}
          <footer className="mt-2.5 shrink-0">
            <button
              onClick={() => exit(onDone)}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-[12px] font-bold tracking-[0.12em] text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.98]"
              style={{
                background: `linear-gradient(90deg, var(--lime-solid), var(--lime-light))`,
                boxShadow: "0 10px 34px var(--lime-mid-25), 0 1px 0 var(--glass-25) inset",
              }}
            >
              CONFIGURE HOUSEHOLD SEATS
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
    </div>,
    document.body,
  );
}
