"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import {
  X,
  ArrowLeft,
  AlertTriangle,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  Plus,
  Check,
  Trash2,
  Zap,
  Calculator,
  BookOpen,
  CreditCard,
  Calendar,
  Dumbbell,
  Clock,
  Heart,
  Sparkles,
  Bell,
  BellOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { todayStr } from "@/lib/text";
import { TimePicker } from "@/components/ui/time-picker";
import { AMBER, AMBER_08, CYAN, CYAN_08, DEEP_BLACK_2, DEEP_BLACK_2_CC, DEEP_BLACK_2_EE, EMERALD, EMERALD_08, EMERALD_DEEP, EMERALD_SOLID, GLASS_012, GLASS_025, GLASS_18, GLASS_40, GLASS_75, GLASS_BG, ROSE, VIOLET, VIOLET_DIM, VIOLET_GLOW, VIOLET_PURPLE, WHITE } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";
import { useHabitStore } from "@/stores/habit-store";

async function isNativePlatform(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

const ICON_MAP: Record<string, LucideIcon> = {
  Zap, Calculator, BookOpen, CreditCard, Target,
  Dumbbell, Clock, Heart, Flame, Calendar,
};

const COLOR_OPTIONS = [
  { color: "var(--primary)", label: "Primary" },
  { color: CYAN, label: "Cyan" },
  { color: VIOLET_PURPLE, label: "Violet" },
  { color: AMBER, label: "Amber" },
  { color: ROSE, label: "Pink" },
  { color: EMERALD, label: "Emerald" },
];

const ICON_OPTIONS = [
  "Zap", "Calculator", "BookOpen", "CreditCard", "Target",
  "Dumbbell", "Clock", "Heart", "Flame", "Calendar",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

const DAY_PILLS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_JS: number[] = [1, 2, 3, 4, 5, 6, 0];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function allDays(): number[] {
  return [...ALL_DAYS];
}

function reminderLabel(days: number[] | undefined, time: string): string {
  const list = days && days.length > 0 ? [...days].sort((a, b) => a - b) : allDays();
  if (list.length === 7) return `Every day at ${time}`;
  if (list.length === 5 && [1, 2, 3, 4, 5].every((d) => list.includes(d))) {
    return `Weekdays at ${time}`;
  }
  return `${list.map((d) => DAY_SHORT[d]).join(" · ")} at ${time}`;
}

async function requestNotificationPermission(): Promise<boolean> {
  if (await isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display === "granted") return true;
      const req = await LocalNotifications.requestPermissions();
      return req.display === "granted";
    } catch {
      return false;
    }
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function habitBaseId(habitId: string): number {
  let h = 0;
  for (let i = 0; i < habitId.length; i++) {
    h = (h << 5) - h + habitId.charCodeAt(i);
    h |= 0;
  }
  return (Math.abs(h) % 900_000) + 100_000;
}

async function scheduleReminder(habitId: string, habitName: string, time: string, days: number[]) {
  const [hours, minutes] = time.split(":").map(Number);
  if (await isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const base = habitBaseId(habitId);
      await LocalNotifications.schedule({
        notifications: days.map((d, i) => ({
          title: "Habit Reminder",
          body: `Time to: ${habitName}`,
          id: base + i,
          schedule: {
            on: { weekday: d + 1, hour: hours, minute: minutes },
            allowWhileIdle: true,
          },
          extra: { habitId, source: "habit-reminder" },
        })),
      });
    } catch {
      /* notification scheduling failed silently */
    }
    return;
  }
  days.forEach((d) => scheduleWebReminder(habitId, habitName, hours, minutes, d));
}

function scheduleWebReminder(habitId: string, habitName: string, hours: number, minutes: number, day: number) {
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  next.setDate(next.getDate() + ((day - next.getDay() + 7) % 7));
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 7);
  const delay = next.getTime() - now.getTime();
  return window.setTimeout(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Habit Reminder", {
        body: `Time to: ${habitName}`,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: `habit-${habitId}`,
      });
    }
    scheduleWebReminder(habitId, habitName, hours, minutes, day);
  }, delay);
}

async function cancelReminder(habitId: string) {
  if (!(await isNativePlatform())) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications
      .filter((n) => n.extra?.habitId === habitId && n.extra?.source === "habit-reminder")
      .map((n) => n.id);
    if (ids.length > 0) await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}

type Props = { onClose: () => void };

