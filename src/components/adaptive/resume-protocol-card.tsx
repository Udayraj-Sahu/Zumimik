"use client";

import { useRouter } from "next/navigation";
import { GLASS_05, GLASS_BORDER, VIOLET_PURPLE } from "@/lib/theme";
import { Play, X, Clock, Sparkles, ChevronRight } from "lucide-react";
import { useResumeStore } from "@/stores/resume-store";
import { useTodayPlan } from "@/hooks/queries/use-adaptive";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/text";

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * Math.abs(percent));
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = clamp((num >> 16) + (percent > 0 ? amt : -amt));
  const g = clamp(((num >> 8) & 0xff) + (percent > 0 ? amt : -amt));
  const b = clamp((num & 0xff) + (percent > 0 ? amt : -amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function ResumeProtocolCard({
  domain,
  className,
  accent = VIOLET_PURPLE,
  showStartEntry = false,
  kind,
}: {
  domain?: string;
  className?: string;
  accent?: string;
  showStartEntry?: boolean;
  kind?: "sprint" | "mock";
}) {
  const router = useRouter();
  const snapshot = useResumeStore((s) => s.snapshot);
  const clearSnapshot = useResumeStore((s) => s.clearSnapshot);
  const accentSecondary = shade(accent, -20);
  const { data: plan } = useTodayPlan(domain);

  const visibleSnapshot =
    snapshot &&
    (!domain || !snapshot.domain || snapshot.domain === domain) &&
    (!kind || snapshot.kind === kind)
      ? snapshot
      : null;

  const continueHref = () => {
    if (!snapshot) return;
    if (snapshot.kind === "mock" && snapshot.paperId) {
      const params = new URLSearchParams({ paper: snapshot.paperId, resume: "1" });
      if (snapshot.domain) params.set("domain", snapshot.domain);
      router.push(`/learn/mock/run?${params.toString()}`);
      return;
    }
    const params = new URLSearchParams({
      topic: snapshot.topic,
      length: String(snapshot.questions.length),
      difficulty: snapshot.difficulty,
      resume: "1",
    });
    if (snapshot.isAdaptive) {
      params.set("adaptive", "1");
      if (snapshot.domain) params.set("domain", snapshot.domain);
    }
    router.push(`/play/sprint?${params.toString()}`);
  };

  const startRec = plan?.weakTopic ?? plan?.practice ?? null;
  const startHref = startRec
    ? `/play/sprint?topic=${encodeURIComponent(startRec.topicId)}&length=${startRec.length}&difficulty=${encodeURIComponent(startRec.difficulty)}&adaptive=1&domain=${encodeURIComponent(domain ?? "")}`
    : "/play/configure-sprint";

  if (!visibleSnapshot) {
    if (!showStartEntry) return null;
    return (
      <div className={cn("mt-4", className)}>
        <button
          type="button"
          onClick={() => router.push(startHref)}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--on-accent)] transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: `linear-gradient(90deg, ${accent}, var(--cta-to))` }}
        >
          Start Practice <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("mt-4", className)}>
      <div className="relative h-full overflow-hidden rounded-3xl border backdrop-blur-xl" style={{ borderColor: GLASS_BORDER }}>
        <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accentSecondary})` }} />

          <div className="px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ background: `${accent}1a`, color: accent }}>
                {visibleSnapshot.kind === "mock" ? <Play size={9} /> : <Sparkles size={9} />}
                {visibleSnapshot.kind === "mock" ? "Resume Mock" : "Today's Practice"}
              </span>
              <span className="ml-auto text-[10px] font-medium text-muted-foreground/50">{timeAgo(visibleSnapshot.savedAt)}</span>
            </div>

            <p className="mt-3 text-[18px] font-bold tracking-[-0.02em] text-foreground leading-tight">{visibleSnapshot.topicLabel}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/55">
              {visibleSnapshot.kind === "mock" ? "Full-length mock paper in progress" : "Based on topic → subtopic practice set"}
            </p>

            <div className="mt-3.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold text-foreground/75" style={{ background: GLASS_05 }}>
                <Play size={9} style={{ color: accent }} />
                {Math.min(Math.max(0, visibleSnapshot.currentIndex) + 1, visibleSnapshot.questions.length)}/{visibleSnapshot.questions.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold font-mono text-foreground/75" style={{ background: GLASS_05 }}>
                <Clock size={9} style={{ color: accent }} />
                {formatTime(visibleSnapshot.timeLeft)} left
              </span>
            </div>

            <div className="mt-3.5 h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${visibleSnapshot.questions.length > 0 ? (Math.min(visibleSnapshot.currentIndex + 1, visibleSnapshot.questions.length) / visibleSnapshot.questions.length) * 100 : 0}%`,
                  background: `linear-gradient(to right, ${accent}, ${accentSecondary})`,
                }}
              />
            </div>

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={continueHref}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-[11px] font-bold uppercase tracking-widest text-[var(--on-accent)] transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: `linear-gradient(90deg, ${accent}, var(--cta-to))` }}
              >
                <Play size={12} strokeWidth={2.5} /> Resume
              </button>
              <button
                type="button"
                onClick={clearSnapshot}
                className="shrink-0 rounded-2xl border border-white/[0.08] px-4 py-3 text-[11px] font-bold text-muted-foreground/60 transition-all hover:text-foreground hover:bg-white/[0.05] active:scale-[0.98]"
              >
                <span className="inline-flex items-center gap-1.5"><X size={11} /> Dismiss</span>
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}