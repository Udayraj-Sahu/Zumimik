"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BG_MOSS, BLACKGREEN, CYAN, FOREST, FUCHSIA, GLASS_06, GLASS_09, GLASS_12, GLASS_BORDER, PANEL, SLATE_MUTED } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { createPortal } from "react-dom";
import { MotionConfig, motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react";
import { SPECTRUM_BARS, useVoiceSpectrum } from "@/hooks/use-voice-spectrum";
import {
  AlertTriangle,
  Brain,
  Footprints,
  Hourglass,
  Layers,
  Mic,
  Minus,
  Plus,
  Sandwich,
  Sigma,
  Sparkles,
  Square,
  Timer,
  TrainFront,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import s from "./story-intro.module.css";
import { applyStoryNotifications } from "@/lib/notifications/story-reminders";
import { parseCommitmentSpeech, VOICE_EXAMPLE } from "@/lib/story/commitment-speech";
import type { VoiceSession } from "@/lib/native/speech";
import {
  RECLAIM_MODULES as RECLAIM_META,
  DAY_LABELS as STORY_DAY_LABELS,
  TRIGGER_TYPES as STORY_TRIGGER_TYPES,
} from "@/lib/story/story-options";
import type { ReclaimConfig, StoryCommitment } from "@/lib/types/onboarding";
import { DAILY_TIME_OPTIONS } from "@/lib/types/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-store";

const ACCENT = "var(--lime)";

type Tone = "lime" | "cyan" | "fuchsia";

const toneChip: Record<Tone, string> = {
  lime: "border-[var(--lime-50)] bg-[var(--lime-10)] text-[var(--lime)]",
  cyan: "border-cyan-400/50 bg-cyan-400/10 text-[var(--cyan)]",
  fuchsia: "border-fuchsia-400/50 bg-fuchsia-400/10 text-[var(--fuchsia)]",
};

const toneText: Record<Tone, string> = {
  lime: "text-[var(--lime)]",
  cyan: "text-[var(--cyan)]",
  fuchsia: "text-[var(--fuchsia)]",
};

const toneHex: Record<Tone, string> = {
  lime: "var(--lime)",
  cyan: CYAN,
  fuchsia: FUCHSIA,
};

const toneDark: Record<Tone, string> = {
  lime: "var(--accent-foreground)",
  cyan: "#0E7490",
  fuchsia: "#A21CAF",
};

function withAlpha(color: string, percent: number): string {
  if (!color.startsWith("var(")) {
    const hex = Math.round((percent / 100) * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${hex}`;
  }
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

const RECLAIM_ICONS: Record<string, typeof TrainFront> = {
  "Subway Commute": TrainFront,
  "Lunch Break": Sandwich,
  "Evening Walk": Footprints,
};

const RECLAIM_MODULES = RECLAIM_META.map((m) => ({ ...m, icon: RECLAIM_ICONS[m.id] }));

const DAY_LABELS = STORY_DAY_LABELS;

const TRIGGER_TYPES = STORY_TRIGGER_TYPES;

const YEARLY_GOAL_HOURS = 350;

const TIME_OPTIONS = (() => {
  const out: string[] = [];
  for (let m = 0; m < 1440; m += 15) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
})();

const to12h = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? "");
  if (!m) return "--:--";
  const h = Number(m[1]);
  const min = Number(m[2]);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${min === 0 ? "" : `:${String(min).padStart(2, "0")}`} ${suffix}`;
};

const parseWindow = (w: string) => {
  const [a, b] = (w || " - ").split(" - ");
  return { from: (a ?? "").trim(), to: (b ?? "").trim() };
};

const toMinutes = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? "");
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
};

const LAST_SLOT = 23 * 60 + 45;

const clampWindow = (from: string, to: string): string => {
  const a = Math.min(LAST_SLOT, toMinutes(from));
  let b = Math.min(LAST_SLOT, toMinutes(to));
  if (b <= a) b = Math.min(LAST_SLOT, a + 15);
  const pad = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return `${pad(a)} - ${pad(b)}`;
};

const safeDays = (v?: boolean[]) =>
  v && v.length === 7 ? v : Array.from({ length: 7 }, () => true);

function cadenceLabel(days: boolean[]) {
  const n = days.filter(Boolean).length;
  if (n === 0) return "Paused";
  if (n === 7) return "Daily · 7/7";
  if (days.slice(0, 5).every(Boolean) && !days[5] && !days[6]) return "Weekday";
  if (days[5] && days[6] && days.slice(0, 5).every((d) => !d)) return "Weekend";
  return `${n}/7 days`;
}

const timeWith = (v: string) =>
  TIME_OPTIONS.includes(v) ? TIME_OPTIONS : [...TIME_OPTIONS, v].sort((a, b) => a.localeCompare(b));

function weekdayLabel(weeklyMin: number) {
  if (weeklyMin >= 60) {
    const h = (weeklyMin / 60).toFixed(1).replace(/\.0$/, "");
    return `~${h} hrs / week`;
  }
  return `${weeklyMin} min / week`;
}

/* ── Tween for the hero counter ── */

function useTween(target: number, ms = 450) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = a + (target - a) * eased;
      from.current = cur;
      setValue(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/* ── Shared panel shell ── */

function Panel({
  tone = "lime",
  className,
  children,
  ariaLabel,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const hex = toneHex[tone];
  const theme = useThemeStore((s) => s.theme);
  const line = theme === "light" ? toneDark[tone] : withAlpha(hex, 13.3);
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "relative overflow-hidden border p-4",
        theme === "light" ? "rounded-[16px] bg-black/[0.04]" : "rounded-2xl bg-black/25",
        className,
      )}
      style={{ borderColor: line }}
    >
      {/* top hairline + scan flicker */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${withAlpha(hex, 46.7)}, transparent)` }}
      />
      {/* corner brackets */}
      {(
        [
          "top-0 left-0 border-t border-l",
          "top-0 right-0 border-t border-r",
          "bottom-0 left-0 border-b border-l",
          "bottom-0 right-0 border-b border-r",
        ] as const
      ).map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={cn("pointer-events-none absolute z-10 size-[7px] opacity-70", pos)}
          style={{ borderColor: hex }}
        />
      ))}
      {children}
    </section>
  );
}

function SectionHead({
  icon,
  title,
  right,
  rightClass,
}: {
  icon: React.ReactNode;
  title: string;
  right?: string;
  rightClass?: string;
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-2">
      <h2
        className={cn(
          "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        )}
      >
        <span className="flex-none [&>svg]:size-[12px] [&>svg]:text-[var(--lime)]">{icon}</span>
        {title}
      </h2>
      {right && (
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cyan)]",
            rightClass,
          )}
        >
          {right}
        </p>
      )}
    </div>
  );
}

function Dot({
  color = ACCENT,
  pulse,
  small,
}: {
  color?: string;
  pulse?: boolean;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block flex-none rounded-full",
        small ? "size-[5px]" : "size-[6px]",
        pulse && "animate-pulse",
      )}
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

function Sel({
  value,
  onChange,
  label,
  flex,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  flex?: boolean;
}) {
  const options = timeWith(value);
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "min-w-0 cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-[7px]  text-[10px] font-medium text-foreground outline-none appearance-none tabular-nums",
        flex && "flex-1 basis-[104px]",
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%237c8883' stroke-width='1.5'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 7px center",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-[var(--bg-deep)] text-foreground">
          {to12h(o)}
        </option>
      ))}
    </select>
  );
}

function Stepper({
  value,
  options,
  onSpin,
  label,
  unit,
  tone,
}: {
  value: number;
  options: number[];
  onSpin: (v: number) => void;
  label: string;
  unit: string;
  tone: Tone;
}) {
  const idx = Math.max(0, options.indexOf(value));
  const theme = useThemeStore((s) => s.theme);
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex flex-none items-center gap-[6px] rounded-full border p-[4px]",
        theme === "light"
          ? "border-black/[0.10] bg-black/[0.04]"
          : "keep-white border-white/[0.08] bg-black/40",
      )}
    >
      <button
        type="button"
        aria-label={`Reduce ${label}`}
        disabled={idx <= 0}
        onClick={() => onSpin(options[idx - 1])}
        className="grid size-6 place-items-center rounded-full bg-white/[0.06] text-muted-foreground transition-opacity disabled:opacity-35"
      >
        <Minus size={12} strokeWidth={3} />
      </button>
      <span
        className={cn(
          "flex min-w-[44px] flex-col items-center font-bold leading-[1.15] text-foreground tabular-nums",
        )}
      >
        <span className="text-[11px]">{value}</span>
        <i className="text-[8px] font-medium not-italic text-white/60">{unit}</i>
      </span>
      <button
        type="button"
        aria-label={`Raise ${label}`}
        disabled={idx >= options.length - 1}
        onClick={() => onSpin(options[idx + 1])}
        className={cn(
          "grid size-6 place-items-center rounded-full text-[var(--on-accent)] transition-opacity disabled:opacity-35",
          tone === "lime" ? "bg-[var(--lime-solid)]" : tone === "cyan" ? "bg-cyan-400" : "bg-fuchsia-400",
        )}
      >
        <Plus size={12} strokeWidth={3} />
      </button>
    </div>
  );
}

function DayButtons({
  days,
  onChange,
  tone,
}: {
  days: boolean[];
  onChange: (i: number) => void;
  tone: Tone;
}) {
  const onBg = tone === "lime" ? "var(--lime-solid)" : tone === "cyan" ? CYAN : FUCHSIA;
  return (
    <div role="group" aria-label="Active days" className="flex gap-[4px]">
      {DAY_LABELS.map((d, i) => (
        <button
          key={`${d}-${i}`}
          type="button"
          aria-pressed={!!days[i]}
          aria-label={`Day ${d} ${i + 1}`}
          onClick={() => onChange(i)}
          className="size-[22px] rounded-[6px] border-0  text-[9.5px] font-bold leading-none transition-colors"
          style={
            days[i]
              ? { background: onBg, color: BLACKGREEN, boxShadow: tone === "lime" ? "0 0 12px var(--lime-40)" : `0 0 12px ${onBg}66` }
              : { background: GLASS_06, color: SLATE_MUTED }
          }
        >
          {d}
        </button>
      ))}
    </div>
  );
}

/* ── Overlapping span for a segment ── */

const overlapFraction = (start: number, end: number, from: number, to: number) =>
  Math.max(0, Math.min(end, to) - Math.max(start, from)) / (end - start);

/* ── Day decompiler rail ── */

function DayRail({ value, spanMin }: { value: StoryCommitment; spanMin: number }) {
  const modIdx = RECLAIM_MODULES.findIndex((m) => m.id === value.reclaimSlot);
  const tone = modIdx >= 0 ? RECLAIM_MODULES[modIdx].tone : "lime";
  const theme = useThemeStore((s) => s.theme);
  const window = value.reclaimConfigs?.[value.reclaimSlot]?.window ?? value.reclaimWindow;
  const { from } = parseWindow(window);
  const fromMin = toMinutes(from);
  const hex = toneHex[tone];
  const minutes = Math.min(1440, Math.max(0, spanMin || 0));
  const lightFrom = Math.min(fromMin, 1440 - Math.max(0, minutes - 1));
  const lightTo = Math.min(1440, lightFrom + minutes);
  const hours = Array.from({ length: 24 }, (_, h) =>
    overlapFraction(h * 60, (h + 1) * 60, lightFrom, lightTo),
  );

  return (
    <div className="mt-4" aria-label="24-hour day rail with reclaim span highlighted">
      <div className="relative flex h-10 items-stretch gap-[3px]">
        {hours.map((ov, h) => {
          const sleeping = h < 6 || h >= 23;
          const base = sleeping ? GLASS_06 : GLASS_12;
          const lit = ov > 0;
          return (
            <div
              key={h}
              className="relative h-full flex-1 rounded-[3px]"
              style={{
                background: lit ? hex : base,
                boxShadow: lit ? `0 0 10px ${withAlpha(hex, 33.3)}, 0 0 1px ${hex}` : undefined,
                opacity: lit ? 0.95 : sleeping ? 0.7 : 1,
                transition: "background 300ms ease, box-shadow 300ms ease, opacity 300ms ease",
              }}
            />
          );
        })}
        {/* scanning sweep */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-10 w-[2px] rounded-full"
          style={{ background: `linear-gradient(180deg, transparent, var(--lime), transparent)` }}
          animate={{ left: ["12%", "88%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
        />
      </div>

      <div className="mt-1.5 flex justify-between px-0.5  text-[8px] text-white/30">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1  text-[8.5px] font-bold uppercase tracking-[0.1em]"
          style={{
            borderColor: withAlpha(hex, 33.3),
            background: withAlpha(hex, 7.8),
            color: theme === "light" ? toneDark[tone] : hex,
          }}
        >
          <Dot color={hex} small />
          {value.reclaimSlot || "Reclaim Slot"} · {to12h(from)} · {minutes} MIN
        </span>
        <span className=" text-[8.5px] tracking-[0.14em] text-white/50">decompiled</span>
      </div>
    </div>
  );
}

/* ── Compact per-module rail ── */

function MiniRail({ window, tone }: { window: string; tone: Tone }) {
  const { from, to } = parseWindow(window);
  const a = toMinutes(from);
  const b = Math.max(toMinutes(to), a + 10);
  const hex = toneHex[tone];
  return (
    <div className="flex h-[10px] items-stretch gap-[2px]" aria-hidden>
      {Array.from({ length: 24 }, (_, h) => {
        const ov = overlapFraction(h * 60, (h + 1) * 60, a, b);
        return (
          <span
            key={h}
            className="flex-1 rounded-[2px]"
            style={{
              background: ov > 0 ? hex : GLASS_09,
              opacity: ov > 0 ? 0.9 : 1,
              boxShadow: ov > 0 ? `0 0 6px ${withAlpha(hex, 26.7)}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Reclaim module card ── */

/* One card for all three presets. The tags pick which slot is active; the
   controls below them always edit that slot, so the section is one card tall
   instead of three and the per-preset config is never edited out of sight. */
function ReclaimPanel({
  value,
  onChange,
}: {
  value: StoryCommitment;
  onChange: (patch: Partial<StoryCommitment>) => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  const activeIdx = Math.max(
    0,
    RECLAIM_MODULES.findIndex((m) => m.id === value.reclaimSlot),
  );
  const active = RECLAIM_MODULES[activeIdx];
  const Icon = active.icon;
  const tone = active.tone;
  const activeWindow = value.reclaimConfigs?.[active.id]?.window ?? value.reclaimWindow;
  const win = parseWindow(activeWindow);
  const days = safeDays(value.reclaimConfigs?.[active.id]?.days ?? value.weekDays);
  const cadence = cadenceLabel(days);

  const patchModule = (window: string, nextDays: boolean[]) =>
    onChange({
      reclaimConfigs: {
        ...(value.reclaimConfigs ?? {}),
        [active.id]: { window, days: nextDays },
      },
    });

  return (
    <Panel tone={tone} ariaLabel="Dead-time presets" className="p-3.5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full border",
            toneChip[tone],
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-[13px] font-semibold leading-tight text-foreground")}>
            {active.id}
          </h3>
          <p className="mt-0.5 text-[9px] font-medium text-white/60">{active.sub}</p>
        </div>
        <span className={cn("whitespace-nowrap text-[10px] font-bold", toneText[tone])}>
          {active.slotMin} MIN
        </span>
      </div>

      <div role="radiogroup" aria-label="Reclaim slot" className="mt-3 flex flex-wrap gap-2">
        {RECLAIM_MODULES.map(({ id: tagId, icon: TagIcon, tone: tagTone }) => {
          const on = tagId === active.id;
          return (
            <button
              key={tagId}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange({ reclaimSlot: tagId })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-bold tracking-[0.03em] transition-colors",
                on ? toneChip[tagTone] : "border-white/[0.10] bg-white/[0.03] text-white/55",
              )}
            >
              <TagIcon className="size-3 shrink-0" strokeWidth={2.2} />
              {tagId}
            </button>
          );
        })}
      </div>

      <div className={cn("mt-3 rounded-lg border p-2.5", theme === "light" ? "border-black/[0.10] bg-black/[0.04]" : "keep-white border-white/[0.06] bg-white/[0.03]")}>
        <span
          className={cn(
            "inline-flex items-center font-medium text-[9px] uppercase tracking-[0.12em] text-white/60",
          )}
        >
          Window:
        </span>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-[6px]">
          <Sel
            label={`${active.id} window start`}
            value={win.from}
            onChange={(v) => patchModule(clampWindow(v, win.to || "00:00"), days)}
            flex
          />
          <Sel
            label={`${active.id} window end`}
            value={win.to}
            onChange={(v) => patchModule(clampWindow(win.from || "00:00", v), days)}
            flex
          />
        </div>
      </div>

      <div className="mt-3">
        <MiniRail window={activeWindow} tone={tone} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
        <span
          className={cn(
            "inline-flex flex-none items-center font-medium text-[9px] uppercase tracking-[0.12em] text-white/60",
          )}
        >
          Cadence:
        </span>
        <DayButtons
          days={days}
          onChange={(i) =>
            patchModule(
              activeWindow,
              days.map((v, j) => (j === i ? !v : v)),
            )
          }
          tone={tone}
        />
        <span
          className={cn(
            "ml-auto whitespace-nowrap text-right text-[10px] font-bold",
            toneText[tone],
          )}
        >
          {cadence}
        </span>
      </div>
    </Panel>
  );
}

/* ── Voice commitment ── */

/**
 * Decorative stand-in for when there is no usable microphone signal — a denied
 * permission, no Web Audio, or the Android WebView where the speech recogniser
 * already owns the mic. One continuous crest sampled into thin bars, each on the
 * same keyframes at a negative delay so the crest travels left to right instead
 * of every bar pulsing together. Frozen under reduced motion.
 */
const WAVE_BARS = 28;
const WAVE_FRAMES = ["10%", "26%", "54%", "18%", "78%", "34%", "12%"];

function DecorativeWave({ active }: { active: boolean }) {
  const still = useReducedMotion();
  const live = active && !still;
  return (
    <span aria-hidden className="absolute inset-0 flex items-end justify-center gap-[2px] px-3">
      {Array.from({ length: WAVE_BARS }, (_, i) => (
        <motion.span
          key={i}
          className="flex-1 origin-bottom rounded-full bg-[var(--primary)]"
          initial={{ scaleY: 0.08 }}
          animate={live ? { scaleY: WAVE_FRAMES } : { scaleY: 0.08 }}
          transition={
            live
              ? { duration: 1.15, repeat: Infinity, ease: "easeInOut", delay: -(i * 0.028) }
              : { duration: 0.25 }
          }
        />
      ))}
    </span>
  );
}

/**
 * The Siri-style spectrum that grows out of the bottom edge of the bar.
 *
 * Absolutely positioned and behind the row's own content, so it is visually
 * attached to the search bar without ever participating in layout. Bars are
 * full-height and moved only by `scaleY` from a bottom origin, which keeps the
 * whole thing on the compositor.
 */
function VoiceSpectrum({ active }: { active: boolean }) {
  const still = useReducedMotion();
  const { hostRef, status } = useVoiceSpectrum(active && !still);

  if (status === "unavailable") return <DecorativeWave active={active} />;

  return (
    <span
      ref={hostRef}
      aria-hidden
      className="absolute inset-0 flex items-end gap-[2px] px-3 transition-opacity duration-300"
      style={{ opacity: active ? 1 : 0 }}
    >
      {Array.from({ length: SPECTRUM_BARS }, (_, i) => (
        <span
          key={i}
          className="flex-1 origin-bottom rounded-full bg-[var(--primary)] will-change-transform"
          style={{ transform: "scaleY(0.02)" }}
        />
      ))}
    </span>
  );
}

/**
 * Dictates the whole commitment in one sentence instead of working six
 * controls. Idle it is only a mic; tapping opens a listening overlay, so the
 * input never takes space away from the form it fills.
 *
 * The recogniser is only offered when the platform reports a usable one, so on
 * a device without a mic the control disappears rather than sitting there
 * broken.
 */
function VoiceCommitmentBar({
  value,
  onChange,
}: {
  value: StoryCommitment;
  onChange: (patch: Partial<StoryCommitment>) => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const sessionRef = useRef<VoiceSession | null>(null);
  const cancelledRef = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const still = useReducedMotion();

  useEffect(() => {
    let alive = true;
    void import("@/lib/native/speech")
      .then((m) => m.isVoiceSupported())
      .then((ok) => {
        if (alive) setSupported(ok);
      })
      .catch(() => {
        if (alive) setSupported(false);
      });
    return () => {
      alive = false;
      cancelledRef.current = true;
      if (settleTimer.current) clearTimeout(settleTimer.current);
      void sessionRef.current?.stop();
    };
  }, []);

  const clearTimer = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
  };

  const settle = (text: string) => {
    const { patch, labels: found } = parseCommitmentSpeech(text, value);
    if (found.length === 0) {
      setLabels([]);
      setError(`Didn't catch a time, a day or a slot in "${text.trim()}".`);
      return;
    }
    onChange(patch);
    setTranscript(text);
    setLabels(found);
    setError(null);
    // Hold the result up long enough to read before the overlay collapses.
    clearTimer();
    settleTimer.current = setTimeout(() => {
      setOpen(false);
      setTranscript("");
      setLabels([]);
    }, 1900);
  };

  const start = async () => {
    clearTimer();
    cancelledRef.current = false;
    setError(null);
    setTranscript("");
    setLabels([]);
    setSpeaking(false);
    setOpen(true);

    const { startVoiceCapture } = await import("@/lib/native/speech");
    const session = await startVoiceCapture({
      // The first partial is the earliest signal that the user has actually
      // started talking, which is what wakes the spectrum up.
      onPartial: (text) => {
        setSpeaking(true);
        setTranscript(text);
      },
      onFinal: (text) => {
        sessionRef.current = null;
        setSpeaking(false);
        if (cancelledRef.current) return;
        if (text) settle(text);
        else setError("Didn't hear anything. Try again.");
      },
      onError: (text) => {
        sessionRef.current = null;
        setSpeaking(false);
        if (cancelledRef.current) return;
        setError(text);
      },
    });
    if (session) sessionRef.current = session;
  };

  const stop = async () => {
    const session = sessionRef.current;
    if (!session) return;
    await session.stop();
  };

  if (supported === false) return null;

  const listening = open && !error;

  return (
    <div className="mt-4 flex flex-col items-center gap-2.5">
      {/* The mic stretches into the bar it becomes, so the control never moves
          anywhere — layout FLIPs the same element rather than swapping one
          component for another. */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        className={cn(
          "relative flex items-center overflow-hidden bg-black transition-colors duration-300",
          open ? "h-14 w-full max-w-[22rem] rounded-full" : "h-14 w-14 rounded-full",
        )}
>
        {/* Behind the row's own content and out of flow, so the crest is attached
            to the bar's bottom edge without ever shifting the layout. */}
        <VoiceSpectrum active={speaking} />

        <motion.button
          layout
          type="button"
          onClick={listening ? stop : start}
          aria-label={listening ? "Stop listening" : "Dictate your routine"}
          whileTap={still ? undefined : { scale: 0.93 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className={cn(
            "relative z-10 grid flex-none place-items-center rounded-full text-white dark:text-white",
            open ? "ml-1.5 size-11" : "size-14",
          )}
        >
          {listening ? (
            <Square className="relative size-3.5" strokeWidth={3} />
          ) : (
            <Mic className="relative size-5" strokeWidth={2.2} />
          )}
        </motion.button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="voice-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex min-w-0 flex-1 items-center gap-3 py-2 pl-1 pr-4"
            >
              <span
                aria-live="polite"
                className={cn(
                  "min-w-0 flex-1 truncate text-[12px] leading-tight font-medium",
                  transcript ? "text-white/90" : "text-white/35",
                )}
              >
{error ? error : speaking ? transcript : null}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence initial={false}>
        {labels.length > 0 && (
          <motion.div
            key="voice-labels"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="flex w-full max-w-[22rem] flex-wrap items-center justify-center gap-2"
          >
            {labels.map((label) => (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="rounded-md border border-[var(--lime-40)] bg-[var(--lime-10)] px-2.5 py-1.5 text-[10px] font-bold tracking-[0.03em] text-[var(--lime)]"
              >
                {label}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <p className="max-w-[17rem] text-center text-[10px] leading-[1.45] font-medium text-white/45">
          Tap and say it instead — <span className="text-white/60">{VOICE_EXAMPLE}</span>
        </p>
      )}
    </div>
  );
}

/* ── Presentational: single-page commitment form (used by StoryIntro & AdaptiveReprompt) ── */

export function StoryCommitmentMatrix({
  value,
  onChange,
}: {
  value: StoryCommitment;
  onChange: (patch: Partial<StoryCommitment>) => void;
}) {
  const days = safeDays(value.reclaimConfigs?.[value.reclaimSlot]?.days ?? value.weekDays);
  const daysActive = days.filter(Boolean).length;
  const mins = value.dailyMinutes ?? 30;
  const weeklyMin = mins * daysActive;
  const annualHours = (weeklyMin * 52) / 60;
  const weeklyHours = weeklyMin / 60;
  const sprints = Math.max(1, Math.floor(mins / 15));
  const pct = Math.min(100, (annualHours / YEARLY_GOAL_HOURS) * 100);

  const shownHours = Math.round(useTween(annualHours));
  const shownPct = useTween(pct);

  return (
    <div className="flex flex-col">
      {/* Hero — annual time reclaimed + day rail */}
      <Panel tone="lime" ariaLabel="Annual time reclaimed" className="mt-3">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-500/10 blur-[70px]"
        />
        <div className="relative flex items-start justify-between gap-[10px]">
          <span
            className={cn(
              "flex items-start gap-2 text-[9px] font-semibold uppercase leading-[1.45] tracking-[0.16em] text-muted-foreground",
            )}
          >
            <Hourglass size={13} className="mt-px flex-none text-[var(--lime)]" />
            <span>
              Annual time
              <br />
              reclaimed
            </span>
          </span>
          <span className="inline-flex flex-none items-center gap-[6px] rounded-full border border-[var(--lime-30)] bg-[var(--lime-08)] px-2.5 py-1.5  text-[8.5px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[var(--lime)]">
            <Zap size={11} />
            <span>
              Speed booster
              <br />+{Math.min(60, Math.round((mins / 30) * 25))}%
            </span>
          </span>
        </div>

        <p className="relative my-2 flex items-baseline gap-2 whitespace-nowrap" aria-live="polite">
          <b
            className={cn(
              "text-[clamp(26px,8vw,34px)] font-bold leading-none tracking-[-0.02em] text-[var(--lime)] tabular-nums",
            )}
            style={{ textShadow: "0 0 24px var(--lime-40)" }}
          >
            +{shownHours}
          </b>
          <span className={cn("text-[11px] font-semibold tracking-[0.1em] text-white/80")}>
            HOURS / YEAR
          </span>
        </p>

        {/* day decompiler rail — lit span scales with daily minutes */}
        <DayRail value={value} spanMin={mins} />

        <div className="relative flex items-center justify-between gap-2  text-[10px] leading-[1.4]">
          <span className="text-[var(--cyan)]">
            <Dot color={CYAN} small /> +{weeklyHours.toFixed(2)} hrs/week converted
          </span>
          <span className="text-white/60">Compounding daily</span>
        </div>

        <div
          className="relative mt-2 h-[6px] overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-label={`Progress toward ${YEARLY_GOAL_HOURS} hours a year`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${shownPct}%`,
              background: `linear-gradient(90deg, ${CYAN}, var(--lime))`,
              boxShadow: "0 0 10px var(--lime-50)",
              transition: "width 300ms ease",
            }}
          />
        </div>
      </Panel>

      {/* Daily practice module */}
      <SectionHead right="Core multiplier" icon={<Timer size={12} />} title="Daily practice" />
      <Panel tone="lime" ariaLabel="Daily practice" className="mt-3 p-3.5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border",
              toneChip.lime,
            )}
          >
            <Timer className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-[13px] font-semibold leading-tight text-foreground")}>
              Sprint session
            </h3>
            <p className="mt-0.5 text-[9px] font-medium text-[var(--lime)]">
              {sprints} {sprints === 1 ? "sprint" : "sprints"} × {Math.round(mins / sprints)} min
              blocks
            </p>
          </div>
          <Stepper
            label="daily minutes"
            value={mins}
            options={DAILY_TIME_OPTIONS}
            tone="lime"
            unit="min/day"
            onSpin={(v) => onChange({ dailyMinutes: v })}
          />
        </div>

        {/* sprint blocks rail — also scales with minutes */}
        <div className="mt-3 flex items-end gap-[3px]" aria-hidden>
          {Array.from({ length: sprints }, (_, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-[3px]"
              style={{
                height: `${16 + ((i * 3) % 9)}px`,
                background: `linear-gradient(180deg, ${i === sprints - 1 ? ACCENT : "var(--lime-40)"}, ${i === sprints - 1 ? "var(--lime-133)" : "var(--lime-067)"})`,
                transition: "height 300ms ease",
              }}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
          <span
            className={cn(
              "inline-flex flex-none items-center text-[9px] font-medium uppercase tracking-[0.12em] text-white/60",
            )}
          >
            Remind at:
          </span>
          <Sel
            label="Daily reminder time"
            value={value.reminderTime}
            onChange={(v) => onChange({ reminderTime: v })}
            flex
          />
        </div>
      </Panel>

      {/* Reclaim modules */}
      <SectionHead right="Where it hides" icon={<Layers size={12} />} title="Dead-time presets" />
      <ReclaimPanel value={value} onChange={onChange} />

      {/* Dynamic formula */}
      <Panel tone="cyan" ariaLabel="Dynamic practice formula" className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className={cn(
              "flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
            )}
          >
            <Sigma size={12} className="flex-none text-[var(--lime)]" />
            Dynamic formula
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--cyan)]",
            )}
          >
            <Dot color={CYAN} small pulse /> Live parser
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="rounded-md border border-cyan-400/50 bg-cyan-400/10 px-2.5 py-1.5  text-[10px] font-bold tracking-[0.03em] text-[var(--cyan)]">
            {sprints} {sprints === 1 ? "Stack" : "Stacks"} configured
          </span>
          <span className=" text-[11px] font-medium text-white/60">=</span>
          <span className="rounded-md border border-[var(--lime-40)] bg-[var(--lime-10)] px-2.5 py-1.5  text-[10px] font-bold tracking-[0.03em] text-[var(--lime)]">
            {mins} min/day
          </span>
        </div>
        <p className="mt-2.5 text-[10px] leading-[1.4] font-medium text-white/80">
          daily practice compounded across {daysActive} day{daysActive === 1 ? "" : "s"} a week
        </p>
        <span className="mt-2 inline-block rounded-md border border-[var(--lime-40)] bg-[var(--lime-08)] px-2.5 py-1.5  text-[10px] font-bold tracking-[0.03em] text-[var(--lime)]">
          {weekdayLabel(weeklyMin)} reclaimed
        </span>
        <p className="mt-2.5  flex items-center gap-1.5 text-[9.5px] leading-[1.3] text-[var(--cyan)]">
          <Dot color={CYAN} small /> Reminder + trigger notifications primed
        </p>
      </Panel>

      {/* Trigger decoder */}
      <Panel tone="fuchsia" ariaLabel="Trigger decoder" className="mt-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border",
              toneChip.fuchsia,
            )}
          >
            <Brain className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "flex items-center gap-1.5 text-[12px] font-semibold leading-tight text-foreground",
              )}
            >
              Trigger Decoder
              <span className="rounded bg-fuchsia-400/15 px-1.5 py-0.5  text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--fuchsia)]">
                Live sync
              </span>
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TRIGGER_TYPES.map((tr) => (
                <button
                  key={tr}
                  type="button"
                  aria-pressed={value.triggerType === tr}
                  onClick={() => onChange({ triggerType: tr })}
                  className={cn(
                    "rounded-md border px-2 py-1  text-[8.5px] font-bold uppercase tracking-[0.05em] transition-colors",
                    value.triggerType === tr
                      ? "border-fuchsia-400/55 bg-fuchsia-400/15 text-[var(--fuchsia)]"
                      : "border-white/[0.08] text-white/70",
                  )}
                >
                  {tr}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
          <span
            className={cn(
              "inline-flex flex-none items-center text-[9px] font-medium uppercase tracking-[0.12em] text-white/60",
            )}
          >
            Trigger at:
          </span>
          <Sel
            label="Trigger time"
            value={value.triggerTime}
            onChange={(v) => onChange({ triggerTime: v })}
            flex
          />
        </div>
      </Panel>

      <VoiceCommitmentBar value={value} onChange={onChange} />
    </div>
  );
}

/* ── "Decode your day" flow (StoryIntro) ──
   Scoped port of the supplied design: one self-contained module so the overlay
   owns its own visuals, with every colour mapped onto the app's theme tokens. */


const DD_WK = [0, 1, 2, 3, 4];
const DD_ALL = [0, 1, 2, 3, 4, 5, 6];
const DD_DUR = [5, 10, 15, 20, 30];
const DD_DUR_LONG = [5, 10, 15, 20, 30, 45];
const DD_PRESETS = [DD_ALL, DD_WK, [5, 6]];
const DD_LAST_SLOT = 23 * 60 + 45;

type DDTone = "p" | "n" | "l" | "s";
type DDSlot = { t: number; d: number; days: number[] };
type DDItem = { n: string; i: string; sl: DDSlot[]; on: boolean };
type DDGroup = { n: string; i: string; items: DDItem[] };
type DDCat = { key: string; label: string; icon: string; tone: DDTone };
type DDLog = { h: number; c: string };
type DDSheetState = { k: string; j: number; t: number; d: number; days: number[] };
type DDRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

const ddSlot = (t: number, d: number, days: number[]): DDSlot => ({ t, d, days: [...days] });
const ddItem = (n: string, i: string, sl: DDSlot[]): DDItem => ({ n, i, sl, on: false });
const ddPad2 = (n: number) => String(n).padStart(2, "0");
const ddHourOf = (t: number) => Math.floor(t / 60) % 24;

/** "8:30a" / "6p" / "12a" */
const ddF = (t: number) => {
  let h = ddHourOf(t);
  const m = t % 60;
  const ap = h < 12 ? "a" : "p";
  h = h % 12 || 12;
  return `${h}${m ? `:${ddPad2(m)}` : ""}${ap}`;
};
const ddHourLabel = (h: number) => ddF(h * 60);

/** "10:00 AM" */
const ddF12 = (t: number) => {
  const h = ddHourOf(t);
  return `${h % 12 || 12}:${ddPad2(t % 60)} ${h < 12 ? "AM" : "PM"}`;
};

const ddDayList = (days: number[]) => {
  const sorted = [...days].sort((a, b) => a - b);
  const joined = sorted.join();
  if (days.length === 7) return "Daily";
  if (joined === "0,1,2,3,4") return "Weekdays";
  if (joined === "5,6") return "Weekends";
  return sorted.map((i) => DAY_LABELS[i]).join("");
};

const ddToggleIn = (days: number[], i: number) => {
  const at = days.indexOf(i);
  if (at > -1) return days.length > 1 ? days.filter((_, n) => n !== at) : days;
  return [...days, i].sort((a, b) => a - b);
};

const ddSum = (x: DDItem) => {
  const same = x.sl.every((s) => ddDayList(s.days) === ddDayList(x.sl[0].days));
  return `${x.sl.map((s) => `${ddF(s.t)} ${s.d}m`).join(" · ")} · ${same ? ddDayList(x.sl[0].days) : "Varies"}`;
};

const DD_CATS: DDCat[] = [
  { key: "study", label: "Studied", icon: "📚", tone: "p" },
  { key: "work", label: "Worked", icon: "💼", tone: "p" },
  { key: "workout", label: "Worked out", icon: "💪", tone: "p" },
  { key: "trip", label: "Travelled", icon: "🚇", tone: "n" },
  { key: "rest", label: "Ate or rested", icon: "🍽️", tone: "n" },
  { key: "chores", label: "Chores", icon: "🧺", tone: "n" },
  { key: "scroll", label: "Scrolled", icon: "📱", tone: "l" },
  { key: "idle", label: "Idle or waiting", icon: "⏳", tone: "l" },
];

const ddCatOf = (cats: DDCat[], key: string): DDCat =>
  key === "skip"
    ? { key: "skip", label: "Skipped", icon: "–", tone: "s" }
    : (cats.find((c) => c.key === key) ?? { key, label: key, icon: "?", tone: "s" });

const ddGroups = (): DDGroup[] => {
  const groups: DDGroup[] = [
    {
      n: "Commute",
      i: "🚇",
      items: [
        ddItem("Subway or train", "🚇", [ddSlot(510, 20, DD_WK), ddSlot(1050, 20, DD_WK)]),
        ddItem("Bus or cab", "🚌", [ddSlot(540, 20, DD_WK)]),
        ddItem("Walk to the station", "🚶", [ddSlot(500, 10, DD_WK)]),
        ddItem("Long journey", "✈️", [ddSlot(480, 45, [5])]),
      ],
    },
    {
      n: "Breaks",
      i: "☕",
      items: [
        ddItem("Morning chai", "☕", [ddSlot(435, 10, DD_ALL)]),
        ddItem("Lunch break", "🍱", [ddSlot(780, 15, DD_WK)]),
        ddItem("Tea break", "🫖", [ddSlot(660, 10, DD_WK), ddSlot(990, 10, DD_WK)]),
        ddItem("Scroll swap", "📱", [ddSlot(1290, 10, DD_ALL)]),
      ],
    },
    {
      n: "Waiting",
      i: "⏳",
      items: [
        ddItem("Queue or line", "🧍", [ddSlot(1020, 10, DD_WK)]),
        ddItem("Clinic or bank", "🏥", [ddSlot(660, 15, [5])]),
        ddItem("Cab or delivery", "📦", [ddSlot(1140, 5, DD_ALL)]),
        ddItem("Idle gaps", "⏳", [ddSlot(900, 10, DD_WK)]),
      ],
    },
    {
      n: "Work gaps",
      i: "💼",
      items: [
        ddItem("Between meetings", "🔀", [ddSlot(690, 5, DD_WK), ddSlot(930, 5, DD_WK)]),
        ddItem("Waiting on a file or build", "⌛", [ddSlot(600, 10, DD_WK)]),
        ddItem("Post-lunch dip", "😪", [ddSlot(870, 10, DD_WK)]),
      ],
    },
    {
      n: "Home",
      i: "🏠",
      items: [
        ddItem("Getting ready", "🪥", [ddSlot(420, 10, DD_WK)]),
        ddItem("Cooking", "🍳", [ddSlot(1170, 15, DD_ALL)]),
        ddItem("Workout", "💪", [ddSlot(390, 20, DD_WK)]),
        ddItem("Evening walk", "🚶", [ddSlot(1110, 20, DD_ALL)]),
        ddItem("Before bed", "🌙", [ddSlot(1320, 15, DD_ALL)]),
      ],
    },
    {
      n: "Weekend",
      i: "📝",
      items: [
        ddItem("Mock test", "📝", [ddSlot(540, 45, [5])]),
        ddItem("Sunday review", "🔁", [ddSlot(1080, 30, [6])]),
      ],
    },
  ];
  groups[0].items[0].on = true;
  groups[1].items[1].on = true;
  return groups;
};

const DD_OPEN = [false, false, false, false, false, false];

const ddGroupWeekly = (g: DDGroup) =>
  g.items.reduce(
    (sum, x) => (x.on ? sum + x.sl.reduce((a, s) => a + s.d * s.days.length, 0) : sum),
    0,
  );

const ddPatchItem = (groups: DDGroup[], key: string, fn: (x: DDItem) => DDItem): DDGroup[] => {
  const [gi, ii] = key.split(".").map(Number);
  return groups.map((g, i) =>
    i === gi ? { ...g, items: g.items.map((x, j) => (j === ii ? fn(x) : x)) } : g,
  );
};

const ddFindByName = (groups: DDGroup[], name: string) => {
  for (let gi = 0; gi < groups.length; gi += 1) {
    const ii = groups[gi].items.findIndex((x) => x.n === name);
    if (ii > -1) return { gi, ii };
  }
  return null;
};

/* Natural-language parser ─ ported from the design */

const DD_RULES: [RegExp, string][] = [
  [/walk to (the )?(station|metro)/, "Walk to the station"],
  [/subway|metro|train|local|commute/, "Subway or train"],
  [/\bbus\b|\bcab\b|uber|\bola\b|rickshaw|\bauto\b/, "Bus or cab"],
  [/flight|long journey|long trip/, "Long journey"],
  [/chai|morning tea/, "Morning chai"],
  [/after lunch|sleepy|post[- ]lunch|afternoon dip/, "Post-lunch dip"],
  [/lunch/, "Lunch break"],
  [/\btea\b|coffee/, "Tea break"],
  [/before bed|bedtime|\bbed\b|sleep/, "Before bed"],
  [/scroll|reels|instagram|youtube|social media|phone/, "Scroll swap"],
  [/queue|\bline\b/, "Queue or line"],
  [/clinic|doctor|bank|hospital/, "Clinic or bank"],
  [/delivery|waiting for (a )?(cab|ride)/, "Cab or delivery"],
  [/between meetings|meetings?/, "Between meetings"],
  [/build|upload|render|download|loading|compile/, "Waiting on a file or build"],
  [/get(ting)? ready|brush|shower|bath/, "Getting ready"],
  [/cook/, "Cooking"],
  [/work ?out|gym|treadmill|cardio/, "Workout"],
  [/walk|jog|stroll/, "Evening walk"],
  [/mock|test/, "Mock test"],
  [/weekly review|sunday review|review/, "Sunday review"],
  [/idle|free time|\bgap\b|nothing to do/, "Idle gaps"],
];

const ddParseTimes = (s: string): number[] => {
  const out: number[] = [];
  const re = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/g;
  let m: RegExpExecArray | null = re.exec(s);
  while (m) {
    const end = m.index + m[0].length;
    if (/^\s*(min|hour|hr)/.test(s.slice(end, end + 8))) {
      m = re.exec(s);
      continue;
    }
    if (!(m[2] || m[3] || /\bat\s*$/.test(s.slice(0, m.index)))) {
      m = re.exec(s);
      continue;
    }
    let h = Number(m[1]);
    const mi = Number(m[2] ?? 0);
    const ap = m[3];
    if (h > 23 || mi > 59) {
      m = re.exec(s);
      continue;
    }
    if (ap) {
      if (ap[0] === "p" && h < 12) h += 12;
      if (ap[0] === "a" && h === 12) h = 0;
    } else if (h <= 6) h += 12;
    else if (h >= 7 && h <= 11 && /evening|night|pm/.test(s)) h += 12;
    out.push(h * 60 + mi);
    m = re.exec(s);
  }
  return out;
};

const ddParseDur = (s: string): number => {
  const m = s.match(/(\d+)\s*(min|minutes|mins)/);
  if (!m) return 0;
  const v = Number(m[1]);
  return DD_DUR_LONG.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), 5);
};

