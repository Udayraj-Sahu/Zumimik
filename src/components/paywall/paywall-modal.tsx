"use client";

import { useEffect, useRef, useState } from "react";
import { EMERALD_LIGHT, LIME, LIME_LIGHT, NEAR_BLACK_60, YELLOW } from "@/lib/theme";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Cpu,
  Layers,
  ShieldCheck,
  Signal,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { usePlanStore } from "@/stores/plan-store";
import { usePaywallStore } from "@/stores/paywall-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type { PlanId } from "@/lib/types/onboarding";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";
import { isNativeRuntime } from "@/lib/native/is-native";
import { ClearanceTiers, PREP_OPTIONS } from "@/components/paywall/clearance-tiers";

const ACCENT = LIME;
const ACCENT_DIM = LIME_LIGHT;

const PREP_METRICS: {
  id: string;
  label: string;
  value: string;
  meta: string;
  Icon: LucideIcon;
  warn?: boolean;
}[] = [
  { id: "lanes", label: "ACTIVE LANES", value: "1", meta: "/ 2 MAX", Icon: Layers, warn: true },
  { id: "drills", label: "DRILL CREDIT", value: "1", meta: "/ DAY", Icon: Timer, warn: true },
  { id: "drift", label: "ADAPTIVE DRIFT", value: "LOCKED", meta: "PRO ONLY", Icon: Cpu },
  { id: "report", label: "WEEKLY REPORT", value: "QUEUED", meta: "AUTO", Icon: BarChart3 },
];

const PREP_TELEMETRY: {
  id: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  tile: string;
  tileLight?: string;
  badge?: string;
}[] = [
  {
    id: "sims",
    title: "Infinite Simulated Batteries",
    desc: "Full-length drills with authentic percentile scaling and test-day time pressure.",
    Icon: Signal,
    tile: "border-[var(--lime-40)] bg-[var(--lime-10)] text-[var(--lime)]",
  },
  {
    id: "adaptive",
    title: "Adaptive Difficulty Engine",
    desc: "Difficulty shifts in real time to expand and reinforce your detected weak areas.",
    Icon: Activity,
    tile: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
    tileLight: "border-cyan-600/40 bg-cyan-400/10 text-[var(--cyan)]",
  },
  {
    id: "report",
    title: "Weekly Performance Report",
    desc: "Post-session breakdown showing exactly where you lost seconds and which shortcuts save the most.",
    Icon: BarChart3,
    tile: "border-[var(--lime-40)] bg-[var(--lime-10)] text-[var(--lime)]",
  },
  {
    id: "mentor",
    title: "1:1 Mentor Check-ins",
    desc: "Priority check-ins that keep your concurrent lane prep on schedule.",
    Icon: Cpu,
    tile: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300",
    tileLight: "border-fuchsia-600/40 bg-fuchsia-400/10 text-[var(--fuchsia)]",
    badge: "PRO",
  },
];

