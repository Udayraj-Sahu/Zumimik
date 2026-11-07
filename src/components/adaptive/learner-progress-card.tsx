"use client";
import { MasteryStateChip } from "@/components/explorer/mastery-state-chip";
import { AdaptiveCard, ROW_CLASS } from "@/components/adaptive/adaptive-card";
import { useLearnerView } from "@/hooks/queries/use-learner-view";
import { summariseProgress } from "@/lib/learning/progress-view";
import { cn } from "@/lib/utils";
const readable = (skill: string) =>
  skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
const ago = (d: number) => (d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`);
const BAR: Record<"fluid" | "fragile" | "fractured", string> = {
  fluid: "bg-[var(--cta-lime)]",
  fragile: "bg-[var(--amber)]",
  fractured: "bg-[var(--red-soft)]",
};
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
  const states = ["fluid", "fragile", "fractured"] as const;
  return (
    <div className="space-y-3" data-testid="learner-progress">
      <AdaptiveCard label="Your learning">
        <p
          className="mt-3 text-[18px] font-bold leading-tight tracking-[-0.02em] text-foreground"
          data-testid="progress-summary"
        >
          {counts.fluid} of {progress.practised} techniques {counts.fluid === 1 ? "is" : "are"}{" "}
          Fluid
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/55">
          Mastery of what you have practised. It is separate from your streak and XP.
        </p>
        <div aria-hidden className="mt-4 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-white/[0.05]">
          {states.map((s) =>
            counts[s] > 0 ? (
              <span
                key={s}
                className={cn("h-full rounded-full", BAR[s])}
                style={{ width: `${(counts[s] / progress.practised) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Techniques by mastery">
          {states.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/75"
            >
              <MasteryStateChip state={s} /> {counts[s]}
            </span>
          ))}
        </div>
        {(progress.strong.length > 0 || progress.weak.length > 0) && (
          <div className="mt-4 flex flex-col gap-2">
            {progress.strong.length > 0 && (
              <p className={cn(ROW_CLASS, "text-[12px] leading-relaxed text-muted-foreground/70")}>
                <span className="font-bold text-foreground/85">Strong:</span>{" "}
                {progress.strong.map(readable).join(", ")}
              </p>
            )}
            {progress.weak.length > 0 && (
              <p className={cn(ROW_CLASS, "text-[12px] leading-relaxed text-muted-foreground/70")}>
                <span className="font-bold text-foreground/85">Needs practice:</span>{" "}
                {progress.weak.map(readable).join(", ")}
              </p>
            )}
          </div>
        )}
        {progress.recent.length > 0 && (
          <>
            <p className="mt-5 text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
              Recent practice
            </p>
            <ul className="mt-2 flex flex-col gap-2" data-testid="recent-practice">
              {progress.recent.map((r) => (
                <li
                  key={r.skill}
                  className={cn(ROW_CLASS, "flex items-center justify-between gap-3 py-2.5 text-[12px]")}
                >
                  <span className="min-w-0 truncate font-semibold text-foreground/85">{readable(r.skill)}</span>
                  <span className="shrink-0 text-muted-foreground/55">{ago(r.daysAgo)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </AdaptiveCard>
    </div>
  );
}