const ddParseDays = (s: string): number[] | null => {
  if (/every ?day|daily|all days/.test(s)) return [...DD_ALL];
  if (/weekdays?|mon\w* (to|through|-) fri|mon[- ]fri/.test(s)) return [...DD_WK];
  if (/weekends?/.test(s)) return [5, 6];
  const out: number[] = [];
  ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach((d, i) => {
    if (new RegExp(`\\b${d}`).test(s)) out.push(i);
  });
  return out.length ? out : null;
};

type DDMatch = { icon: string; name: string; text: string };
const ddParse = (groups: DDGroup[], text: string) => {
  const next = groups.map((g) => ({
    ...g,
    items: g.items.map((x) => ({ ...x, sl: x.sl.map((s) => ddSlot(s.t, s.d, s.days)) })),
  }));
  const done = new Set<string>();
  const matched: DDMatch[] = [];
  const miss: string[] = [];
  let last: DDItem | null = null;

  text
    .toLowerCase()
    .split(/[.;\n,]|\bthen\b|\bafter that\b/)
    .forEach((part) => {
      const s = part.trim();
      if (!s) return;
      const rule = DD_RULES.find(([re]) => re.test(s));
      const times = ddParseTimes(s);
      const days = ddParseDays(s);
      const dur = ddParseDur(s);
      if (rule) {
        let gi = -1;
        let ii = -1;
        for (let g = 0; g < next.length && gi < 0; g += 1) {
          const j = next[g].items.findIndex((x) => x.n === rule[1]);
          if (j > -1) {
            gi = g;
            ii = j;
          }
        }
        if (gi < 0) return;
        const target = next[gi].items[ii];
        const base = target.sl[0];
        const slots = (times.length ? times : [base.t]).map((t) =>
          ddSlot(t, dur || base.d, days ?? base.days),
        );
        if (done.has(target.n)) target.sl.push(...slots);
        else {
          target.sl = slots;
          done.add(target.n);
        }
        target.on = true;
        last = target;
        matched.push({ icon: target.i, name: target.n, text: ddSum(target) });
      } else if (times.length && last && /back|return|home|again|also|later/.test(s)) {
        times.forEach((t) => last?.sl.push(ddSlot(t, last.sl[0].d, last.sl[0].days)));
      } else if (times.length) {
        miss.push(s);
      }
    });

  return { groups: next, matched, miss };
};