export function PaywallModal() {
  const open = usePaywallStore((s) => s.open);
  const action = usePaywallStore((s) => s.action);
  const closePaywall = usePaywallStore((s) => s.closePaywall);
  const setPro = usePlanStore((s) => s.setPro);
  const planId = useOnboardingStore((s) => s.planId);
  const planLane = useOnboardingStore((s) => s.planLane);
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const setPlanId = useOnboardingStore((s) => s.setPlanId);
  const setPlanLane = useOnboardingStore((s) => s.setPlanLane);

  const [planOptionId, setPlanOptionId] = useState<string>("dual-lane");
  const [lane, setLane] = useState<string>(planLane || targetExam || "cat");
  const theme = useThemeStore((s) => s.theme);
  const [state, setState] = useState<"idle" | "success">("idle");
  const overlayRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const [isNative] = useState(() => isNativeRuntime());
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setClosing(false);
      setPlanOptionId(planId ?? "dual-lane");
      setLane(planLane || targetExam || "cat");
      setState("idle");
      if (overlayRef.current) {
        overlayRef.current.animate(
          isNative
            ? [{ transform: "translateY(100%)" }, { transform: "translateY(0%)" }]
            : [{ transform: "translateX(100%)" }, { transform: "translateX(0%)" }],
          {
            duration: 320,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
      }
    }
    wasOpenRef.current = open;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, planId, planLane, targetExam, isNative]);

  const requestClose = () => {
    if (closing) return;
    if (isNative) {
      closePaywall();
      return;
    }
    setClosing(true);
    overlayRef.current
      ?.animate(
        [{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }],
        {
          duration: 280,
          easing: "cubic-bezier(0.33, 1, 0.68, 1)",
        },
      )
      .finished.then(() => closePaywall());
  };

  const confirmPlan = () => {
    const isFree = planOptionId === "initiate";
    setPlanId(planOptionId as PlanId);
    setPlanLane(lane);
    if (isFree) {
      requestClose();
      return;
    }
    setPro();
    setState("success");
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      requestClose();
    }, 450);
  };

  if (!open || !action) return null;

  const selectedPlan = PREP_OPTIONS.find((o) => o.id === planOptionId)!;
  const throttle = planOptionId === "dual-lane" ? 100 : planOptionId === "single-lane" ? 72 : 19;

  return createPortal(
    <div
      ref={overlayRef}
      data-theme-scope
      className={cn(
        "fixed inset-0 z-[70] flex flex-col items-center px-5",
        theme === "light" && "light",
        isNative ? "justify-end overflow-hidden" : "justify-center overflow-y-auto py-6",
      )}
    >
      <div
        className="fixed inset-0 -z-10"
        onClick={requestClose}
        style={{ background: NEAR_BLACK_60 }}
      />

      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden bg-[var(--bg-blue)] border border-white/[0.06]",
          isNative
            ? "rounded-t-[24px] border-b-0 shadow-[0_-12px_60px_var(--black-60)]"
            : "rounded-[24px] shadow-[0_12px_60px_var(--black-60)]",
        )}
      >
        {isNative && (
          <div className="absolute left-1/2 top-2.5 z-20 h-1 w-9 -translate-x-1/2 rounded-full bg-white/[0.12]" />
        )}

        {/* ambient glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-lime-400/[0.07] blur-[90px]" />
        <div className="pointer-events-none absolute right-0 top-[60%] h-64 w-64 rounded-full bg-violet-600/[0.07] blur-[100px]" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}55, transparent)` }}
        />

        {state === "success" ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-10 text-center"
              >
                <div
                  className="flex items-center gap-2 rounded-2xl border border-white/10 px-6 py-4 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--on-accent)]"
                  style={{
                    background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_DIM})`,
                    boxShadow: `0 10px 34px var(--lime-30), 0 1px 0 var(--glass-25) inset`,
                  }}
                >
                  <ShieldCheck size={15} strokeWidth={2.8} /> Access unlocked
                </div>
                <p className="font-mono text-[9px] font-bold tracking-wider text-[var(--lime)]">
                  Gates cleared — full prep throughput restored.
                </p>
              </motion.div>
            ) : (
              <div className="relative mx-auto flex max-h-[min(78vh,760px)] min-h-[540px] flex-col px-4 pt-7 pb-4">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {/* cap alert */}
                  <section className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.05] px-2.5 py-1.5">
                    <AlertTriangle
                      size={12}
                      className={cn(
                        "shrink-0",
                        theme === "light" ? "text-[var(--amber)]" : "text-amber-300",
                      )}
                    />
                    <span
                      className={cn(
                        "font-mono text-[8px] font-bold tracking-wider",
                        theme === "light" ? "text-[var(--amber)]" : "text-amber-300",
                      )}
                    >
                      FREE TIER CAP — CLEARANCE REQUIRED
                    </span>
                  </section>

                  {/* headline */}
                  <section>
                    <h1
                      id="paywall-title"
                      className="text-[26px] font-black uppercase leading-[1.1] tracking-tight"
                    >
                      Your loop is{" "}
                      <span
                        className="bg-gradient-to-r bg-clip-text text-transparent"
                        style={{ backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${EMERALD_LIGHT})` }}
                      >
                        capped.
                      </span>
                    </h1>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                      Free users run a single lane at limited throughput. Clear the cap to open
                      every exam track and unlock adaptive telemetry.
                    </p>
                  </section>

                  {/* HUD metrics grid */}
                  <section className="grid grid-cols-2 gap-2.5">
                    {PREP_METRICS.map(({ id, label, value, meta, Icon, warn }) => (
                      <div
                        key={id}
                        className={cn(
                          "relative overflow-hidden rounded-xl border p-3",
                          theme === "light" ? "bg-black/[0.04]" : "keep-white bg-black/40",
                          warn ? "border-amber-400/25" : "border-white/10",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "font-mono text-[7px] font-bold tracking-[0.18em]",
                              warn
                                ? theme === "light"
                                  ? "text-amber-700"
                                  : "text-amber-300/80"
                                : "text-muted-foreground/60",
                            )}
                          >
                            {label}
                          </span>
                          <Icon size={12} className={warn ? (theme === "light" ? "text-amber-700" : "text-amber-300") : "text-[var(--lime)]"} />
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-1">
                          <span
                            className="font-mono text-[18px] font-bold leading-none"
                            style={{ color: theme === "light" ? (warn ? "#B45309" : "var(--lime)") : warn ? YELLOW : ACCENT }}
                          >
                            {value}
                          </span>
                          <span className="font-mono text-[8px] font-medium text-muted-foreground/50">
                            {meta}
                          </span>
                        </div>
                        {warn && (
                          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                        )}
                      </div>
                    ))}
                  </section>

                  {/* throttle bar */}
                  <section className={cn("rounded-xl border border-white/10 p-3", theme === "light" ? "bg-black/[0.04]" : "keep-white bg-black/40")}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-muted-foreground/70">
                        LOOP THROTTLE
                      </span>
                      <span className="font-mono text-[10px] font-bold" style={{ color: theme === "light" ? "var(--lime)" : ACCENT }}>
                        {throttle}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${throttle}%` }}
                        transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${ACCENT}, ${EMERALD_LIGHT})` }}
                      />
                    </div>
                    <p className="mt-1.5 font-mono text-[7px] font-medium tracking-wider text-muted-foreground/40">
                      THROUGHPUT SCALES WITH CLEARANCE TIER
                    </p>
                  </section>

                  {/* unlocked telemetry */}
                  <section>
                    <div className="flex items-center justify-between">
                      <h2 className="font-mono text-[9px] font-bold tracking-[0.2em] text-muted-foreground/80">
                        UNLOCKED TELEMETRY
                      </h2>
                      <span className="font-mono text-[8px] font-bold tracking-wider text-[var(--lime)]">
                        {PREP_TELEMETRY.length} MODULES
                      </span>
                    </div>

                    <ul className="mt-3 space-y-2.5">
                      {PREP_TELEMETRY.map(({ id, title, desc, Icon, tile, tileLight, badge }) => (
                        <li
                          key={id}
                          className={cn("flex gap-3 rounded-xl border border-white/10 p-3", theme === "light" ? "bg-black/[0.04]" : "keep-white bg-black/40")}
                        >
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-lg border",
                              theme === "light" && tileLight ? tileLight : tile,
                            )}
                          >
                            <Icon size={15} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-[11px] font-bold uppercase leading-snug tracking-wide">
                                {title}
                              </h3>
                              {badge && (
                                <span className="shrink-0 rounded border border-[var(--lime-40)] bg-[var(--lime-10)] px-1.5 py-px font-mono text-[7px] font-bold tracking-wider text-[var(--lime)]">
                                  {badge}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/70">
                              {desc}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* clearance tiers */}
                  <ClearanceTiers value={planOptionId} onChange={setPlanOptionId} />
                </div>

                {/* sticky CTA */}
                <footer className="sticky bottom-0 z-10 -mx-4 border-t border-[var(--lime-20)] bg-[var(--bg-blue-95)] px-4 pb-1 pt-3 backdrop-blur">
                  <button
                    type="button"
                    onClick={confirmPlan}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-mono text-[11px] font-bold tracking-wider text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_DIM})`,
                      boxShadow:
                        "0 0 28px var(--lime-30), 0 1px 0 var(--glass-25) inset",
                    }}
                  >
                    <Zap size={14} />
                    {selectedPlan.cta}
                    {selectedPlan.price !== "FREE" && ` — ${selectedPlan.price}/YEAR`}
                  </button>
                  <p className="mt-2 text-center text-[9px] font-medium text-muted-foreground/35">
                    You can change this anytime in Settings.
                  </p>
                </footer>
              </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
