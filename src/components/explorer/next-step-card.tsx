"use client";
import Link from "next/link";
import { Compass } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GLASS_BORDER } from "@/lib/theme";
import type { NextStep } from "@/lib/learning/mastery-view";

const readable = (skill: string) => skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");

const COPY: Record<NextStep["kind"], string> = {
  review: "Time to revisit",
  continue: "Keep going with",
  new: "Ready for something new",
};

/** What to practise next, from the learner's own history and the prerequisites. Nothing is shown without one. */
export function NextStepCard({ next }: { next: NextStep | null | undefined }) {
  if (!next) return null;
  return (
    <GlassCard className="mt-5 flex items-center gap-3 p-4" data-testid="next-step">
      <Compass size={20} className="shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">Recommended next</p>
        <p className="truncate text-[14px] font-semibold text-foreground">{COPY[next.kind]}: {readable(next.skill)}</p>
      </div>
      <Link
        href={`/learn/practice?skill=${encodeURIComponent(next.skill)}`}
        className="shrink-0 rounded-full border px-3 py-1 text-micro font-bold uppercase tracking-wider text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ borderColor: GLASS_BORDER }}
        aria-label={`Practise ${readable(next.skill)}`}
      >
        Practise
      </Link>
    </GlassCard>
  );
}
