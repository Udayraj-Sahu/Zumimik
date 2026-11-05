"use client";
import { useEffect, useRef, useState } from "react";
import { Ghost as GhostIcon, Swords } from "lucide-react";
import { IS_MOCK } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useRaceGhost, useSaveGhost } from "@/hooks/queries/use-ghosts";
import { gatedFeatureMessage } from "@/services/flags";
import type { GhostRaceResult } from "@/services/ghosts";
import type { Question, SprintResult } from "@/lib/types/sprint-session";

/**
 * On the sprint results: (1) when this run was a race (?ghost=ID) the result is posted once and the outcome shown;
 * (2) the run can be saved as a ghost for others to race. Real backend only; the server decides who may see a ghost.
 */
export function GhostPanel({ ghostId, skill, domain, questions, result }: {
  ghostId: string | null;
  skill: string;
  domain?: string;
  questions: ReadonlyArray<Question>;
  result: SprintResult;
}) {
  const race = useRaceGhost();
  const save = useSaveGhost();
  const [isPublic, setIsPublic] = useState(false);
  const [raced, setRaced] = useState<GhostRaceResult | null>(null);
  const [raceError, setRaceError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const raceSent = useRef(false);

  useEffect(() => {
    if (IS_MOCK || !ghostId || raceSent.current) return;
    raceSent.current = true;
    race.mutate(
      { ghostId, timeMs: result.totalTimeSpent * 1000, correct: result.score },
      {
        onSuccess: setRaced,
        onError: (e) => setRaceError(gatedFeatureMessage(e, "Ghost races") ?? (e instanceof Error ? e.message : "Couldn't record the race.")),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostId]);

  if (IS_MOCK) return null;

  const handleSave = () => {
    setSaveError(null);
    save.mutate(
      { skill, domain, questions, result, isPublic },
      {
        onSuccess: () => setSaved(true),
        onError: (e) => setSaveError(gatedFeatureMessage(e, "Ghosts") ?? (e instanceof Error ? e.message : "Couldn't save the ghost.")),
      },
    );
  };

  return (
    <div className="mt-4 space-y-3" data-testid="ghost-panel">
      {ghostId && (
        <GlassCard className="p-4 text-center" data-testid="ghost-race-result">
          <Swords size={20} className="mx-auto mb-1 text-[var(--primary)]" aria-hidden />
          {race.isPending && <p role="status" className="text-[13px] text-muted-foreground/60">Recording the race…</p>}
          {raceError && <p role="alert" className="text-[13px] text-red-500">{raceError}</p>}
          {raced && (
            <>
              <p className="text-[15px] font-bold text-foreground">{raced.won ? "You beat the ghost!" : "The ghost won this one"}</p>
              <p className="mt-1 text-[12px] text-muted-foreground/60">
                Ghost: {raced.ghostCorrect} correct in {Math.round(raced.ghostTimeMs / 1000)}s · You: {result.score} in {Math.round(result.totalTimeSpent)}s
                {raced.xpAwarded ? ` · +${raced.xpAwarded} XP` : ""}
              </p>
            </>
          )}
        </GlassCard>
      )}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-[13px] font-bold text-foreground"><GhostIcon size={16} aria-hidden /> Save this run as a ghost</div>
        {saved ? (
          <p role="status" className="mt-2 text-[12px] text-muted-foreground/70">Saved. {isPublic ? "Anyone can race it (anonymously)." : "You and your friends can race it."}</p>
        ) : (
          <>
            <label className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground/70">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Make it public (shown as Anonymous)
            </label>
            {saveError && <p role="alert" className="mt-2 text-[12px] text-red-500">{saveError}</p>}
            <Button size="sm" className="mt-3" onClick={handleSave} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save ghost"}</Button>
          </>
        )}
      </GlassCard>
    </div>
  );
}