const ddSpeechCtor = () => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => DDRecognition;
    webkitSpeechRecognition?: new () => DDRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const ddNearestMinutes = (m: number) => {
  const opts = DAILY_TIME_OPTIONS as number[];
  if (!opts.length) return Math.max(5, Math.round(m));
  return opts.reduce((best, v) => (Math.abs(v - m) < Math.abs(best - m) ? v : best), opts[0]);
};

const ddClock = (min: number) =>
  `${ddPad2(Math.floor(min / 60) % 24)}:${ddPad2(min % 60)}`;

/** The design's moment names mapped onto the app's three reclaim modules. */
const ddReclaimId = (name: string): string | null => {
  if (/commute|subway|bus|train|journey|station|cab|walk to/i.test(name)) return "Subway Commute";
  if (/lunch|chai|tea|break|scroll|screen/i.test(name)) return "Lunch Break";
  if (/walk|workout|run|evening|bed|cook|gym/i.test(name)) return "Evening Walk";
  return null;
};

/** Turn a decoded day into the commitment the rest of onboarding consumes. */
const ddToCommitment = (
  groups: DDGroup[],
  hourly: { on: boolean; from: number; to: number; d: number; days: number[] },
): Partial<StoryCommitment> => {
  const activeDays = new Set<number>();
  const configs: Record<string, ReclaimConfig> = {};
  let weekly = 0;

  for (const g of groups) {
    for (const x of g.items) {
      if (!x.on) continue;
      const id = ddReclaimId(x.n);
      for (const s of x.sl) {
        weekly += s.d * s.days.length;
        s.days.forEach((d) => activeDays.add(d));
        if (id && !configs[id]) {
          configs[id] = {
            window: clampWindow(ddClock(s.t), ddClock(s.t + s.d)),
            days: Array.from({ length: 7 }, (_, i) => s.days.includes(i)),
          };
        }
      }
    }
  }

  if (hourly.on) {
    weekly += Math.max(0, hourly.to - hourly.from) * hourly.d * hourly.days.length;
    hourly.days.forEach((d) => activeDays.add(d));
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => activeDays.has(i));
  const dayCount = Math.max(1, weekDays.filter(Boolean).length);
  const slotId = Object.keys(configs)[0] ?? RECLAIM_META[0]?.id ?? "Subway Commute";
  const config = configs[slotId];

  const patch: Partial<StoryCommitment> = {
    dailyMinutes: ddNearestMinutes(weekly / dayCount),
    reminderTime: ddClock(hourly.from * 60),
    reclaimSlot: slotId,
    triggerType: STORY_TRIGGER_TYPES[0],
    triggerTime: ddClock(hourly.from * 60),
    weekDays,
  };
  if (config) {
    patch.reclaimWindow = config.window;
    patch.reclaimConfigs = configs;
  }
  return patch;
};

