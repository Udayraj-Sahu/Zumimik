"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BG_MOSS, FOREST, PANEL } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BicepsFlexed,
  Brain,
  Check,
  Clock,
  Crown,
  Plus,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboarding-store";

import { formatINR } from "@/lib/text";

const inr = formatINR;

/* ── pricing rules (matches app/seat-builder reference) ── */

const STACK_DISCOUNT_PCT = 30;
const SEAT_DRAFT_STEP = "2";
const stackPrice = (list: number) => Math.round((list * (100 - STACK_DISCOUNT_PCT)) / 100);
const PRIVATE_TUTOR_ANNUAL = 48000;

const PRIMARY = [
  {
    id: "exam",
    title: "Parent Exam Prep",
    summary: "Parent Exam Prep (Full)",
    desc: "GMAT / CAT / Speed Logic • Full Adaptive Prep & Arena",
    price: 600,
    time: "6 mins / day micro drill",
    tag: "PODIUM ACUITY",
  },
  {
    id: "oversight",
    title: "Parent Oversight & Telemetry",
    summary: "Parent Oversight & Telemetry",
    desc: "Zero-test burden • Activity Grading, Live Progress Radar",
    price: 299,
    time: "2 mins / week review",
    tag: "GUARDIAN DASHBOARD",
  },
] as const;

const STACK: {
  id: string;
  title: string;
  summary: string;
  desc: string;
  tag: string;
  list: number;
  badge?: string;
  Icon: typeof Trophy;
}[] = [
  {
    id: "kid1",
    title: "Kid 01: Olympiad & Speed Math",
    summary: "Kid 01 Olympiad Speed Math",
    desc: "Nikhilam & IMO shortcuts • Live Arena Duels",
    tag: "OLYMPIAD FOUNDATION",
    list: 600,
    Icon: Trophy,
  },
  {
    id: "kid2",
    title: "Kid 02 / Sibling Track",
    summary: "Kid 02 Sibling Track",
    desc: "School mental speed • Table mastery & confidence",
    tag: "FOUNDATION SPEED CORE",
    list: 600,
    Icon: BicepsFlexed,
  },
  {
    id: "elder",
    title: "Elder / Silver Brain Track",
    summary: "Elder Silver Brain Track",
    desc: "Anti-decay neuroplasticity • High contrast, low stress",
    tag: "MICRO-KEEPER",
    list: 600,
    badge: "PREMIUM",
    Icon: Brain,
  },
];

function SectionTitle({ marker, title, tag }: { marker: string; title: string; tag: string }) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-[var(--lime-35)] bg-[var(--lime-10)] text-[10px] font-black text-[var(--lime)]">
          {marker}
        </span>
        <h2 className="text-[10px] font-black tracking-[0.18em] text-foreground">{title}</h2>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-bold tracking-wider text-[var(--lime)]",
          theme === "light"
            ? "border-black/[0.10] bg-black/[0.04]"
            : "keep-white border-white/10 bg-black/30",
        )}
      >
        {tag}
      </span>
    </div>
  );
}

/* ── child details bottom sheet ── */

type ChildDraft = { name: string; age: string };

const MIN_AGE = 3;
const MAX_AGE = 18;