export function HabitTrackerModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  // #34D399 reads well on the dark surface but fails contrast on light; swap in
  // the darker emerald when the scope flips so badges/labels stay legible.
  const habitAccent = theme === "light" ? EMERALD_DEEP : VIOLET;
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("Zap");
  const [newColor, setNewColor] = useState("var(--primary)");
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState("08:00");
  const [draftDays, setDraftDays] = useState<number[]>(allDays());
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const toggleLog = useHabitStore((s) => s.toggleLog);
  const removeHabit = useHabitStore((s) => s.removeHabit);
  const addHabit = useHabitStore((s) => s.addHabit);
  const setReminder = useHabitStore((s) => s.setReminder);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const today = useMemo(() => todayStr(), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let enabled = false;
      if (await isNativePlatform()) {
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const perms = await LocalNotifications.checkPermissions();
          enabled = perms.display === "granted";
        } catch {
          enabled = false;
        }
      } else if ("Notification" in window) {
        enabled = Notification.permission === "granted";
      }
      if (mounted) setNotifsEnabled(enabled);
    })();
    return () => { mounted = false; };
  }, []);

  const todayLogIds = useMemo(() => {
    return new Set(logs.filter((l) => l.date === today && l.completed).map((l) => l.habitId));
  }, [logs, today]);

  const habitsWithToday = useMemo(() => {
    return habits.map((h) => {
      const todayCompleted = todayLogIds.has(h.id);
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().split("T")[0];
        const found = logs.some((l) => l.habitId === h.id && l.date === ds && l.completed);
        if (found) streak++;
        else if (i > 0) break;
        d.setDate(d.getDate() - 1);
      }
      return { ...h, todayCompleted, streak };
    });
  }, [habits, logs, todayLogIds]);

  const stats = useMemo(() => {
    const completed = logs.filter((l) => l.completed);
    const dates = new Set(completed.map((l) => l.date));
    let bestStreak = 0;
    let current = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = d.toISOString().split("T")[0];
      if (dates.has(ds)) { current++; bestStreak = Math.max(bestStreak, current); }
      else if (i > 0) current = 0;
      d.setDate(d.getDate() - 1);
    }
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const recent = completed.filter((l) => l.date >= thirtyAgo.toISOString().split("T")[0]);
    const expectedMax = habits.length * 30;
    const completionRate = expectedMax > 0 ? Math.min(100, Math.round((recent.length / expectedMax) * 100)) : 0;
    return { currentStreak: current, bestStreak, totalCompletions: completed.length, completionRate };
  }, [logs, habits.length]);

  const monthLogs = useMemo(() => {
    const prefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
    const byDate: Record<string, number> = {};
    logs.filter((l) => l.date.startsWith(prefix) && l.completed).forEach((l) => {
      byDate[l.date] = (byDate[l.date] || 0) + 1;
    });
    return byDate;
  }, [logs, calYear, calMonth]);

  useEffect(() => {
    if (overlayRef.current) gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
    if (contentRef.current) gsap.fromTo(contentRef.current, { y: "100%" }, { y: "0%", duration: 0.35, ease: "power3.out" });
  }, []);

  const handleClose = useCallback(() => {
    if (overlayRef.current) gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
    if (contentRef.current) gsap.to(contentRef.current, { y: "100%", duration: 0.3, ease: "power3.in", onComplete: onClose });
  }, [onClose]);

  const handleAddHabit = useCallback(() => {
    if (!newName.trim()) return;
    addHabit(newName.trim(), newIcon, newColor);
    setNewName(""); setNewIcon("Zap"); setNewColor("var(--primary)"); setShowAdd(false);
  }, [newName, newIcon, newColor, addHabit]);

  const handleToggleReminder = useCallback(async (habitId: string, current: string | undefined, _habitName: string, days?: number[]) => {
    if (current) { setReminder(habitId, undefined); await cancelReminder(habitId); setEditingReminder(null); return; }
    setNotifError(null);
    if (!notifsEnabled) {
      const granted = await requestNotificationPermission();
      setNotifsEnabled(granted);
      if (!granted) {
        setNotifError("Notifications are blocked, so reminders won't be sent. Allow them in your device settings.");
        return;
      }
    }
    setDraftTime(current ?? "08:00");
    setDraftDays(days && days.length > 0 ? [...days] : allDays());
    setEditingReminder(habitId);
  }, [notifsEnabled, setReminder]);

  const handleSetTime = useCallback(async (habitId: string, time: string, habitName: string, days: number[]) => {
    await cancelReminder(habitId);
    setReminder(habitId, time, days);
    await scheduleReminder(habitId, habitName, time, days);
    setNotifError(null);
    setEditingReminder(null);
  }, [setReminder]);

  const calDays = getDaysInMonth(calYear, calMonth);
  const calFirstDay = getFirstDayOfWeek(calYear, calMonth);
  const todayDate = new Date();
  const isCurrentMonth = calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth();
  const monthName = new Date(calYear, calMonth).toLocaleString("en-US", { month: "long", year: "numeric" });
  const completedToday = habitsWithToday.filter((h) => h.todayCompleted).length;
  const totalHabits = habitsWithToday.length;
  const todayPct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  const statCards = [
    { icon: Flame, label: "STREAK", value: `${stats.currentStreak}d`, color: habitAccent, bg: VIOLET_DIM },
    { icon: Target, label: "DONE", value: `${stats.totalCompletions}`, color: CYAN, bg: CYAN_08 },
    { icon: TrendingUp, label: "RATE", value: `${stats.completionRate}%`, color: EMERALD, bg: EMERALD_08 },
    { icon: Trophy, label: "BEST", value: `${stats.bestStreak}d`, color: EMERALD_SOLID, bg: AMBER_08 },
  ];

  return createPortal(
    <div
      ref={overlayRef}
      data-theme-scope
      className={cn(
        "fixed inset-0 z-[var(--z-intro)] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center",
        theme === "light" && "light",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-tracker-title"
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{
          background: theme === "light" ? "var(--bg-2)" : `linear-gradient(180deg, ${DEEP_BLACK_2} 0%, ${DEEP_BLACK_2} 30%)`,
          boxShadow: "0 -8px 60px var(--accent-12), 0 0 1px var(--glass-06)",
          border: "1px solid var(--glass-06)",
        }}
      >
        {/* Gradient glow behind header */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[120px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, var(--accent-40) 0%, transparent 70%)" }} />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: `linear-gradient(180deg, ${DEEP_BLACK_2_EE} 0%, ${DEEP_BLACK_2_CC} 100%)`, backdropFilter: "blur(20px)" }}>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "grid size-11 place-items-center rounded-xl transition-colors hover:bg-white/5 hover:text-foreground",
              theme === "light" ? "text-white/50" : "text-muted-foreground/50",
            )}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: VIOLET_DIM, border: `1px solid ${VIOLET_GLOW}` }}>
            <Sparkles size={10} style={{ color: habitAccent }} />
            <span id="habit-tracker-title" className="text-micro font-semibold tracking-[0.22em]" style={{ color: habitAccent }}>DAILY HABITS</span>
          </div>
          <button
            type="button"
            onClick={async () => { setNotifError(null); const g = await requestNotificationPermission(); setNotifsEnabled(g); if (!g) setNotifError("Notifications are blocked, so reminders won't be sent. Allow them in your device settings."); }}
            className="grid size-11 place-items-center rounded-xl transition-colors hover:bg-white/5"
            title={notifsEnabled ? "Notifications enabled" : "Enable notifications"}
            aria-label={notifsEnabled ? "Notifications enabled" : "Enable notifications"}
          >
            {notifsEnabled ? <Bell size={16} style={{ color: habitAccent }} /> : <BellOff size={16} className={theme === "light" ? "text-white/40" : "text-muted-foreground/40"} />}
          </button>
        </div>

        <div className="px-5 pb-6 pt-2 space-y-5">
          {notifError && (
            <div
              role="alert"
              className={cn(
                "flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[10.5px] font-medium leading-relaxed",
                theme === "light" ? "text-amber-700" : "text-amber-200",
              )}
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{notifError}</span>
            </div>
          )}

          {/* Today's circular progress + stats */}
          <div
            className={cn(
              "flex items-center gap-5",
              theme === "light" && "rounded-3xl p-4",
            )}
            style={
              theme === "light"
                ? { background: "var(--card)", border: "1px solid var(--glass-06)" }
                : undefined
            }
          >
            <div className="relative shrink-0">
              <svg width="92" height="92" viewBox="0 0 92 92">
                <circle cx="46" cy="46" r="40" fill="none" stroke="var(--accent-08)" strokeWidth="6" />
                <circle
                  cx="46" cy="46" r="40" fill="none" stroke={habitAccent} strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - todayPct / 100)}`}
                  transform="rotate(-90 46 46)"
                  className="transition-all duration-700"
                  style={{ filter: "drop-shadow(0 0 6px var(--accent-40))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[16px] font-bold text-foreground leading-none">{completedToday}</span>
                <span className={cn("text-[8px] font-semibold mt-0.5", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}>/ {totalHabits}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl px-3 py-2.5" style={{ background: s.bg, border: `1px solid ${s.color}15` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon size={11} style={{ color: s.color }} />
                    <span className={cn("text-[8px] font-bold tracking-wider", theme === "light" ? "text-white/50" : "text-muted-foreground/50")}>{s.label}</span>
                  </div>
                  <p className="text-[13px] font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Heatmap */}
          <div
            className={cn("rounded-3xl p-4", theme === "light" && "border")}
            style={
              theme === "light"
                ? { background: "var(--card)", border: "1px solid var(--glass-06)" }
                : { background: GLASS_BG, border: "1px solid var(--glass-06)" }
            }
          >
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }} className={cn("hover:text-foreground transition-colors text-[14px] font-bold px-2 py-1 rounded-lg hover:bg-white/5", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}>
                ‹
              </button>
              <span className={cn("text-[11px] font-bold tracking-wide", theme === "light" ? "text-white/80" : "text-foreground/80")}>{monthName}</span>
              <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }} className={cn("hover:text-foreground transition-colors text-[14px] font-bold px-2 py-1 rounded-lg hover:bg-white/5", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}>
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className={cn("text-[9px] font-semibold tracking-wider", theme === "light" ? "text-white/30" : "text-muted-foreground/30")}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: calFirstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: calDays }).map((_, i) => {
                const day = i + 1;
                const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const count = monthLogs[ds] || 0;
                const pct = totalHabits > 0 ? count / totalHabits : 0;
                const isToday = isCurrentMonth && day === todayDate.getDate();
                const isFuture = isCurrentMonth && day > todayDate.getDate();
                let bg = GLASS_025;
                let tc = GLASS_18;
                if (!isFuture && count > 0) {
                  if (pct >= 1) { bg = "var(--accent-50)"; tc = WHITE; }
                  else if (pct >= 0.5) { bg = "var(--accent-25)"; tc = GLASS_75; }
                  else { bg = "var(--accent-10)"; tc = GLASS_40; }
                }
                if (isFuture) bg = GLASS_012;
                return (
                  <div
                    key={day}
                    className={cn(
                      "aspect-square rounded-[4px] flex items-center justify-center text-micro font-medium transition-all duration-300",
                      isToday && "ring-1 shadow-[0_0_8px_var(--accent-40)]",
                    )}
                    style={{ background: bg, color: tc, ...(isToday ? { ringColor: habitAccent } : {}) }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Habits */}
          <div>
            <div
              className={cn(
                "flex items-center justify-between mb-3",
                theme === "light" && "rounded-2xl px-4 py-3",
              )}
              style={
                theme === "light"
                  ? { background: "var(--card)", border: "1px solid var(--glass-06)" }
                  : undefined
              }
            >
<p className={cn("text-[13px] font-bold uppercase tracking-[0.18em]", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}>
                  TODAY — {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${todayPct}%`, background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))` }} />
                </div>
                <span className="text-micro font-bold" style={{ color: habitAccent }}>{todayPct}%</span>
              </div>
            </div>
            <div className="space-y-2">
              {habitsWithToday.map((h) => {
                const IconComp = ICON_MAP[h.icon] || Zap;
                const isEditing = editingReminder === h.id;
                return (
                  <div key={h.id} className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleLog(h.id)}
                      className={cn(
                        "group w-full flex items-center gap-3 rounded-2xl border px-4 py-2.5 transition-all duration-200 text-left active:scale-[0.98]",
                        h.todayCompleted
                          ? "border-transparent"
                          : "border-white/[0.06] hover:border-white/[0.12]",
                      )}
                      style={h.todayCompleted
                        ? { background: `linear-gradient(135deg, ${VIOLET_DIM}, var(--accent-06))`, border: `1px solid ${VIOLET_GLOW}` }
                        : { background: theme === "light" ? "var(--card)" : GLASS_BG }}
                    >
                      <div
                        className={cn(
                          "shrink-0 size-9 rounded-xl flex items-center justify-center transition-all duration-200",
                          h.todayCompleted ? "text-[var(--on-accent)]" : "border bg-white/[0.03]",
                        )}
                        style={h.todayCompleted
                          ? { background: `linear-gradient(135deg, var(--cta-from), var(--cta-to))`, boxShadow: `0 0 12px ${VIOLET_GLOW}` }
                          : { borderColor: `${h.color}25` }}
                      >
                        {h.todayCompleted ? <Check size={15} strokeWidth={3} /> : <IconComp size={14} style={{ color: h.color }} className="opacity-50" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[13px] font-semibold truncate transition-colors", h.todayCompleted ? "text-foreground" : theme === "light" ? "text-white/55" : "text-foreground/55")}>{h.name}</p>
                        <p className={cn("text-[13px] mt-0.5", theme === "light" ? "text-white/60" : "text-muted-foreground/60")}>{h.category === "auto" ? "Auto-tracked" : "Manual"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {h.streak > 0 && (
                          <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ background: `${h.color}10` }}>
                            <Flame size={10} style={{ color: h.color }} />
                            <span className="text-[13px] font-bold" style={{ color: h.color }}>{h.streak}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleReminder(h.id, h.reminderTime, h.name, h.reminderDays); }}
                          className={cn(
                            "size-7 rounded-lg flex items-center justify-center transition-all shrink-0",
                            h.reminderTime
                              ? "bg-[var(--accent-12)]"
                              : theme === "light"
                                ? h.todayCompleted
                                  ? "text-white/50 dark:text-white/50 hover:text-white dark:hover:text-white hover:bg-white/5"
                                  : "text-white/20 dark:text-white/20 hover:text-white/50 dark:hover:text-white/50 hover:bg-white/5"
                                : "text-muted-foreground/20 hover:text-muted-foreground/50 hover:bg-white/5",
                          )}
                          style={h.reminderTime ? { color: habitAccent } : undefined}
                          title={h.reminderTime ? `Reminds ${reminderLabel(h.reminderDays, h.reminderTime)}` : "Set reminder"}
                          aria-label={h.reminderTime ? `Reminder set for ${reminderLabel(h.reminderDays, h.reminderTime)}` : "Set reminder"}
                        >
                          {h.reminderTime ? <Bell size={12} /> : <BellOff size={12} />}
                        </button>
                        {h.category === "manual" && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void cancelReminder(h.id); removeHabit(h.id); }}
                            className={cn(
                              "size-7 rounded-lg flex items-center justify-center shrink-0 transition-all hover:text-destructive hover:bg-destructive/10",
                              theme === "light"
                                ? h.todayCompleted
                                  ? "text-white/50 hover:text-destructive"
                                  : "text-white/25"
                                : "text-muted-foreground/25",
                            )}
                            title="Remove habit"
                            aria-label="Remove habit"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </button>

                    {isEditing && (
                      <div className="mx-2 mt-1 rounded-xl px-3 py-3 space-y-2.5" style={{ background: VIOLET_DIM, border: `1px solid ${VIOLET_GLOW}` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} style={{ color: habitAccent }} />
                            <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: `${habitAccent}cc` }}>
                              Daily Reminder
                            </p>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditingReminder(null); }} className={cn("hover:text-foreground transition-colors", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}>
                            <X size={12} />
                          </button>
                        </div>

                        <TimePicker value={draftTime} onChange={setDraftTime} />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} style={{ color: habitAccent }} />
                            <p className={cn("text-[9px] font-bold uppercase tracking-[0.12em]", theme === "light" ? "text-white/50" : "text-muted-foreground/50")}>
                              Repeat on
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDraftDays(draftDays.length === 7 ? [] : allDays()); }}
                            className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors", draftDays.length === 7 ? "text-[var(--on-accent)]" : theme === "light" ? "text-white/40 hover:text-foreground" : "text-muted-foreground/40 hover:text-foreground")}
                            style={draftDays.length === 7 ? { background: `${habitAccent}22`, border: `1px solid ${habitAccent}40` } : undefined}
                          >
                            {"Every day"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          {DAY_PILLS.map((label, i) => {
                            const jsDay = DAY_JS[i];
                            const active = draftDays.includes(jsDay);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setDraftDays((prev) => (active ? prev.filter((d) => d !== jsDay) : [...prev, jsDay])); }}
                                className={cn(
                                  "flex h-8 flex-1 items-center justify-center rounded-lg text-[11px] font-bold transition-all",
                                  active
                                    ? "text-[var(--on-accent)]"
                                    : theme === "light"
                                      ? "bg-white/[0.05] text-white/40 hover:bg-white/[0.08]"
                                      : "bg-white/[0.05] text-muted-foreground/40 hover:bg-white/[0.08]",
                                )}
                                style={active ? { background: `linear-gradient(135deg, var(--cta-from), var(--cta-to))`, boxShadow: `0 0 10px ${VIOLET_GLOW}` } : undefined}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        {draftDays.length === 0 && (
                          <p className="text-center text-[9px] font-semibold text-destructive/70">Pick at least one day</p>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSetTime(h.id, draftTime, h.name, draftDays)}
                          disabled={draftDays.length === 0}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-micro font-bold uppercase tracking-widest text-[var(--on-accent)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: `linear-gradient(135deg, var(--cta-from), var(--cta-to))`, boxShadow: `0 0 12px ${VIOLET_GLOW}` }}
                        >
                          <Bell size={11} /> Set reminder
                        </button>
                      </div>
                    )}

                    {!isEditing && h.reminderTime && (
                      <div className="flex items-center gap-1.5 mx-6">
                        <div className="size-1 rounded-full animate-pulse" style={{ background: habitAccent }} />
                        <span className="text-micro font-medium" style={{ color: `${habitAccent}99` }}>{reminderLabel(h.reminderDays, h.reminderTime)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Habit */}
          {showAdd ? (
            <div className="rounded-3xl p-4 space-y-3" style={{ background: VIOLET_DIM, border: `1px solid ${VIOLET_GLOW}` }}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: `${habitAccent}cc` }}>NEW HABIT</p>
                <button type="button" onClick={() => setShowAdd(false)} className={cn("hover:text-foreground transition-colors", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}><X size={14} /></button>
              </div>
              <input
                type="text" placeholder="Habit name..." value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddHabit(); }} autoFocus
                className={cn("w-full rounded-xl border px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--accent-30)] transition-colors", theme === "light" ? "border-border/50 bg-black/[0.03]" : "border-white/[0.08] bg-white/[0.04]")}
              />
              <div className="flex items-center gap-2">
                <span className={cn("text-micro font-semibold shrink-0", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}>ICON</span>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_OPTIONS.map((iconName) => {
                    const IC = ICON_MAP[iconName] || Zap;
                    return (
                      <button key={iconName} type="button" onClick={() => setNewIcon(iconName)}
                        className={cn("size-8 rounded-lg flex items-center justify-center transition-all", newIcon === iconName ? "bg-[var(--accent-15)]" : theme === "light" ? "bg-black/[0.04] text-white/40 hover:bg-black/[0.08]" : "bg-white/[0.04] text-muted-foreground/40 hover:bg-white/[0.08]")}
                        style={newIcon === iconName ? { color: habitAccent } : undefined}
                      >
                        <IC size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-micro font-semibold shrink-0", theme === "light" ? "text-white/40" : "text-muted-foreground/40")}>COLOR</span>
                <div className="flex gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c.color} type="button" onClick={() => setNewColor(c.color)}
                      className={cn("size-6 rounded-full transition-all border-2", newColor === c.color ? (theme === "light" ? "border-foreground/70 scale-110" : "border-white scale-110") : "border-transparent hover:scale-105")}
                      style={{ background: c.color }}
                    />
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleAddHabit} disabled={!newName.trim()}
                className={cn("w-full rounded-xl py-2.5 text-[13px] font-semibold transition-all", newName.trim() ? "text-[var(--on-accent)]" : theme === "light" ? "bg-white/[0.06] text-white/30 cursor-not-allowed" : "bg-white/[0.06] text-muted-foreground/30 cursor-not-allowed")}
                style={newName.trim() ? { background: `linear-gradient(135deg, var(--cta-from), var(--cta-to))`, boxShadow: `0 0 16px ${VIOLET_GLOW}` } : undefined}
              >
                Add Habit
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed py-3.5 text-[13px] font-semibold transition-all hover:bg-[var(--accent-04)]"
              style={theme === "light" ? { background: "var(--card)", borderColor: "var(--accent-25)", color: "var(--primary)" } : { borderColor: "var(--accent-15)", color: "var(--primary)" }}
            >
              <Plus size={14} />
              Add Habit
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
