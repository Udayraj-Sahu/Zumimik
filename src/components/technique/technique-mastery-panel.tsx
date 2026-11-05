"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { wholeDaysSince } from "@vmsg/psychometrics";
import { IS_MOCK } from "@/lib/platform";
import { GlassCard } from "@/components/ui/glass-card";
import { MasteryStateChip } from "@/components/explorer/mastery-state-chip";
import { useLearnerView } from "@/hooks/queries/use-learner-view";
import { useMasteryHistory } from "@/hooks/queries/use-mastery-history";
import { adviceFor, STATE_DESCRIPTION, stateOf } from "@/lib/learning/mastery-view";

const ago = (d: number) => (d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`);
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The learner's own standing on one technique, on its lesson page: the engine's label, when they last practised it, the label changes
 * recorded on this device, and what to do next. Nothing is calculated here: it reads the shared selectors. Hidden in demo mode and
 * until the learner's history can be read.
 */
export function TechniqueMasteryPanel({ skillId, skillLabel }: { skillId: string; skillLabel: string }) {
  const view = useLearnerView();
  const history = useMasteryHistory(skillId);
  if (IS_MOCK || !view.data?.states) return null;
  const state = stateOf(view.data.states, skillId);
  const inReview = (view.data.steps ?? []).some((s) => s.skill === skillId && s.kind === "review");
  const advice = adviceFor(state, inReview);
  const last = view.data.states[skillId]?.lastPracticedAt ?? null;
  const rows = history.data ?? [];
  return (
    <GlassCard className="mt-5 p-4" data-testid="technique-mastery">
      <p className="text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">Your progress</p>
      <div className="mt-2 flex items-center gap-2">
        <MasteryStateChip state={state} />
        <span className="text-[13px] font-semibold text-foreground" data-testid="technique-mastery-state">{state ? STATE_DESCRIPTION[state] : "Not started"}</span>
      </div>
      {last !== null && <p className="mt-1 text-[12px] text-muted-foreground/60" data-testid="technique-last-practice">Last practised {ago(wholeDaysSince(last, Date.now()))}</p>}
      {rows.length > 0 ? (
        <ul className="mt-3 space-y-1" data-testid="technique-history">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-[12px] text-muted-foreground/70">
              <span>{r.before ? `${label(r.before)} to ${label(r.after)}` : `First practice: ${label(r.after)}`}</span>
              <span className="ml-2 shrink-0">{ago(wholeDaysSince(r.at, Date.now()))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-muted-foreground/50" data-testid="technique-history-empty">Changes will appear here as you practise.</p>
      )}
      <p className="mt-3 text-[12px] text-foreground/80" data-testid="technique-advice">{advice.text}</p>
      <Link
        href={`/learn/practice?skill=${encodeURIComponent(skillId)}&start=1`}
        data-testid="technique-mastery-practice"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${advice.action === "revise" ? "Revise" : "Practise"} ${skillLabel}`}
      >
        {advice.action === "revise" ? "Revise now" : advice.action === "start" ? "Start" : "Practise"} <ArrowRight size={14} aria-hidden />
      </Link>
    </GlassCard>
  );
}