function ChildSeatSheet({
  seatTitle,
  onCancel,
  onSave,
}: {
  seatTitle: string;
  onCancel: () => void;
  onSave: (draft: ChildDraft) => void;
}) {
  const theme = useThemeStore((s) => s.theme);
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ChildDraft>({ name: "", age: "" });
  const [touched, setTouched] = useState(false);

  useLayoutEffect(() => {
    if (panelRef.current) {
      panelRef.current.animate(
        [{ transform: "translateY(100%)" }, { transform: "translateY(0%)" }],
        { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const nameError = touched && !draft.name.trim() ? "Enter a name" : null;
  const ageNum = Number(draft.age);
  const ageError =
    touched && !draft.age
      ? "Enter an age"
      : touched && (!Number.isInteger(ageNum) || ageNum < MIN_AGE || ageNum > MAX_AGE)
        ? `Age must be ${MIN_AGE}–${MAX_AGE}`
        : null;
  const valid = Boolean(draft.name.trim()) && draft.age !== "" && ageNum >= MIN_AGE && ageNum <= MAX_AGE;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSave({ name: draft.name.trim(), age: draft.age });
  };

  const field = theme === "light"
    ? "rounded-xl border border-black/[0.10] bg-black/[0.04]"
    : "rounded-xl border border-white/[0.08] bg-black/30";

  return (
    <div
      data-theme-scope
      className={cn(
        "fixed inset-0 z-[calc(var(--z-intro)+1)] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center",
        theme === "light" && "light",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="child-seat-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          "relative w-full max-w-sm rounded-t-3xl border p-5 pb-[max(1.25rem,var(--sab))] sm:rounded-3xl",
          theme === "light" ? "border-black/[0.10] bg-[var(--bg-2)]" : "border-white/[0.08] bg-[var(--overlay-solid)]",
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-current opacity-20" />

        <div className="flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--lime-35)] bg-[var(--lime-10)] text-[10px] font-black text-[var(--lime)]">
            {SEAT_DRAFT_STEP}
          </span>
          <h2
            id="child-seat-title"
            className="text-[13px] font-black uppercase tracking-[0.16em] text-foreground"
          >
            PULL UP A CHAIR
          </h2>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-white/70">{seatTitle}</p>

        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <div>
            <label htmlFor="child-seat-name" className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/60">
              NAME
            </label>
            <input
              id="child-seat-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              onBlur={() => setTouched(true)}
              maxLength={40}
              autoComplete="off"
              placeholder="Who is this seat for?"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "child-seat-name-err" : undefined}
              className={cn(
                "mt-1.5 w-full px-3 py-2.5 text-[12px] text-foreground outline-none transition focus:border-[var(--lime-45)]",
                field,
                nameError && "border-red-400/60",
              )}
            />
            {nameError && (
              <p id="child-seat-name-err" role="alert" className={cn("mt-1 text-[10px]", theme === "light" ? "text-red-600" : "text-red-400")}>
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="child-seat-age" className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/60">
              AGE
            </label>
            <input
              id="child-seat-age"
              value={draft.age}
              onChange={(e) =>
                setDraft((d) => ({ ...d, age: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) }))
              }
              onBlur={() => setTouched(true)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={`${MIN_AGE}–${MAX_AGE}`}
              aria-invalid={Boolean(ageError)}
              aria-describedby={ageError ? "child-seat-age-err" : undefined}
              className={cn(
                "mt-1.5 w-full px-3 py-2.5 text-[12px] text-foreground outline-none transition focus:border-[var(--lime-45)]",
                field,
                ageError && "border-red-400/60",
              )}
            />
            {ageError && (
              <p id="child-seat-age-err" role="alert" className={cn("mt-1 text-[10px]", theme === "light" ? "text-red-600" : "text-red-400")}>
                {ageError}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                "flex-1 rounded-xl border py-3 text-[10px] font-bold uppercase tracking-[0.12em] transition",
                theme === "light"
                  ? "border-black/[0.10] bg-black/[0.04] text-foreground"
                  : "border-white/10 bg-black/30 text-white/75",
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.98]"
              style={{
                background: `linear-gradient(90deg, var(--lime-solid), var(--lime-light))`,
                boxShadow: "0 6px 20px var(--lime-mid-25)",
              }}
            >
              <Check size={12} />
              Seat them
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── presentational selector (used inside AdaptiveReprompt plan step) ── */

export function SeatBuilderSelector({ onCheckout }: { onCheckout?: (total: number) => void }) {
  const theme = useThemeStore((s) => s.theme);
  const [primaryId, setPrimaryId] = useState<"exam" | "oversight">("exam");
  const [stacked, setStacked] = useState<string[]>(["kid1"]);
  /** Seat awaiting child details, plus the draft captured from the sheet. */
  const [draftSeat, setDraftSeat] = useState<{ id: string; title: string } | null>(null);
  const [children, setChildren] = useState<Record<string, ChildDraft>>({});

  const toggleSeat = (id: string) =>
    setStacked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const { lines, total, monthly, savePct } = useMemo(() => {
    const primary = PRIMARY.find((p) => p.id === primaryId)!;
    const seats = STACK.filter((s) => stacked.includes(s.id));
    const _lines = [
      { label: `Base: ${primary.summary}`, amount: primary.price },
      ...seats.map((s, i) => ({
        label: `Seat ${i + 2}: ${s.summary}`,
        amount: stackPrice(s.list),
      })),
    ];
    const _total = _lines.reduce((sum, l) => sum + l.amount, 0);
    return {
      lines: _lines,
      total: _total,
      monthly: Math.round(_total / 12),
      savePct: Math.max(0, Math.round((1 - _total / PRIVATE_TUTOR_ANNUAL) * 100)),
    };
  }, [primaryId, stacked]);

  useEffect(() => {
    onCheckout?.(total);
  }, [total, onCheckout]);

  const seatCount = stacked.length + 1;

  return (
    <div className="space-y-6">
      {/* 1 — head of the table */}
      <section>
        <SectionTitle marker="1" title="HEAD OF THE TABLE" tag="REQUIRED BASE" />
        <div role="radiogroup" aria-label="Primary seat" className="mt-3 space-y-2.5">
          {PRIMARY.map((p) => {
            const selected = p.id === primaryId;
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={selected}
                onClick={() => setPrimaryId(p.id)}
                className={cn(
                  "relative w-full overflow-hidden border p-3.5 text-left transition",
                  theme === "light" ? "rounded-[16px]" : "rounded-2xl",
                  selected
                    ? "border-[var(--lime-50)] bg-[var(--lime-05)]"
                    : "border-white/[0.07] hover:border-white/[0.16]",
                  !selected &&
                    (theme === "light" ? "bg-white/[0.02]" : "bg-black/25 hover:border-white/25"),
                )}
              >
                {selected && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--lime-50), transparent)",
                    }}
                  />
                )}
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                      selected ? "border-[var(--lime)]" : "border-white/25",
                    )}
                  >
                    {selected && <span className="size-2.5 rounded-full bg-[var(--lime)]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Crown
                            size={13}
                            className={cn(selected ? "text-[var(--lime)]" : "text-white/50")}
                          />
                          <h3 className="text-[12px] font-bold uppercase tracking-wide text-foreground">
                            {p.title}
                          </h3>
                          {selected && (
                            <span className="rounded bg-[var(--lime-solid)] px-1.5 py-px text-[7px] font-bold tracking-wider text-[var(--on-accent)]">
                              HOLDING THIS SEAT
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-white/60">
                          {p.desc}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[14px] font-bold text-[var(--lime)]">
                        {inr(p.price)}
                        <span className="text-[9px] font-normal text-white/50">
                          {" "}
                          /yr
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[9px] text-white/50">
                        <Clock size={10} /> {p.time}
                      </span>
                      <span className="text-[8px] font-bold tracking-wider text-[var(--lime)]">
                        {p.tag}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2 — pull up a chair */}
      <section>
        <SectionTitle marker="2" title="PULL UP A CHAIR" tag={`${STACK_DISCOUNT_PCT}% OFF EACH`} />
        <div className="mt-3 space-y-2.5">
          {STACK.map((s) => {
            const added = stacked.includes(s.id);
            const child = children[s.id];
            /** Adding asks for the child's name and age first; removing is instant. */
            const onSeatClick = () => {
              if (added) {
                toggleSeat(s.id);
                return;
              }
              setDraftSeat({ id: s.id, title: s.title });
            };
            return (
              <button
                key={s.id}
                aria-pressed={added}
                onClick={onSeatClick}
                className={cn(
                  "w-full border p-3.5 text-left transition",
                  theme === "light" ? "rounded-[16px]" : "rounded-2xl",
                  added
                    ? "border-[var(--lime-40)] bg-[var(--lime-04)]"
                    : "border-white/[0.07] hover:border-white/[0.16]",
                  !added && (theme === "light" ? "bg-white/[0.02]" : "bg-black/25 hover:border-white/25"),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                        added
                          ? "border-[var(--lime-30)] bg-[var(--lime-10)] text-[var(--lime)]"
                          : "text-white/60",
                        !added &&
                          (theme === "light"
                            ? "border-black/[0.10] bg-black/[0.04]"
                            : "border-white/10 bg-white/[0.03]"),
                      )}
                    >
                      <s.Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[12px] font-bold uppercase leading-snug tracking-wide text-foreground">
                          {child ? `${child.name}, ${child.age}` : s.title}
                        </h3>
                        {s.badge && (
                          <span
                            className={cn(
                              "rounded border border-fuchsia-400/40 bg-fuchsia-400/15 px-1.5 py-px text-[7px] font-bold tracking-wider",
                              theme === "light" ? "text-[var(--fuchsia)]" : "text-fuchsia-300",
                            )}
                          >
                            {s.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] leading-snug text-white/60">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[8px] font-bold tracking-wider",
                      added
                        ? "border-[var(--lime-solid)] bg-[var(--lime-solid)] text-[var(--on-accent)]"
                        : "border-white/20 text-white/70",
                    )}
                  >
                    {added ? <Check size={10} /> : <Plus size={10} />}
                    {added ? "SEATED" : "ADD"}
                  </span>
                </div>
                <div className="mt-2.5 flex items-end justify-between pl-0.5">
                  <span
                    className={cn(
                      "text-[8px] font-bold tracking-wider",
                      added ? "text-[var(--lime)]" : "text-white/50",
                    )}
                  >
                    {s.tag}
                  </span>
                  <div className="text-right">
                    <span className="mr-1.5 text-[10px] text-white/50 line-through">
                      {inr(s.list)}
                    </span>
                    <span className="text-[14px] font-bold text-[var(--lime)]">
                      {inr(stackPrice(s.list))}
                    </span>
                    <span className="text-[9px] text-white/50"> /yr</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* reservation receipt */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--lime-25)] bg-[var(--bg)] p-4">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, var(--lime-45), transparent)",
          }}
        />
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[8px] font-black tracking-[0.2em] text-[var(--lime)]">
              YOUR RESERVATION
            </p>
            <h2 className="mt-1 text-[14px] font-black uppercase tracking-tight text-foreground">
              {seatCount} seat{seatCount > 1 ? "s" : ""} at the table
            </h2>
          </div>
          <div className="shrink-0 rounded-xl border border-[var(--lime-40)] bg-[var(--lime-10)] px-3 py-1.5 text-center">
            <div className="text-[14px] font-black leading-none text-[var(--lime)]">
              {inr(monthly)}/mo
            </div>
            <div className="mt-0.5 text-[6px] tracking-widest text-white/50">
              EFFECTIVE
            </div>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {lines.map((l) => (
            <li
              key={l.label}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[10px]",
                theme === "light"
                  ? "border-black/[0.10] bg-black/[0.04]"
                  : "keep-white border-white/[0.07] bg-white/[0.02]",
              )}
            >
              <span className="text-white/80">{l.label}</span>
              <span className="shrink-0 font-bold text-foreground">{inr(l.amount)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-2 rounded-lg border border-[var(--lime-30)] bg-[var(--lime-06)] px-2.5 py-2 text-[10px]">
            <span className="text-white/80">
              Vs 1-on-1 Private Tutors ({inr(PRIVATE_TUTOR_ANNUAL)}/yr)
            </span>
            <span className="shrink-0 text-[9px] font-bold text-[var(--lime)]">SAVE {savePct}%</span>
          </li>
        </ul>
      </section>

      <p className="flex items-center justify-center gap-1.5 text-center text-[7px] tracking-wider text-white/50">
        <ShieldCheck size={10} />
        100% COPPA & DPDP COMPLIANT • ZERO ADS • CANCEL ANYTIME
      </p>

      {draftSeat && (
        <ChildSeatSheet
          seatTitle={draftSeat.title}
          onCancel={() => setDraftSeat(null)}
          onSave={(draft) => {
            setChildren((c) => ({ ...c, [draftSeat.id]: draft }));
            setStacked((cur) => (cur.includes(draftSeat.id) ? cur : [...cur, draftSeat.id]));
            setDraftSeat(null);
          }}
        />
      )}
    </div>
  );
}

/* ── plan hook overlay for vedic (dashboard) ── */

export function SeatBuilderIntro({
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
  const [total, setTotal] = useState(0);

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

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closingRef = useRef(false);

  const exit = useCallback((after?: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = overlayRef.current;
    const done = () => (after ? after() : onCloseRef.current());
    if (!el) return done();
    el.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], {
      duration: 280,
      easing: "cubic-bezier(0.55, 0, 0.55, 0.2)",
      fill: "forwards",
    }).addEventListener("finish", done, { once: true });
  }, []);

  const confirm = useCallback(() => {
    store.setPlanId("dual-lane");
    store.setPlanLane(store.targetExam || "cat");
    exit();
  }, [store, exit]);

  return createPortal(
    <div
      ref={overlayRef}
      data-theme-scope
      className={cn(
        "fixed inset-0 z-[var(--z-intro)] overflow-x-clip overflow-y-auto sm:flex sm:items-center sm:justify-center sm:overflow-hidden sm:bg-black/60 sm:backdrop-blur-sm",
        preloaded && "invisible pointer-events-none",
        theme === "light" && "light",
      )}
      role="dialog"
      aria-modal="true"
      aria-hidden={preloaded || undefined}
      aria-labelledby="seat-builder-hook-title"
    >
      <div
        className="relative w-full min-h-full sm:min-h-0 sm:max-w-md sm:max-h-[90vh] sm:flex sm:flex-col sm:overflow-hidden sm:rounded-3xl sm:border sm:border-white/[0.06] sm:shadow-2xl"
        style={{
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
            backgroundImage:
              "repeating-linear-gradient(0deg, var(--glass-025) 0px, var(--glass-025) 1px, transparent 1px, transparent 22px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-80px] h-52 w-52 -translate-x-1/2 rounded-full bg-[var(--lime-12)] blur-[90px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, var(--lime-40), transparent)",
          }}
        />

        <div className="relative mx-auto w-full max-w-[400px] px-5 pb-[max(2rem,var(--sab))] pt-[max(1.5rem,var(--sat))] sm:min-h-0 sm:max-w-none sm:flex-1 sm:overflow-y-auto max-[359px]:px-4">
        <section className="mt-8 text-center">
          <h1
            id="seat-builder-hook-title"
            className="text-[34px] font-extrabold uppercase leading-[0.98] tracking-tight text-foreground"
          >
            One seat is
            <br />
            never{" "}
            <span
              className="text-transparent"
              style={{
                background: `linear-gradient(90deg, var(--lime), var(--lime-mid-2))`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              enough.
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-[320px] text-[12.5px] leading-relaxed text-white/80">
            Head of the table picks the primary lane, then pull up chairs for everyone else — each
            extra seat gets the stack on the spot.
          </p>
        </section>

        <div className="mt-6">
          <SeatBuilderSelector onCheckout={setTotal} />
        </div>

        <button
          onClick={confirm}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-[16px] py-4 text-[12px] font-bold tracking-[0.12em] text-[var(--on-accent)] transition hover:brightness-110 active:scale-[0.98]"
          style={{
            background: `linear-gradient(90deg, var(--lime-solid), var(--lime-light))`,
            boxShadow: "0 10px 34px var(--lime-mid-25), 0 1px 0 var(--glass-25) inset",
          }}
        >
          RESERVE YOUR SEATS FOR {inr(total)}/YR
          <ArrowRight size={14} />
        </button>

        <button
          onClick={() => (onSkip ? exit(onSkip) : exit())}
          className="mx-auto block text-center text-[10px] text-white/50 underline-offset-2 transition-colors hover:text-muted-foreground hover:underline"
        >
          Skip for now
        </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

