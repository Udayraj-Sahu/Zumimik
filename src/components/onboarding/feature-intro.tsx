"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CYAN_251, LIME } from "@/lib/theme-tokens";
import { useThemeStore } from "@/stores/theme-store";
import { createPortal } from "react-dom";
import {
  motion,
  MotionConfig,
  useReducedMotion,
  useMotionValue,
  useTransform,
  animate,
  type Variants,
} from "motion/react";
import {
  BrainCircuit,
  Clock,
  Crosshair,
  Timer,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import HabitCard from "@/components/onboarding/habit-card";

const ACCENT = LIME;

type Variant = "this_year" | "whenever" | "not_sure" | "vedic";

type Tone = "lime" | "cyan" | "fuchsia";

const iconTones: Record<Tone, string> = {
  lime: "border-[var(--lime-50)] bg-[var(--lime-10)] text-[var(--lime)]",
  cyan: "border-cyan-400/50 bg-cyan-400/10 text-cyan-400",
  fuchsia: "border-fuchsia-400/50 bg-fuchsia-400/10 text-fuchsia-400",
};

const iconTonesLight: Record<Tone, string> = {
  lime: "border-[var(--lime-50)] bg-[var(--lime-10)] text-[var(--lime)]",
  cyan: "border-cyan-600/50 bg-cyan-400/10 text-[var(--cyan)]",
  fuchsia: "border-fuchsia-600/50 bg-fuchsia-400/10 text-[var(--fuchsia)]",
};

type System = {
  icon: typeof BrainCircuit;
  tone: Tone;
  title: string;
  tag: string;
  body: string;
};

const SYSTEMS: System[] = [
  {
    icon: BrainCircuit,
    tone: "lime",
    title: "Adaptive Sprints",
    tag: "Difficulty follows you",
    body: "Sprint and quest difficulty tunes to your skill level, so practice stays in the zone where you actually improve.",
  },
  {
    icon: Clock,
    tone: "cyan",
    title: "Daily Practice",
    tag: "Drills that fit your day",
    body: "Set a daily minute target and a reminder slot. The app queues a short drill routine and logs every session to your streak.",
  },
  {
    icon: Crosshair,
    tone: "fuchsia",
    title: "Mastery Analytics",
    tag: "See what to fix next",
    body: "Every answer updates per-topic mastery. Slow or weak topics surface in analytics so the next drill targets them.",
  },
  {
    icon: Timer,
    tone: "lime",
    title: "Mock Tests",
    tag: "Full-length timed papers",
    body: "Exam-style mock papers scored by section. Free attempts and Pro unlocks are handled in one place.",
  },
];

const CARD_SPACING = 96;

function centeredDist(index: number, active: number, count: number) {
  const n = count;
  let dist = (((index - active) % n) + n) % n;
  if (dist > n / 2) dist -= n;
  return dist;
}

function SystemCarousel() {
  const theme = useThemeStore((s) => s.theme);
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setActive((a) => (a + 1) % SYSTEMS.length), 3200);
    return () => clearInterval(id);
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <ul className="mt-3 flex flex-col gap-3">
        {SYSTEMS.map(({ icon: Icon, tone, title, tag, body }) => (
          <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full border",
                  theme === "light" ? iconTonesLight[tone] : iconTones[tone],
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="flex-1 text-[14px] font-semibold leading-tight">{title}</h3>
              <span className=" max-w-[7.5rem] rounded bg-white/5 px-2 py-1 text-right text-[9px] uppercase leading-3 tracking-wider text-muted-foreground">
                {tag}
              </span>
            </div>
            <p className={cn("mt-3 text-[12px] leading-relaxed", theme === "light" ? "text-black/80" : "text-white/80")}>{body}</p>
          </li>
        ))}
      </ul>
    );
  }

  const activeSystem = SYSTEMS[active];

  return (
    <div
      className="relative mt-3"
      role="group"
      aria-roledescription="carousel"
      aria-label="Core systems"
    >
      {SYSTEMS.map(({ icon: Icon, tone, title, tag, body }, i) => {
        const dist = centeredDist(i, active, SYSTEMS.length);
        const isCenter = dist === 0;
        const abs = Math.abs(dist);
        const y = isCenter
          ? 0
          : (dist > 0 ? 1 : -1) * (abs === 1 ? CARD_SPACING + 18 : CARD_SPACING * 2);
        const scale = isCenter ? 1 : 0.85;
        const opacity = isCenter ? 1 : 0;
        const z = 40 - abs * 6;

        return (
          <motion.button
            key={title}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`${title}, ${isCenter ? "active" : "select this card"}`}
            aria-current={isCenter ? "true" : undefined}
            animate={{ x: "-50%", y: `calc(-50% + ${y}px)`, scale, opacity, zIndex: z }}
            transition={{ type: "spring", stiffness: 205, damping: 33 }}
            className={cn(
              "absolute inset-x-0 left-1/2 top-1/2 w-[90%] cursor-pointer rounded-2xl border p-4 text-left transition-colors",
              isCenter
                ? "border-[var(--lime-40)] bg-[var(--panel-warm)] shadow-[0_0_40px_var(--lime-15)]"
                : "border-white/10 bg-white/[0.03]",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full border",
                  theme === "light" ? iconTonesLight[tone] : iconTones[tone],
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="flex-1 text-[14px] font-semibold leading-tight">{title}</h3>
              <span className=" max-w-[7.5rem] rounded bg-white/5 px-2 py-1 text-right text-[9px] uppercase leading-3 tracking-wider text-muted-foreground">
                {tag}
              </span>
            </div>
            <p className={cn("mt-3 text-[12px] leading-relaxed", theme === "light" ? "text-black/80" : "text-white/80")}>{body}</p>
          </motion.button>
        );
      })}
      {/* Invisible sizer mirrors the active card's content so the container
          height always matches the wrapped text height (no fixed px, no overflow) */}
      <div
        aria-hidden
        className="invisible w-[90%] rounded-2xl border border-transparent p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border" />
          <h3 className="flex-1 text-[14px] font-semibold leading-tight">{activeSystem.title}</h3>
          <span className=" max-w-[7.5rem] rounded bg-white/5 px-2 py-1 text-right text-[9px] uppercase leading-3 tracking-wider text-muted-foreground">
            {activeSystem.tag}
          </span>
        </div>
        <p className={cn("mt-3 text-[12px] leading-relaxed", theme === "light" ? "text-black/80" : "text-white/80")}>
          {activeSystem.body}
        </p>
      </div>
    </div>
  );
}

