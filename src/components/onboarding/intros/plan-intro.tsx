"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BG_MOSS } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { motion } from "motion/react";
import { Check, CreditCard, QrCode, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/text";
import { PLANS } from "@/lib/types/onboarding";
import type { PlanId } from "@/lib/types/onboarding";
import { DOMAIN_LABELS } from "@/lib/types/template";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { IntroSurface } from "@/components/onboarding/intros/intro-surface";

const inr = formatINR;

const EXAM_QUALIFIER: Record<string, string> = {
  cat: "Verbal & Quant",
  gmat: "Quant · Verbal · DI",
  gre: "Verbal · Quant · AWA",
  banking: "Quant · Reasoning · English",
  "vedic-math": "Speed Math trees",
};

function laneLabel(lane: string | null | undefined): string {
  if (!lane) return "Your Exam";
  return DOMAIN_LABELS[lane] ?? lane;
}

function laneQualifier(lane: string | null | undefined): string {
  if (!lane) return "adaptive syllabus";
  return EXAM_QUALIFIER[lane] ?? "adaptive syllabus";
}

function realDiscount(annual: number, monthly: number): number {
  if (monthly <= 0 || annual <= 0) return 0;
  return Math.max(0, Math.round((1 - annual / (monthly * 12)) * 100));
}

type Tone = {
  surface: string;
  soft: string;
  faint: string;
  perk: string;
};

/** Design calls for Fraunces; falls back to the same serif chain it declares. */
const SERIF = "font-[Fraunces,Georgia,'Times_New_Roman',serif]";

/** Theme-aware class sets — no raw colour literals in the markup. */
function usePlanTone(): Tone {
  const theme = useThemeStore((s) => s.theme);
  const light = theme === "light";
  return {
    surface: light
      ? "border-black/[0.12] bg-black/[0.04]"
      : "border-white/[0.09] bg-black/25",
    soft: light ? "text-black/65" : "text-white/65",
    faint: light ? "text-black/50" : "text-white/50",
    perk: light ? "text-black/75" : "text-white/80",
  };
}

function FadeUp({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate(
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 550,
        delay,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      },
    );
  }, [delay]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── Presentational: plan selector (reused by AdaptiveReprompt & paywall) ── */

export function PlanSelector({
  value,
  onChange,
  billing,
  lane,
  layout = "stack",
}: {
  value: PlanId;
  onChange: (plan: PlanId) => void;
  onLaneChange: (lane: string) => void;
  lane: string;
  billing?: "annual" | "monthly";
  /** "row" lays the three plans side by side from the `md` breakpoint up. */
  layout?: "stack" | "row";
}) {
  const theme = useThemeStore((s) => s.theme);
  const store = useOnboardingStore();
  const second = (store.activePreps.find((p) => p !== lane) ??
    (lane && lane !== "gmat" ? "gmat" : "cat")) as string;

  const dualTracks =
    lane in DOMAIN_LABELS
      ? [
          `${DOMAIN_LABELS[lane]} (${laneQualifier(lane)})`,
          `${DOMAIN_LABELS[second] ?? "Second"} Fast-Track`,
          "+ Vedic Math HUD",
        ]
      : undefined;

  return (
    <div
      className={cn(
        layout === "row" ? "grid grid-cols-1 gap-3 md:grid-cols-3" : "flex flex-col gap-3",
      )}
    >
      {PLANS.map((p, idx) => {
        const selected = p.id === value;
        const unit = billing === "monthly" ? "mo" : "yr";
        const shown = p.billing[billing ?? "annual"];
        const tracks = p.id === "dual-lane" && dualTracks ? dualTracks : p.tracks;
        const isFree = shown === 0;
        const trialLabel =
          p.id === "single-lane"
            ? "7-DAY FREE TRIAL"
            : p.id === "dual-lane"
              ? "14-DAY FREE TRIAL"
              : null;
        return (
          <motion.button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + idx * 0.05, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex w-full flex-col border p-3.5 text-left transition",
              theme === "light" ? "rounded-[16px]" : "rounded-[20px]",
              selected
                ? "border-[var(--lime-55)] bg-[var(--lime-06)] shadow-[0_0_24px_var(--lime-12)]"
                : "border-[var(--glass-07)] hover:border-[var(--lime-40)]",
              !selected && (theme === "light" ? "bg-black/[0.04]" : "bg-black/25"),
            )}
          >
            {selected && (p.badge || trialLabel) && (
              <div className="absolute -top-2 right-2 flex items-center gap-1">
                {p.badge && (
                  <span className="whitespace-nowrap rounded-full bg-[var(--primary)] px-2 py-0.5 text-[8px] font-bold tracking-[0.14em] text-[var(--primary-foreground)]">
                    {p.badge}
                  </span>
                )}
                {trialLabel && (
                  <span className="whitespace-nowrap rounded-full border border-[var(--lime-40)] bg-[var(--panel-warm)] px-2 py-0.5 text-[8px] font-bold tracking-[0.14em] text-[var(--lime)]">
                    {trialLabel}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-1 items-stretch gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  selected
                    ? "border-[var(--lime-solid)] bg-[var(--lime-solid)] shadow-[0_0_10px_var(--lime-40)]"
                    : "border-[var(--glass-25)] bg-transparent",
                )}
              >
                {selected && <Check size={9} className="text-[var(--on-accent)]" strokeWidth={3.5} />}
              </span>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[13px] font-bold leading-tight text-foreground">
                    {p.name}
                  </span>
                  {p.id === "single-lane" && (
                    <span className="rounded bg-[var(--lime-15)] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.1em] text-[var(--lime)]">
                      {laneLabel(lane).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-[15px] font-bold leading-none text-[var(--lime)]">
                    {isFree ? "Free" : inr(shown)}
                  </span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {isFree ? "forever" : `/${unit}`}
                  </span>
                </div>

                <span className="mt-1.5 block min-h-[2.75em] text-[11px] leading-snug text-muted-foreground">
                  {p.desc}
                </span>

                <div className="mt-2.5 flex-1">
                  {tracks ? (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] tracking-[0.14em] text-muted-foreground">
                          UNLOCKED TRACKS:
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[9px] font-bold",
                            theme === "light" ? "text-[var(--cyan)]" : "text-cyan-400",
                          )}
                        >
                          {p.lanes} Lanes Active
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {tracks.map((t) =>
                          t.startsWith("+") ? (
                            <span
                              key={t}
                              className="rounded border border-dashed border-[var(--glass-18)] px-2 py-1 text-[10px] text-muted-foreground"
                            >
                              {t}
                            </span>
                          ) : (
                            <span
                              key={t}
                              className={cn(
                                "inline-flex items-center gap-1 rounded border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-[10px]",
                                theme === "light" ? "text-[var(--cyan)]" : "text-cyan-300",
                              )}
                            >
                              <Check size={10} /> {t}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-[11px] font-medium leading-snug text-muted-foreground"
                        >
                          <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-[var(--lime-12)] text-[var(--lime)]">
                            <Check size={9} strokeWidth={3.5} />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Plan hook overlay ── */

const PAY_MODES: { id: "upi" | "wallet" | "card"; label: string; Icon: typeof QrCode }[] = [
  { id: "upi", label: "U", Icon: QrCode },
  { id: "wallet", label: "GPay", Icon: Smartphone },
  { id: "card", label: "Card", Icon: CreditCard },
];

export function PlanIntro({
  onClose,
  onDone,
  onSkip,
  preloaded = false,
}: {
  onClose: () => void;
  /** Fired after a confirmed purchase, so callers can tell confirm apart from dismiss. */
  onDone?: () => void;
  /** "Skip for now": dismiss the whole intro with no goal recorded. */
  onSkip?: () => void;
  preloaded?: boolean;
}) {
  const store = useOnboardingStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const tone = usePlanTone();

  const [billing, setBilling] = useState<"annual" | "monthly">("annual");
  const [planId, setPlanId] = useState<PlanId>(store.planId ?? "dual-lane");
  const [pay, setPay] = useState<"upi" | "wallet" | "card">("upi");

  const lane = store.targetExam || store.planLane || "cat";
  const plan = PLANS.find((p) => p.id === planId)!;
  const total = plan.billing[billing];
  const isFree = planId === "initiate";

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closingRef = useRef(false);

  const fadeOut = useCallback((after?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const done = () => (after ? after() : onCloseRef.current());
    const el = overlayRef.current;
    if (!el) return done();
    el.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], {
      duration: 280,
      easing: "cubic-bezier(0.55, 0, 0.55, 0.2)",
      fill: "forwards",
    }).addEventListener("finish", done, { once: true });
  }, []);

  const confirm = useCallback(() => {
    store.setPlanId(planId);
    store.setPlanLane(lane);
    fadeOut(onDone);
  }, [store, planId, lane, fadeOut, onDone]);

  return (
    <IntroSurface ref={overlayRef} labelledBy="plan-hook-title" preloaded={preloaded}>
      {/* The headline block ("Pick your pace." + the one-pass line) stays
          centred, with the annual/monthly switch directly beneath it and
          the plan cards + pay-with rows running across the full width
          below. Mobile keeps exactly the same source order. */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* centered brand */}
          <FadeUp className="flex flex-col items-center gap-3.5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--lime-30)] bg-[var(--lime-10)] px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]" />
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--lime)]">
                MEMBERSHIP
              </span>
            </span>

            <h1
              id="plan-hook-title"
              className={cn(
                "text-[clamp(26px,8vw,34px)] font-black leading-none tracking-[-0.01em] text-foreground",
                SERIF,
              )}
            >
              Pick your <span className="text-[var(--lime)]">pace.</span>
            </h1>

            <p className={cn("max-w-[300px] text-[12.5px] leading-[1.5]", tone.soft)}>
              One pass, tuned to your exam —{" "}
              <span className="font-semibold text-foreground">{laneLabel(lane)}</span>. Switch or
              upgrade lanes anytime in Settings.
            </p>
          </FadeUp>

          {/* billing switch - directly under the headline block, centred */}
          <div
            className={cn(
              "relative mt-5 grid grid-cols-2 rounded-[14px] border p-1 mx-auto w-full max-w-[420px]",
              tone.surface,
            )}
          >

            <motion.span
              aria-hidden
              className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-[10px] bg-[var(--lime-solid)]"
              animate={{ x: billing === "monthly" ? "100%" : "0%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
            {(["annual", "monthly"] as const).map((b) => {
              const on = billing === b;
              const off =
                b === "annual"
                  ? realDiscount(PLANS[0].billing.annual, PLANS[0].billing.monthly)
                  : 0;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  aria-pressed={on}
                  className={cn(
                    "relative z-[1] rounded-[10px] py-2.5 text-center text-[13px] font-semibold transition-colors",
                    on ? "text-[var(--on-accent)]" : tone.soft,
                  )}
                >
                  {b === "annual" ? "Annual" : "Monthly"}
                  {off > 0 && b === "annual" && (
                    <span
                      className={cn(
                        "ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        on ? "bg-black/15" : "bg-[var(--lime-15)] text-[var(--lime)]",
                      )}
                    >
                      SAVE {off}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* plan cards — same component the adaptive reprompt "Select your plan" step uses.
              One row of three from md up, matching the pay-with row below. */}
          <div className="mt-3.5">
            <PlanSelector
              value={planId}
              onChange={setPlanId}
              lane={lane}
              onLaneChange={store.setPlanLane}
              billing={billing}
              layout="row"
            />
          </div>

          {/* pay with */}
          <p className={cn("mb-2.5 mt-5 px-0.5 text-[11px] font-semibold tracking-[0.12em]", tone.soft)}>
            PAY WITH
          </p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {PAY_MODES.map(({ id, label, Icon }) => {
              const on = pay === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPay(id)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] py-3 text-[13px] font-semibold transition",
                    on
                      ? "border-[var(--lime)] bg-[var(--lime-10)] text-[var(--lime)]"
                      : cn(tone.surface, "text-foreground"),
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
          </div>

          {/* fixed bottom bar */}
          <div className="relative shrink-0 pb-[max(0.75rem,var(--sab))] pt-3">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-7 h-7"
              style={{
                background: `linear-gradient(transparent, ${
                  theme === "light" ? "var(--overlay-solid)" : BG_MOSS
                })`,
              }}
            />

            <div className="mb-2.5 flex items-baseline justify-between gap-2 text-[12.5px]">
              <span className={cn("min-w-0 truncate", tone.soft)}>{plan.name}</span>
              <span className="flex shrink-0 items-baseline">
                <b className={cn("text-[19px] font-black text-foreground", SERIF)}>
                  {isFree ? "Free" : inr(total)}
                </b>
              </span>
            </div>

            <button
              type="button"
              onClick={confirm}
              className="w-full rounded-[14px] border-0 bg-[var(--lime-solid)] py-3 text-[13px] font-bold tracking-[0.03em] text-[var(--on-accent)] transition active:scale-[0.98]"
              style={{ boxShadow: "0 8px 24px -10px var(--lime-60)" }}
            >
              {plan?.id === "initiate"
                ? "Join Free"
                : plan?.id === "single-lane"
                  ? "15 Days Unrestricted Access"
                  : isFree
                    ? "Join Free"
                    : `Start My Pass ₹ ${inr(total)}/${billing === "annual" ? "Year" : "Month"}`}
            </button>

            <button
              type="button"
              onClick={() => (onSkip ? fadeOut(onSkip) : fadeOut())}
              className={cn(
                "mt-2.5 block w-full text-center text-[12px] underline-offset-2 transition-colors hover:underline",
                tone.soft,
              )}
            >
              Skip for now
            </button>
          </div>
    </IntroSurface>
  );
}
