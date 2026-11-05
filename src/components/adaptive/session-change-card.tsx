"use client";
import { ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { MasteryStateChip } from "@/components/explorer/mastery-state-chip";
import { changeKind, type ChangeKind, type SessionChange } from "@/lib/learning/session-change";

const readable = (skill: string) => skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");

const SENTENCE: Record<ChangeKind, string> = {
  improved: "Moved up",
  same: "Holding steady",
  slipped: "Needs another look",
  new: "New to you",
};

/**
 * What the session did to each technique, from the learner-state engine. The score line is ACCURACY on this session's answers; the
 * label is MASTERY of the technique over the learner's whole history, and the two are shown apart on purpose. Renders nothing when
 * no change was calculated (history unreadable, or no scored answers).
 */
export function SessionChangeCard({ change }: { change: SessionChange | null | undefined }) {
  if (!change || change.skills.length === 0) return null;
  const strong = change.skills.filter((s) => s.after === "fluid");
  const weak = change.skills.filter((s) => s.after === "fractured");
  return (
    <GlassCard className="mt-4 p-4" data-testid="session-change">
      <p className="text-micro font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">Techniques you practised</p>
      <ul className="mt-3 space-y-3">
        {change.skills.map((s) => {
          const kind = changeKind(s);
          return (
            <li key={s.skill} className="flex items-center gap-3" data-testid="session-change-row" data-kind={kind}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{readable(s.skill)}</span>
                <span className="block text-[11px] text-muted-foreground/60">{s.correct}/{s.attempts} right this session · {SENTENCE[kind]}</span>
              </span>
              {s.before && s.before !== s.after ? (
                <span className="flex items-center gap-1">
                  <MasteryStateChip state={s.before} />
                  <ArrowRight size={12} className="text-muted-foreground/40" aria-hidden />
                  <MasteryStateChip state={s.after} />
                </span>
              ) : (
                <MasteryStateChip state={s.after} />
              )}
            </li>
          );
        })}
      </ul>
      {(strong.length > 0 || weak.length > 0) && (
        <p className="mt-3 text-[11px] text-muted-foreground/60" data-testid="session-change-summary">
          {strong.length > 0 && <>Strong: {strong.map((s) => readable(s.skill)).join(", ")}. </>}
          {weak.length > 0 && <>Needs practice: {weak.map((s) => readable(s.skill)).join(", ")}.</>}
        </p>
      )}
    </GlassCard>
  );
}
