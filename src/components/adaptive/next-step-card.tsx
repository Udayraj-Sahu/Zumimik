"use client";
import Link from "next/link";
import { ChevronRight, Compass } from "lucide-react";
import { AdaptiveCard, IconTile } from "@/components/adaptive/adaptive-card";
import type { NextStep } from "@/lib/learning/mastery-view";

const readable = (skill: string) => skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");

const COPY: Record<NextStep["kind"], string> = {
  review: "Time to revisit",
  continue: "Keep going with",
  new: "Ready for something new",
};

/** What to practise next, from the learner's own history and the prerequisites. Nothing is shown without one. */
export function NextStepCard({ next, className = "mt-5" }: { next: NextStep | null | undefined; className?: string }) {
  if (!next) return null;
  return (
    <AdaptiveCard label="Recommended next" className={className} data-testid="next-step">
      <Link
        href={`/learn/practice?skill=${encodeURIComponent(next.skill)}`}
        className="group mt-3.5 flex items-center gap-3.5 rounded-2xl border border-white/[0.06] px-4 py-3 outline-none transition-all hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
        aria-label={`Practise ${readable(next.skill)}`}
      >
        <IconTile>
          <Compass size={18} />
        </IconTile>
        <p className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-foreground">
          {COPY[next.kind]}: {readable(next.skill)}
        </p>
        <span className="flex shrink-0 items-center gap-0.5 text-micro font-bold uppercase tracking-wider text-primary">
          Practise <ChevronRight size={12} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </AdaptiveCard>
  );
}
