"use client";
import { GlassCard } from "@/components/ui/glass-card";
import { MasteryStateChip } from "@/components/explorer/mastery-state-chip";
import { NextStepCard } from "@/components/adaptive/next-step-card";
import { useLearnerView } from "@/hooks/queries/use-learner-view";
import { summariseProgress } from "@/lib/learning/progress-view";
const readable = (skill: string) =>
  skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
const ago = (d: number) => (d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`);
/**
 * The Adaptive Learning tab's view of the learner model: where they stand by technique, what is strong and what needs practice, what they did
 * lately, and what to do next (the revision list is its own card in the same tab). Every number is a count of the engine's mastery labels or a date from their history;
 * XP, streaks and question counts live elsewhere on the page and are not mastery. Real backend only; hidden until the learner has
 * history the app can read.
 */
export function LearnerProgressCard() {
  const view = useLearnerView();
  const progress = summariseProgress(view.data?.states, Date.now());
  if (!progress || progress.practised === 0) return null;
  const { counts } = progress;
  return (
    <div className="space-y-3" data-testid="learner-progress">
      <GlassCard className="p-4">
        <p className="text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
          Your learning
        </p>
        <p
          className="mt-1 text-[14px] font-semibold text-foreground"
          data-testid="progress-summary"
        >
          {counts.fluid} of {progress.practised} techniques {counts.fluid === 1 ? "is" : "are"}{" "}
          Fluid
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          Mastery of what you have practised. It is separate from your streak and XP.
        </p>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Techniques by mastery">
          {(["fluid", "fragile", "fractured"] as const).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground/70"
            >
              <MasteryStateChip state={s} /> {counts[s]}
            </span>
          ))}
        </div>
        {progress.strong.length > 0 && (
          <p className="mt-3 text-[12px] text-muted-foreground/70">
            Strong: {progress.strong.map(readable).join(", ")}
          </p>
        )}
        {progress.weak.length > 0 && (
          <p className="mt-1 text-[12px] text-muted-foreground/70">
            Needs practice: {progress.weak.map(readable).join(", ")}
          </p>
        )}
        <ul className="mt-3 space-y-1" data-testid="recent-practice">
          {progress.recent.map((r) => (
            <li
              key={r.skill}
              className="flex items-center justify-between text-[12px] text-muted-foreground/70"
            >
              <span className="truncate">{readable(r.skill)}</span>
              <span className="ml-2 shrink-0">{ago(r.daysAgo)}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
      <NextStepCard next={view.data?.next} />
    </div>
  );
}
