"use client";
import { GlassCard } from "@/components/ui/glass-card";
import { MasteryStateChip } from "@/components/explorer/mastery-state-chip";
import { useLearnerView } from "@/hooks/queries/use-learner-view";
import { stateOf } from "@/lib/learning/mastery-view";
import { breakdownSession } from "@/lib/learning/session-breakdown";
import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

const readable = (skill: string) => skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");

/** This session's accuracy by technique and difficulty, with each technique's mastery label beside it (kept apart: they answer different questions). */
export function SessionBreakdownCard({ questions, answers }: { questions: ReadonlyArray<Question>; answers: ReadonlyArray<SprintAnswer> }) {
  const view = useLearnerView();
  const b = breakdownSession(questions, answers);
  if (b.byTechnique.length === 0 && b.byDifficulty.length === 0) return null;
  return (
    <GlassCard className="mb-5 p-4" data-testid="session-breakdown">
      <p className="text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">This session by technique</p>
      <p className="mt-1 text-[11px] text-muted-foreground/60">Accuracy is how these answers went. The label is how well you know the technique overall.</p>
      <ul className="mt-3 space-y-2">
        {b.byTechnique.map((t) => (
          <li key={t.skill} className="flex items-center gap-3" data-testid="breakdown-technique">
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{readable(t.skill)}</span>
            <span className="shrink-0 text-[12px] text-muted-foreground/70">{t.correct}/{t.attempts} · {t.accuracyPct}%</span>
            <MasteryStateChip state={stateOf(view.data?.states, t.skill)} />
          </li>
        ))}
      </ul>
      {b.byDifficulty.length > 0 && (
        <p className="mt-3 text-[12px] text-muted-foreground/70" data-testid="breakdown-difficulty">
          By difficulty: {b.byDifficulty.map((d) => `level ${d.difficulty} ${d.correct}/${d.attempts}`).join(" · ")}
        </p>
      )}
      {b.avgSeconds !== null && <p className="mt-1 text-[12px] text-muted-foreground/70">Average time per answer: {b.avgSeconds}s</p>}
    </GlassCard>
  );
}
