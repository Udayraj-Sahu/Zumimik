"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GLASS_BORDER } from "@/lib/theme";
import { examMasteryNotice, masteryNotice } from "@/lib/exam-scope";
import type { Topic } from "@/lib/types/dashboard";

/**
 * The learner's own mastery (GET /dashboard/topics). Shown separately from the topic catalog above it: it is
 * per-skill progress, not a list of what exists, and it is not exam-specific.
 */
export function MasteryPanel({
  mastery,
  isLoading,
  isError,
  onRetry,
  practicable,
  examLabel,
  scoped = false,
  limit = 6,
}: {
  mastery: Topic[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Skill names the practice catalog can serve. Only these link to Practice. */
  practicable: Set<string>;
  examLabel?: string | null;
  /** True when the mastery was fetched for the selected exam, so the notice can say so. */
  scoped?: boolean;
  limit?: number;
}) {
  const items = [...(mastery ?? [])].sort((a, b) => b.value - a.value).slice(0, limit);
  return (
    <GlassCard className="mt-6 p-5 max-[359px]:p-4" data-testid="mastery-panel">
      <p className="text-micro font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase">Your mastery</p>
      <p className="mt-1 text-[11px] text-muted-foreground/50">{scoped && examLabel ? examMasteryNotice(examLabel) : masteryNotice(examLabel)}</p>

      {isLoading && <div className="mt-4 h-16 rounded-2xl bg-white/[0.05] animate-pulse" aria-busy="true" data-testid="mastery-loading" />}

      {isError && !isLoading && (
        <div role="alert" data-testid="mastery-error" className="mt-4 text-center">
          <p className="text-[12px] font-semibold text-destructive">Couldn&apos;t load your mastery.</p>
          <Button onClick={onRetry} className="mt-3 px-5 py-2.5">
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <p role="status" data-testid="mastery-empty" className="mt-4 text-[12px] text-muted-foreground/60">
          No mastery recorded yet. Practise a skill to start building it.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((t) => {
            const canPractise = practicable.has(t.name);
            return (
              <li key={t.name} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/85">{t.name}</span>
                <span className="shrink-0 text-[12px] font-bold text-primary">{t.value}%</span>
                {canPractise ? (
                  <Link
                    href={`/learn/practice?skill=${encodeURIComponent(t.name)}`}
                    className="shrink-0 rounded-full border px-3 py-1 text-micro font-bold uppercase tracking-wider text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ borderColor: GLASS_BORDER }}
                    aria-label={`Practise ${t.name}`}
                  >
                    Practise
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