/* ── pieces ── */

function DdDayChips({ days, onToggle }: { days: number[]; onToggle: (i: number) => void }) {
  return (
    <div className={s.r}>
      {DAY_LABELS.map((label, i) => (
        <button
          key={i}
          type="button"
          className={cn(s.ch, s.dy, days.includes(i) && s.on)}
          aria-pressed={days.includes(i)}
          onClick={() => onToggle(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DdGroupCard({
  group,
  gi,
  open,
  onToggleOpen,
  onToggleItem,
  onOpenSlot,
  onAddOwn,
}: {
  group: DDGroup;
  gi: number;
  open: boolean;
  onToggleOpen: () => void;
  onToggleItem: (ii: number) => void;
  onOpenSlot: (key: string, j: number) => void;
  onAddOwn: () => void;
}) {
  const onCount = group.items.filter((x) => x.on).length;
  const minutes = ddGroupWeekly(group);
  return (
    <div className={cn(s.card, open && s.op)}>
      <button type="button" className={s.bh} aria-expanded={open} onClick={onToggleOpen}>
        <span className={s.ic} aria-hidden>
          {group.i}
        </span>
        <b>{group.n}</b>
        <span className={cn(s.cnt, onCount > 0 && s.y)}>
          {onCount > 0
            ? `${onCount} on · ${(minutes / 60).toFixed(1)}h/wk`
            : `${group.items.length} ideas`}
        </span>
        <span className={s.cv} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className={s.bks}>
          {group.items.map((x, ii) => {
            const key = `${gi}.${ii}`;
            return (
              <div key={x.n} className={cn(s.it, x.on && s.on)}>
                <button
                  type="button"
                  className={s.hd}
                  aria-pressed={x.on}
                  onClick={() => onToggleItem(ii)}
                >
                  <span className={s.ic} aria-hidden>
                    {x.i}
                  </span>
                  <span className={s.t}>
                    <b>{x.n}</b>
                    <span className={s.s}>{ddSum(x)}</span>
                  </span>
                  <span className={s.sw} aria-hidden />
                </button>
                <div className={s.bd}>
                  <div className={s.sc2}>
                    {x.sl.map((slot, j) => (
                      <button
                        key={j}
                        type="button"
                        className={s.sl2}
                        onClick={() => onOpenSlot(key, j)}
                      >
                        <b>{ddF12(slot.t)}</b>
                        {` · ${slot.d}m · ${ddDayList(slot.days)}`}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`${s.sl2} ${s.pl2}`}
                      onClick={() => onOpenSlot(key, -1)}
                    >
                      + Add time
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button type="button" className={s.add} onClick={onAddOwn}>
            + Add your own
          </button>
        </div>
      )}
    </div>
  );
}

function DdWheel({
  items,
  selected,
  onIndex,
}: {
  items: string[];
  selected: number;
  onIndex: (i: number) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div
      ref={(el) => {
        elRef.current = el;
        if (el && !el.dataset.init) {
          el.dataset.init = "1";
          el.scrollTop = selected * 44;
        }
      }}
      className={s.wc}
      onScroll={(e) => {
        const el = e.currentTarget;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          onIndex(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / 44))));
        }, 80);
      }}
    >
      {items.map((label, i) => (
        <div
          key={i}
          className={i === selected ? s.s : undefined}
          onClick={() => {
            elRef.current?.scrollTo({ top: i * 44, behavior: "smooth" });
            onIndex(i);
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function DdSheet({
  name,
  title,
  state,
  onWheel,
  onCycle,
  onToggleDay,
  onDuration,
  onApply,
  onRemove,
  onClose,
}: {
  name: string;
  title: string;
  state: DDSheetState;
  onWheel: (col: "h" | "m" | "a", i: number) => void;
  onCycle: () => void;
  onToggleDay: (i: number) => void;
  onDuration: (d: number) => void;
  onApply: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => ddPad2(i)), []);
  const meridiem = useMemo(() => ["AM", "PM"], []);
  const on = useMemo(() => new Set(state.days), [state.days]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className={s.dd}>
      <div
        className={s.sh}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={s.sp} role="dialog" aria-modal="true" aria-label="Set reminder">
          <h3>
            <span>⏰ {name.toUpperCase()}</span>
            <button type="button" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </h3>

          <div className={s.wh}>
            <DdWheel
              items={hours}
              selected={(ddHourOf(state.t) % 12 || 12) - 1}
              onIndex={(i) => onWheel("h", i)}
            />
            <DdWheel items={minutes} selected={state.t % 60} onIndex={(i) => onWheel("m", i)} />
            <DdWheel
              items={meridiem}
              selected={ddHourOf(state.t) >= 12 ? 1 : 0}
              onIndex={(i) => onWheel("a", i)}
            />
          </div>

          <div className={s.rp}>
            <span>REPEAT ON</span>
            <button type="button" className={s.pill} onClick={onCycle}>
              {title}
            </button>
          </div>

          <div className={s.dg}>
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={on.has(i)}
                className={on.has(i) ? s.on : undefined}
                onClick={() => onToggleDay(i)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={s.rp}>
            <span>HOW LONG</span>
          </div>
          <div className={s.r}>
            {DD_DUR_LONG.map((d) => (
              <button
                key={d}
                type="button"
                className={cn(s.ch, d === state.d && s.on)}
                aria-pressed={d === state.d}
                onClick={() => onDuration(d)}
              >
                {d}m
              </button>
            ))}
          </div>

          <button type="button" className={s.go2} onClick={onApply}>
            SET REMINDER
          </button>
          {state.j >= 0 && (
            <button type="button" className={s.dl} onClick={onRemove}>
              Remove this time
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DecodeDay({
  onLockIn,
  onSkip,
}: {
  onLockIn: (patch: Partial<StoryCommitment>) => void;
  onSkip: () => void;
}) {
  const [groups, setGroups] = useState<DDGroup[]>(ddGroups);
  const [open, setOpen] = useState<boolean[]>(() => [...DD_OPEN]);
  const [hourly, setHourly] = useState({ on: false, from: 9, to: 18, d: 5, days: [...DD_WK] });
  const [track, setTrack] = useState({ on: true, from: 9, to: 21 });
  const [log, setLog] = useState<DDLog[]>([]);
  const [cats, setCats] = useState<DDCat[]>(DD_CATS);
  const [custom, setCustom] = useState<{ on: boolean; n: string; t: DDTone }>({
    on: false,
    n: "",
    t: "n",
  });
  const [form, setForm] = useState({ on: false, b: 0, n: "" });
  const [sheet, setSheet] = useState<DDSheetState | null>(null);
  const [say, setSay] = useState("");
  const [listening, setListening] = useState(false);
  const [ok, setOk] = useState<{ matched: DDMatch[]; miss: string[]; message?: string } | null>(
    null,
  );
  const [nudge, setNudge] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const recRef = useRef<DDRecognition | null>(null);
  const doneRef = useRef(false);
  const sayRef = useRef<HTMLTextAreaElement>(null);

  const weekly = useMemo(() => {
    let w = 0;
    groups.forEach((g) =>
      g.items.forEach((x) => {
        if (x.on) x.sl.forEach((s) => (w += s.d * s.days.length));
      }),
    );
    const hn = hourly.on ? Math.max(0, hourly.to - hourly.from) : 0;
    return w + hn * hourly.d * hourly.days.length;
  }, [groups, hourly]);

  const year = Math.round((weekly * 52) / 60);
  const wins = [
    { v: Math.floor(year / 20), t: "new skills", s: "first 20h each" },
    { v: Math.floor(year / 100), t: "deep dives", s: "100h each" },
    { v: Math.round(year / 24), t: "full days", s: "of pure practice" },
  ];
  const cells = Array.from({ length: 24 }, (_, h) => {
    const active = groups.some((g) =>
      g.items.some(
        (x) =>
          x.on &&
          x.sl.some(
            (s) => Math.floor(s.t / 60) <= h && h <= Math.floor((s.t + s.d - 1) / 60),
          ),
      ),
    );
    const nudgeOn = hourly.on && h >= hourly.from && h < hourly.to;
    return active ? "a" : nudgeOn ? "h" : "";
  });

  const cur = track.from + log.length;
  const full = cur >= track.to;
  const lastNonSkip = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i -= 1) if (log[i].c !== "skip") return log[i].c;
    return "";
  }, [log]);
  const productive = log.filter((e) => ddCatOf(cats, e.c).tone === "p").length;
  const leaks = log.filter((e) => ddCatOf(cats, e.c).tone === "l");
  const neutral = log.filter((e) => ddCatOf(cats, e.c).tone === "n").length;
  const total = productive + neutral + leaks.length;

  const openSlot = (key: string, j: number) => {
    const [gi, ii] = key.split(".").map(Number);
    const item = groups[gi]?.items[ii];
    if (!item) return;
    const s =
      j < 0
        ? ddSlot(
            Math.min(DD_LAST_SLOT, item.sl[item.sl.length - 1].t + 180),
            item.sl[item.sl.length - 1].d,
            item.sl[item.sl.length - 1].days,
          )
        : item.sl[j];
    if (!s) return;
    setSheet({ k: key, j, t: s.t, d: s.d, days: [...s.days] });
  };

  const applySheet = () => {
    if (!sheet) return;
    const ns = ddSlot(sheet.t, sheet.d, sheet.days);
    const { k, j } = sheet;
    setGroups((prev) =>
      ddPatchItem(prev, k, (x) => ({
        ...x,
        sl: j < 0 ? [...x.sl, ns] : x.sl.map((s, i) => (i === j ? ns : s)),
        on: true,
      })),
    );
    setSheet(null);
  };

  const removeSlot = () => {
    if (!sheet) return;
    const { k, j } = sheet;
    setGroups((prev) =>
      ddPatchItem(prev, k, (x) =>
        x.sl.length > 1 ? { ...x, sl: x.sl.filter((_, i) => i !== j) } : { ...x, on: false },
      ),
    );
    setSheet(null);
  };

  const cycleDays = () => {
    if (!sheet) return;
    const idx = DD_PRESETS.findIndex((p) => ddDayList(p) === ddDayList(sheet.days));
    setSheet({ ...sheet, days: [...DD_PRESETS[(idx + 1) % DD_PRESETS.length]] });
  };

  const onWheel = (col: "h" | "m" | "a", ix: number) => {
    setSheet((prev) => {
      if (!prev) return prev;
      const hh = (ddHourOf(prev.t) % 12 || 12) - 1;
      const mm = prev.t % 60;
      const aa = ddHourOf(prev.t) >= 12 ? 1 : 0;
      const h2 = col === "h" ? ix : hh;
      const m2 = col === "m" ? ix : mm;
      const a2 = col === "a" ? ix : aa;
      return { ...prev, t: ((h2 + 1) % 12 + (a2 ? 12 : 0)) * 60 + m2 };
    });
  };

  const addOwn = (gi: number) => {
    setForm({ on: true, b: gi, n: form.n });
    setTimeout(() => document.getElementById("dd-fn")?.focus(), 0);
  };

  const submitForm = () => {
    const name = form.n.trim();
    if (!name) {
      document.getElementById("dd-fn")?.focus();
      return;
    }
    const gi = form.b;
    const ii = groups[gi]?.items.length ?? 0;
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, items: [...g.items, { ...ddItem(name, "⭐", [ddSlot(720, 10, DD_WK)]), on: true }] }
          : g,
      ),
    );
    setOpen((prev) => prev.map((v, i) => (i === gi ? true : v)));
    setSheet({ k: `${gi}.${ii}`, j: 0, t: 720, d: 10, days: [...DD_WK] });
    setForm({ on: false, b: gi, n: "" });
  };

  const runParse = () => {
    recRef.current?.stop();
    const text = say.trim();
    if (!text) {
      setOk({
        matched: [],
        miss: [],
        message: "Tell us a little first. Try “Metro at 8:30, lunch at 1, scroll before bed.”",
      });
      return;
    }
    const res = ddParse(groups, text);
    setGroups(res.groups);
    setOpen((prev) => prev.map((v, i) => (res.matched.some((m) => ddFindByName(res.groups, m.name)?.gi === i) ? true : v)));
    setOk({ matched: res.matched, miss: res.miss });
  };

  const toggleMic = () => {
    const SR = ddSpeechCtor();
    if (!SR) {
      setOk({ matched: [], miss: [], message: "Voice isn’t available here. Type it instead." });
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    const base = say;
    rec.onresult = (e) => {
      let s = "";
      for (let i = 0; i < e.results.length; i += 1) s += e.results[i][0].transcript;
      setSay(base ? `${base} ${s}` : s);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = (e) =>
      setOk({
        matched: [],
        miss: [],
        message:
          e.error === "not-allowed"
            ? "Mic is blocked here. Type it instead."
            : "Couldn’t hear that. Try again or type.",
      });
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
      setOk(null);
    } catch {
      setOk({ matched: [], miss: [], message: "Mic is blocked here. Type it instead." });
    }
  };

  useEffect(
    () => () => {
      recRef.current?.stop();
    },
    [],
  );

  const addSuggestion = (c: string, h: number) => {
    const target = c === "scroll" ? "Scroll swap" : "Idle gaps";
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((x) => {
          if (x.n !== target) return x;
          if (!x.on) return { ...x, on: true, sl: [ddSlot(h * 60, 10, DD_WK)] };
          if (x.sl.some((s) => Math.floor(s.t / 60) === h)) return x;
          return { ...x, sl: [...x.sl, ddSlot(h * 60, 10, DD_WK)] };
        }),
      })),
    );
  };

  const testNudge = () => {
    setNudge((n) => n + 1);
    try {
      const w = window as unknown as {
        Notification?: {
          requestPermission: () => Promise<string>;
        };
      };
      if (w.Notification) {
        void w.Notification.requestPermission().then((p) => {
          if (p === "granted") new Notification("10 min practice", { body: "Tea break is open. Tap to start." });
        });
      }
    } catch {
      /* notifications unavailable */
    }
  };

  const lockIn = () => {
    setToast("Locking in your schedule…");
    if (doneRef.current) return;
    doneRef.current = true;
    const patch = ddToCommitment(groups, hourly);
    setTimeout(() => onLockIn(patch), 450);
  };

  const skipAll = () => {
    setToast("Skipped. You can set this up in Settings.");
    if (doneRef.current) return;
    doneRef.current = true;
    setTimeout(onSkip, 450);
  };

  const sheetName = sheet
    ? groups[Number(sheet.k.split(".")[0])]?.items[Number(sheet.k.split(".")[1])]?.n ?? ""
    : "";

  const leaksByKey = leaks.length
    ? leaks.reduce<Record<string, number>>((acc, e) => {
        acc[e.c] = (acc[e.c] ?? 0) + 1;
        return acc;
      }, {})
    : {};
  const topKey = Object.entries(leaksByKey).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topLeak = topKey
    ? `${ddCatOf(cats, topKey).icon} ${ddCatOf(cats, topKey).label} · ${leaksByKey[topKey]}h`
    : "";

  return (
    <div className={s.pg}>
      <div className={s.gHero}>
      <div className={s.card}>
        <p className={s.mut}>These minutes vanish today. Together they’re</p>
        <div className={s.big}>
          +{year}
          <small>hrs / year</small>
        </div>
        <div className={s.wins}>
          {wins.map((w) => (
            <div key={w.t}>
              <b>{year ? w.v : "–"}</b>
              <span>
                {w.t}
                <br />
                {w.s}
              </span>
            </div>
          ))}
        </div>
        <div className={s.bar}>
          {cells.map((c, i) => (
            <i key={i} className={c ? s[c] : undefined} />
          ))}
        </div>
        <div className={s.tk}>
          <span>12a</span>
          <span>6a</span>
          <span>12p</span>
          <span>6p</span>
          <span>11p</span>
        </div>
        <p className={s.mut} style={{ marginTop: 10 }}>
          10,000 hours is for world-class. 20 gets you started.
        </p>
      </div>
      </div>

      <div className={s.gTell}>
      <div className={s.card}>
        <p className={s.q}>Just tell us about your day</p>
        <p className={s.mut} style={{ marginBottom: 8 }}>
          Speak or type. We’ll set it up.
        </p>
        <textarea
          ref={sayRef}
          value={say}
          onChange={(e) => setSay(e.target.value)}
          placeholder="I take the metro at 8:30 and 6 pm on weekdays. Lunch at 1, tea at 4. I scroll before bed."
        />
        <div className={s.r}>
          <button type="button" className={cn(s.ch, listening && s.on)} onClick={toggleMic}>
            {listening ? "● Listening" : "🎤 Speak"}
          </button>
          <button type="button" className={cn(s.ch, s.on)} onClick={runParse}>
            Set it up
          </button>
        </div>
        {ok && (
          <div className={s.ok}>
            {ok.message ? (
              <div>{ok.message}</div>
            ) : (
              <>
                {ok.matched.length ? (
                  <>
                    {ok.matched.map((m, i) => (
                      <div key={i}>
                        <b>✓</b> {m.icon} {m.name} · {m.text}
                      </div>
                    ))}
                    <div>Tweak anything below.</div>
                  </>
                ) : (
                  <div>Nothing matched. Try naming moments like commute, lunch or queue.</div>
                )}
                {ok.miss.map((s, i) => (
                  <div key={`miss-${i}`}>Couldn’t place “{s}”. Use + to add it.</div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      </div>

      <div className={s.gWhere}>
      <div className={s.hh}>
        <h2>Where does time slip away?</h2>
        <button type="button" className={s.pl} aria-label="Add your own" onClick={() => addOwn(form.b)}>
          +
        </button>
      </div>

      {form.on && (
        <div className={`${s.card} ${s.fm}`}>
          <input
            id="dd-fn"
            maxLength={40}
            placeholder="What slips away? e.g. Gym warm-up"
            value={form.n}
            onChange={(e) => setForm((f) => ({ ...f, n: e.target.value }))}
          />
          <div className={s.r}>
            <select
              aria-label="Group"
              value={form.b}
              onChange={(e) => setForm((f) => ({ ...f, b: Number(e.target.value) }))}
            >
              {groups.map((g, i) => (
                <option key={g.n} value={i}>
                  {g.i} {g.n}
                </option>
              ))}
            </select>
          </div>
          <div className={s.r}>
            <button type="button" className={cn(s.ch, s.on)} onClick={submitForm}>
              Next: set time
            </button>
            <button type="button" className={s.ch} onClick={() => setForm((f) => ({ ...f, on: false }))}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {groups.map((g, gi) => (
        <DdGroupCard
          key={g.n}
          group={g}
          gi={gi}
          open={open[gi]}
          onToggleOpen={() => setOpen((prev) => prev.map((v, i) => (i === gi ? !v : v)))}
          onToggleItem={(ii) =>
            setGroups((prev) =>
              ddPatchItem(prev, `${gi}.${ii}`, (x) => ({ ...x, on: !x.on })),
            )
          }
          onOpenSlot={openSlot}
          onAddOwn={() => addOwn(gi)}
        />
      ))}
      </div>

      <div className={s.gKeep}>
      <h2>Keep it moving</h2>

      <div className={cn(s.card, hourly.on && s.on)}>
        <button type="button" className={s.hd} aria-pressed={hourly.on} onClick={() => setHourly((h) => ({ ...h, on: !h.on }))}>
          <span className={s.ic} aria-hidden>
            🔔
          </span>
          <span className={s.t}>
            <b>Practice every hour</b>
            <span className={s.s}>
              {ddHourLabel(hourly.from)}–{ddHourLabel(hourly.to)} · {hourly.d}m ·{" "}
              {hourly.on ? Math.max(0, hourly.to - hourly.from) : 0} nudges · {ddDayList(hourly.days)}
            </span>
          </span>
          <span className={s.sw} aria-hidden />
        </button>
        <div className={s.bd}>
          <div className={s.r}>
            <select
              aria-label="Hourly from"
              value={hourly.from}
              onChange={(e) =>
                setHourly((h) => {
                  const from = Number(e.target.value);
                  return { ...h, from, to: h.to <= from ? Math.min(23, from + 1) : h.to };
                })
              }
            >
              {Array.from({ length: 23 }, (_, i) => (
                <option key={i} value={i}>
                  {ddHourLabel(i)}
                </option>
              ))}
            </select>
            <span className={s.mut}>to</span>
            <select
              aria-label="Hourly to"
              value={hourly.to}
              onChange={(e) =>
                setHourly((h) => {
                  const to = Number(e.target.value);
                  return { ...h, to, from: h.from >= to ? Math.max(0, to - 1) : h.from };
                })
              }
            >
              {Array.from({ length: 23 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {ddHourLabel(i + 1)}
                </option>
              ))}
            </select>
            {[5, 10].map((d) => (
              <button
                key={d}
                type="button"
                className={cn(s.ch, d === hourly.d && s.on)}
                aria-pressed={d === hourly.d}
                onClick={() => setHourly((h) => ({ ...h, d }))}
              >
                {d}m
              </button>
            ))}
          </div>
          <DdDayChips
            days={hourly.days}
            onToggle={(i) => setHourly((h) => ({ ...h, days: ddToggleIn(h.days, i) }))}
          />
        </div>
      </div>

      <div className={s.card}>
        <p className={s.mut}>What you’ll see</p>
        <div key={`nudge-${nudge}`} className={cn(s.nt, nudge > 0 && s.f)}>
          <span className={s.ic} aria-hidden>
            ⚡
          </span>
          <div>
            <small>Decode · now</small>
            <b>10 min practice</b>
            <p>Tea break is open. Tap to start.</p>
          </div>
        </div>
        <div className={s.nt}>
          <span className={s.ic} aria-hidden>
            ⏱
          </span>
          <div>
            <small>Decode · hourly</small>
            <b>Where did the last hour go?</b>
            <p>Tap + to add it.</p>
          </div>
        </div>
        <button type="button" className={s.t2} onClick={testNudge}>
          Send a test nudge
        </button>
      </div>
      </div>

      <div className={s.gWhat}>
      <h2 className={s.gWhatHead} aria-hidden>
        &nbsp;
      </h2>
      <div className={cn(s.card, track.on && s.on)}>
        <button type="button" className={s.hd} aria-pressed={track.on} onClick={() => setTrack((t) => ({ ...t, on: !t.on }))}>
          <span className={s.ic} aria-hidden>
            ⏱
          </span>
          <span className={s.t}>
            <b>Track my time</b>
            <span className={s.s}>
              {ddHourLabel(track.from)}–{ddHourLabel(track.to)} · one tap each hour
            </span>
          </span>
          <span className={s.sw} aria-hidden />
        </button>
        <div className={s.bd}>
          <div className={s.r}>
            <select
              aria-label="Tracking from"
              value={track.from}
              onChange={(e) =>
                setTrack(() => {
                  const from = Number(e.target.value);
                  const to = track.to <= from ? Math.min(23, from + 1) : track.to;
                  setLog([]);
                  return { on: track.on, from, to };
                })
              }
            >
              {Array.from({ length: 23 }, (_, i) => (
                <option key={i} value={i}>
                  {ddHourLabel(i)}
                </option>
              ))}
            </select>
            <span className={s.mut}>to</span>
            <select
              aria-label="Tracking to"
              value={track.to}
              onChange={(e) =>
                setTrack(() => {
                  const to = Number(e.target.value);
                  const from = track.from >= to ? Math.max(0, to - 1) : track.from;
                  setLog([]);
                  return { on: track.on, from, to };
                })
              }
            >
              {Array.from({ length: 23 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {ddHourLabel(i + 1)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            {full ? (
              <p className={s.q}>Day logged. Here’s what we saw.</p>
            ) : (
              <>
                <p className={s.q}>
                  {ddHourLabel(cur)}–{ddHourLabel(cur + 1)}: where did it go?
                </p>
                <div className={s.cats}>
                  {cats.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={s.cat}
                      onClick={() => setLog((l) => [...l, { h: track.from + l.length, c: c.key }])}
                    >
                      <span aria-hidden>{c.icon}</span>
                      {c.label}
                    </button>
                  ))}
                  <button type="button" className={s.cat} onClick={() => setCustom((k) => ({ ...k, on: !k.on }))}>
                    <span aria-hidden>+</span>
                    Add
                  </button>
                </div>
                {custom.on && (
                  <div className={s.fm} style={{ marginTop: 8 }}>
                    <input
                      id="dd-kn"
                      maxLength={24}
                      placeholder="Where did it go? e.g. Gym, Calls"
                      value={custom.n}
                      onChange={(e) => setCustom((k) => ({ ...k, n: e.target.value }))}
                    />
                    <div className={s.r}>
                      {(["p", "n", "l"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={cn(s.ch, custom.t === t && s.on)}
                          aria-pressed={custom.t === t}
                          onClick={() => setCustom((k) => ({ ...k, t }))}
                        >
                          {t === "p" ? "Productive" : t === "n" ? "Neutral" : "Leak"}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={cn(s.ch, s.on)}
                        style={{ marginLeft: "auto" }}
                        onClick={() => {
                          const name = custom.n.trim();
                          if (!name) {
                            document.getElementById("dd-kn")?.focus();
                            return;
                          }
                          const key = `c${cats.length}`;
                          const icon = custom.t === "p" ? "✨" : custom.t === "l" ? "🔸" : "🔹";
                          setCats((c) => [...c, { key, label: name, icon, tone: custom.t }]);
                          setLog((l) =>
                            track.from + l.length < track.to
                              ? [...l, { h: track.from + l.length, c: key }]
                              : l,
                          );
                          setCustom({ on: false, n: "", t: "n" });
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
                <div className={s.r}>
                  <button
                    type="button"
                    className={s.ch}
                    disabled={!lastNonSkip}
                    onClick={() => {
                      if (!lastNonSkip) return;
                      setLog((l) => [...l, { h: track.from + l.length, c: lastNonSkip }]);
                    }}
                  >
                    Same as last hour
                  </button>
                  <button
                    type="button"
                    className={s.ch}
                    onClick={() => setLog((l) => [...l, { h: track.from + l.length, c: "skip" }])}
                  >
                    Skip
                  </button>
                </div>
                <p className={s.mut} style={{ marginTop: 6 }}>
                  This opens when you tap the hourly nudge.
                </p>
              </>
            )}

            {log.length > 0 && (
              <div className={s.dots}>
                {log.map((e, i) => {
                  const c = ddCatOf(cats, e.c);
                  return (
                      <div className={s.dc} key={i}>
                      <i className={s[c.tone]} title={`${ddHourLabel(e.h)} ${c.label}`}>
                        {c.icon}
                      </i>
                      <small>{e.h % 12 || 12}</small>
                    </div>
                  );
                })}
              </div>
            )}

            {total > 0 && (
              <>
                <div className={s.mix}>
                  <i
                    style={{
                      width: `${(productive / total) * 100}%`,
                      background: "var(--lime)",
                    }}
                  />
                  <i
                    style={{
                      width: `${(neutral / total) * 100}%`,
                      background: "var(--text-muted)",
                      opacity: 0.6,
                    }}
                  />
                  <i
                    style={{
                      width: `${(leaks.length / total) * 100}%`,
                      background: "var(--orange)",
                    }}
                  />
                </div>
                <p className={s.mut}>
                  Productive {productive}h · Neutral {neutral}h · Leaking {leaks.length}h
                </p>
                {topLeak && (
                  <p className={s.mut}>
                    Biggest leak: {topLeak}. Those {leaks.length}h are{" "}
                    {Math.round((leaks.length / 20) * 100)}% of a new skill.
                  </p>
                )}
              </>
            )}

            {leaks.slice(0, 3).map((e, i) => {
              const c = ddCatOf(cats, e.c);
              const target = e.c === "scroll" ? "Scroll swap" : "Idle gaps";
              const at = ddFindByName(groups, target);
              const done =
                !!at && groups[at.gi].items[at.ii].on && groups[at.gi].items[at.ii].sl.some((s) => Math.floor(s.t / 60) === e.h);
              return (
                <div className={s.sg} key={i}>
                  <span>
                    {c.icon} {ddHourLabel(e.h)} {c.label.toLowerCase()} → 10 min practice
                  </span>
                  <button type="button" disabled={done} onClick={() => !done && addSuggestion(e.c, e.h)}>
                    {done ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}

            {log.length > 0 && (
              <>
                <button type="button" className={s.rs} onClick={() => setLog((l) => l.slice(0, -1))}>
                  Undo
                </button>
                <button type="button" className={s.rs} onClick={() => setLog([])}>
                  Start over
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className={s.gFoot}>
      <button type="button" className={s.cta} disabled={!weekly} onClick={lockIn}>
        {weekly ? `Lock in schedule · ${(weekly / 60).toFixed(1)} h/week` : "Lock in schedule"}
      </button>
      <button type="button" className={s.sk} onClick={skipAll}>
        Skip for now
      </button>
      {toast && <p className={s.toast}>{toast}</p>}
      </div>

      {sheet && (
        <DdSheet
          name={sheetName}
          title={ddDayList(sheet.days) === "Daily" ? "Every day" : ddDayList(sheet.days)}
          state={sheet}
          onWheel={onWheel}
          onCycle={cycleDays}
          onToggleDay={(i) => setSheet((s) => (s ? { ...s, days: ddToggleIn(s.days, i) } : s))}
          onDuration={(d) => setSheet((s) => (s ? { ...s, d } : s))}
          onApply={applySheet}
          onRemove={removeSlot}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

/* ── Story hook overlay ── */

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

export function StoryIntro({
  onClose,
  onSkip,
  preloaded = false,
}: {
  onClose: () => void;
  /** "Skip for now": dismiss the whole intro with no goal recorded. */
  onSkip?: () => void;
  preloaded?: boolean;
}) {
  const store = useOnboardingStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);

  const [value, setValue] = useState<StoryCommitment>(() => {
    const stored = store.weekDays;
    const week =
      stored && stored.length === 7
        ? stored
        : Array.from({ length: 7 }, (_, i) => stored?.[i] ?? true);
    return {
      dailyMinutes: store.dailyMinutes ?? 30,
      reminderTime: store.reminderTime || "00:00",
      reclaimSlot: store.reclaimSlot,
      reclaimWindow: store.reclaimWindow || "00:00 - 00:00",
      reclaimConfigs: store.reclaimConfigs,
      triggerType: store.triggerType,
      triggerTime: store.triggerTime || "00:00",
      weekDays: week,
    };
  });

  useLayoutEffect(() => {
    if (preloaded) return;
    if (overlayRef.current) {
      const el = overlayRef.current;
      el.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0%)" }], {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }
  }, [preloaded]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closingRef = useRef(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  const animateOut = useCallback((after?: () => void) => {
    const done = () => (after ? after() : onCloseRef.current());
    const el = overlayRef.current;
    if (!el) return done();
    el.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], {
      duration: 280,
      easing: "cubic-bezier(0.55, 0, 0.55, 0.2)",
      fill: "forwards",
    }).addEventListener("finish", done, { once: true });
  }, []);

  const close = useCallback((after?: () => void, patch?: Partial<StoryCommitment>) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const v: StoryCommitment = patch ? { ...value, ...patch } : value;
    store.setDailyMinutes(v.dailyMinutes);
    store.setReminderTime(v.reminderTime);
    store.setReclaimSlot(v.reclaimSlot);
    store.setReclaimWindow(v.reclaimWindow);
    store.setTriggerType(v.triggerType);
    store.setTriggerTime(v.triggerTime);
    store.setWeekDays(v.weekDays);
    store.setReclaimConfigs(v.reclaimConfigs ?? store.reclaimConfigs);
    void applyStoryNotifications(v).then((res) => {
      if (res.requested && !res.scheduled) {
        setNotifError(
          res.granted
            ? "Reminders couldn't be scheduled. You can turn them on in Settings."
            : "Notifications are blocked, so reminders won't be sent. Allow them in your browser or device settings.",
        );
        closingRef.current = false;
        return;
      }
      animateOut(after);
    });
  }, [value, store, animateOut]);

  const lockIn = useCallback(
    (patch: Partial<StoryCommitment>) => close(undefined, patch),
    [close],
  );
  const skipAll = useCallback(() => (onSkip ? close(onSkip) : close()), [close, onSkip]);

  return createPortal(
    <MotionConfig reducedMotion="user">
      <div
        ref={overlayRef}
        data-theme-scope
        className={cn(
          "fixed inset-0 z-[var(--z-intro)] overflow-x-hidden overflow-y-auto sm:flex sm:items-center sm:justify-center sm:overflow-hidden sm:bg-black/60 sm:backdrop-blur-sm",
          preloaded && "invisible pointer-events-none",
          theme === "light" && "light",
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={preloaded || undefined}
        aria-labelledby="story-hook-title"
      >
        <div
          className="relative w-full min-h-full sm:min-h-0 sm:max-w-md sm:max-h-[92vh] sm:flex sm:flex-col sm:overflow-hidden sm:rounded-3xl sm:border sm:shadow-2xl md:max-w-3xl md:max-h-[85vh] lg:max-w-4xl xl:max-w-[1080px]"
          style={{
            borderColor: GLASS_BORDER,
            background:
              theme === "light"
                ? "linear-gradient(180deg, var(--screen-tint) 0%, var(--overlay-solid) 100%)"
                : `radial-gradient(130% 90% at 50% 0%, ${PANEL} 0%, ${BG_MOSS} 48%, ${FOREST} 100%)`,
          }}
        >
          {/* dot grid + brand hairline, matching the Arena / Pitch intro shell */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: "radial-gradient(var(--glass-045) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, var(--lime-40), transparent)",
            }}
          />

          <div className="relative mx-auto w-full max-w-[430px] px-[14px] pb-[20px] sm:min-h-0 sm:max-w-none sm:flex-1 sm:overflow-y-auto sm:px-6 max-[359px]:px-3">
            <div className="relative flex flex-col">
            {/* Protocol pill */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center pt-[max(0.75rem,var(--sat))]"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lime-25)] bg-[var(--lime-07)] px-3.5 py-1">
                <Sparkles size={11} className="text-[var(--lime)]" aria-hidden />
                <span className="text-[10px] font-bold tracking-[0.22em] text-[var(--lime)]">
                  DECODE YOUR DAY
                </span>
              </div>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col pb-3"
            >
              <motion.h1
                variants={itemVariants}
                id="story-hook-title"
                className="mb-3 mt-2 text-center text-[clamp(16px,4.4vw,20px)] font-extrabold uppercase leading-[1.08] tracking-tight text-foreground"
              >
                Shape the plan around{" "}
                <span
                  className="text-transparent"
                  style={{
                    background: `linear-gradient(90deg, var(--lime), var(--lime-tint))`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  the life you already live.
                </span>
              </motion.h1>

              <motion.div variants={itemVariants} className={s.dd}>
                <DecodeDay onLockIn={lockIn} onSkip={skipAll} />
              </motion.div>
            </motion.div>
          </div>

          {notifError && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--amber-border)] bg-[var(--amber-bg)] px-3 py-2 text-[11px] text-[var(--amber)]"
            >
              <AlertTriangle size={13} className="mt-px shrink-0" />
              <span>{notifError}</span>
            </div>
          )}
          </div>
        </div>
      </div>
    </MotionConfig>,
    document.body,
  );
}