const FACTS: { value: string; label: string; valueClass: string }[] = [
  { value: "Live", label: "Accuracy tracker", valueClass: "text-[#C8FF4D]" },
  { value: "Auto", label: "Adaptive difficulty", valueClass: "text-cyan-400" },
  { value: "Daily", label: "Weak-topic review", valueClass: "text-fuchsia-400" },
];

const VARIANT_COPY: Record<
  Variant,
  { pill: string; headline: { text: string; accent: string }; sub: string; caption: string }
> = {
  this_year: {
    pill: "DEADLINE PROTOCOL",
    headline: { text: "Unfair prep. Zero friction.", accent: "Engineered for exam day." },
    sub: "Your test date is locked in. Prep automates daily drill volume and flags weak spots so every working day compounds toward exam day.",
    caption: "Daily drills, timed mocks, and one clear dashboard.",
  },
  whenever: {
    pill: "ADAPTIVE PROTOCOL",
    headline: { text: "Unfair prep. Zero friction.", accent: "Engineered around your pace." },
    sub: "No exam clock forcing the schedule. The engine builds effortless calculation habits on your own timeline, compounding when you can and pausing when you must.",
    caption: "Daily drills, timed mocks, and one clear dashboard.",
  },
  not_sure: {
    pill: "ADAPTIVE PROTOCOL",
    headline: { text: "Unfair prep. Zero friction.", accent: "Engineered around your pace." },
    sub: "No exam clock forcing the schedule. The engine builds effortless calculation habits on your own timeline, compounding when you can and pausing when you must.",
    caption: "Daily drills, timed mocks, and one clear dashboard.",
  },
  vedic: {
    pill: "SPEED PROTOCOL",
    headline: { text: "Unfair prep. Zero friction.", accent: "Engineered for lightning recall." },
    sub: "Rapid mental arithmetic rewires your baseline. The engine tracks your pace, isolates slowness, and compounds recall until answers arrive before you finish reading them.",
    caption: "Speed drills, daily routines, and timed mock practice.",
  },
};

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

function CountValue({ value, className }: { value: string; className?: string }) {
  const isNumber = /^\d+$/.test(value);
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!isNumber) return;
    if (reduceMotion) {
      count.set(parseInt(value, 10));
      return;
    }
    const controls = animate(count, parseInt(value, 10), {
      duration: 0.9,
      delay: 0.35,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [count, isNumber, value, reduceMotion]);

  if (!isNumber)
    return <dd className={cn("text-lg font-bold leading-none", className)}>{value}</dd>;
  return <motion.dd className={cn("text-lg font-bold leading-none", className)}>{text}</motion.dd>;
}

function IncludedFactsCard() {
  const theme = useThemeStore((s) => s.theme);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <motion.dl
        className="grid grid-cols-3 gap-2"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
        }}
      >
        {FACTS.map(({ value, label, valueClass }) => (
          <motion.div
            key={label}
            variants={cardVariants}
            className="keep-white flex flex-col-reverse justify-end gap-1 rounded-lg border border-white/10 bg-black/60 px-3 py-3"
          >
            <dt
              className={cn(
                " text-[9px] uppercase leading-3 tracking-wider",
                theme === "light" ? "text-white/60" : "text-muted-foreground",
              )}
            >
              {label}
            </dt>
            <CountValue value={value} className={valueClass} />
          </motion.div>
        ))}
      </motion.dl>
      <p className={cn(" mt-3 text-[9px] uppercase tracking-wider", theme === "light" ? "text-black/60" : "text-white/60")}>
        Accuracy tracked per topic · Missed questions resurface · Harder sets as you improve
      </p>
    </div>
  );
}

function IncludedCarousel() {
  const theme = useThemeStore((s) => s.theme);
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const dragStartX = useRef<number | null>(null);

  const cards = [
    { key: "habit", node: <HabitCard bare compact />, label: "Automatic Habit Tracker" },
    { key: "facts", node: <IncludedFactsCard />, label: "What is included summary" },
  ];

  const swipe = useCallback(
    (deltaX: number) => {
      if (Math.abs(deltaX) < 40) return;
      setActive((a) => (a + (deltaX < 0 ? 1 : cards.length - 1)) % cards.length);
    },
    [cards.length],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX;
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartX.current;
    dragStartX.current = null;
    if (start == null) return;
    swipe(e.clientX - start);
  };

  const transition = reduceMotion
    ? { duration: 0.18 }
    : { type: "spring" as const, stiffness: 205, damping: 33 };

  return (
    <div
      className={cn(
        "relative mt-2.5 [touch-action:pan-y]",
        theme === "light" ? "h-[230px]" : "h-[240px]",
      )}
      role="group"
      aria-roledescription="carousel"
      aria-label="What is included"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStartX.current = null;
      }}
    >
      {cards.map((card, i) => {
        const isCenter = i === active;
        return (
          <motion.div
            key={card.key}
            animate={{ x: "-50%", y: "-50%", opacity: isCenter ? 1 : 0, zIndex: isCenter ? 40 : 30 }}
            transition={transition}
            aria-current={isCenter ? "true" : undefined}
            aria-hidden={!isCenter}
            aria-label={card.label}
            className="absolute inset-x-0 left-1/2 top-1/2 w-[92%] text-left"
          >
            {card.node}
          </motion.div>
        );
      })}

      {/* dots */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center">
        <div className="flex items-center gap-1.5">
          {cards.map((card, i) => (
            <span
              key={card.key}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === active ? "w-4 bg-[var(--lime-70)]" : "w-1.5 bg-white/25",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = {
  variant: Variant;
  onDone: () => void;
  onClose: () => void;
  preloaded?: boolean;
};

export function FeatureIntro({ variant, onDone, onClose, preloaded = false }: Props) {
  const copy = VARIANT_COPY[variant];
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const theme = useThemeStore((s) => s.theme);

  useLayoutEffect(() => {
    if (preloaded) return;
    if (!overlayRef.current) return;
    if (reduceMotion) return;
    const el = overlayRef.current;
    el.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0%)" }], {
      duration: 320,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [preloaded, reduceMotion]);

  const exitingRef = useRef(false);
  const exit = useCallback((cb: () => void) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    const el = overlayRef.current;
    if (!el) return cb();
    el.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], {
      duration: 280,
      easing: "cubic-bezier(0.55, 0, 0.55, 0.2)",
      fill: "forwards",
    }).addEventListener("finish", cb, { once: true });
  }, []);

  useEffect(() => {
    if (preloaded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        exit(onClose);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preloaded, exit, onClose]);

  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        ref={overlayRef}
        data-theme-scope
        className={cn(
          "fixed inset-0 z-[var(--z-intro)] flex flex-col items-center overflow-hidden sm:justify-center sm:bg-black/60 sm:backdrop-blur-sm",
          preloaded && "invisible pointer-events-none",
          theme === "light" && "light",
        )}
        aria-hidden={preloaded || undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-hook-title"
      >
        <div
          className="relative flex h-full w-full flex-col overflow-hidden sm:h-auto sm:min-h-0 sm:max-w-lg sm:max-h-[90vh] md:max-w-3xl md:max-h-[85vh] lg:max-w-4xl xl:max-w-[1080px] sm:rounded-3xl sm:border sm:border-white/[0.06] sm:shadow-2xl"
          style={{
            background: "linear-gradient(180deg, var(--screen-tint) 0%, var(--overlay-solid) 100%)",
          }}
        >
          <motion.div
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[440px] h-[320px] rounded-full"
            style={{ background: `radial-gradient(circle, ${CYAN_251}, transparent 70%)` }}
            animate={{ opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, var(--lime-40), transparent)",
            }}
          />

          <div className="relative mx-auto flex h-full w-full max-w-[360px] flex-col sm:min-h-0 sm:max-w-none sm:flex-1">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* Header: protocol pill + hero (centered above the two-column row) */}
              <div className="shrink-0 px-5 max-[359px]:px-4 md:mx-auto md:max-w-[720px] md:px-8">
                {/* Protocol pill */}
                <div className="flex justify-center pt-[max(1rem,var(--sat))] pb-3 md:pt-2">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm"
                  >
                    <Sparkles size={12} className="text-[var(--lime)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--lime-85)]">
                      {copy.pill}
                    </span>
                  </motion.div>
                </div>

                {/* Hero */}
                <motion.section
                  variants={itemVariants}
                  className={theme === "light" ? "mt-5 md:mt-6" : "mt-6 md:mt-8"}
                >
                  <h1
                    id="feature-hook-title"
                    className="text-[clamp(1.15rem,5.3vw,1.4rem)] md:text-center md:text-[clamp(1.6rem,2.8vw,2rem)] lg:text-[clamp(1.8rem,3vw,2.2rem)] font-bold uppercase leading-[1.08] tracking-[-0.035em]"
                  >
                    {copy.headline.text}
                    <motion.span
                      className="block"
                      style={{ color: theme === "light" ? "var(--lime)" : ACCENT }}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {copy.headline.accent}
                    </motion.span>
                  </h1>
                  <p
                    className={cn(
                      "text-[13px] md:mx-auto md:max-w-[560px] md:text-center md:text-[13.5px] lg:text-[14px] leading-relaxed text-muted-foreground",
                      theme === "light" ? "mt-2.5" : "mt-3",
                    )}
                  >
                    {copy.sub}
                  </p>
                </motion.section>
              </div>

              {/* Row: What's included | Core systems (side by side on md+, stacked on mobile) */}
              <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                {/* Left column: What's included (below Core systems on mobile, left on md+) */}
                <div className={cn("order-2 md:order-none flex-1 min-h-0 overflow-y-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[359px]:px-4 md:px-8 md:py-6", theme === "light" ? "pb-5" : "pb-6")}>
                  <motion.section
                    variants={itemVariants}
                    aria-labelledby="facts-heading"
                    className={theme === "light" ? "mt-5 md:mt-0" : "mt-7 md:mt-0"}
                  >
                    <h2
                      id="facts-heading"
                      className=" text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      What is included
                    </h2>
                    <IncludedCarousel />
                  </motion.section>
                </div>

                {/* Right column: single carousel instance (above What's included on mobile, right on md+) */}
                <div className="order-1 md:order-none flex w-full md:w-1/2 lg:w-[48%] min-h-0 flex-col justify-start px-5 md:px-6 md:py-6">
                  <motion.section variants={itemVariants} aria-labelledby="core-heading">
                    <h2
                      id="core-heading"
                      className="mb-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Core systems
                    </h2>
                    <div className="relative flex h-full w-full items-center justify-center">
                      <SystemCarousel />
                    </div>
                  </motion.section>
                </div>
              </div>
            </motion.div>
          </div>

          <footer className={cn("shrink-0 px-5 pb-[max(1rem,var(--sab))] md:flex md:justify-center md:px-8 md:pb-6", theme === "light" ? "pt-3.5 md:pt-4" : "pt-4 md:pt-5")}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                exit(onDone);
              }}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--lime-solid)] to-[var(--lime-mid)] py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98] md:w-auto md:px-8"
            >
              Enter Zuzumik{" "}
              <motion.span
                className="inline-flex"
                animate={reduceMotion ? {} : { x: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </motion.span>
            </button>
          </footer>
        </div>
      </div>
    </MotionConfig>,
    document.body,
  );
}
