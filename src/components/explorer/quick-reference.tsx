"use client";

import Link from "next/link";
import { BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useReferencePages } from "@/hooks/queries/use-explorer";
import { isReadyPage, type ReferencePageSummary } from "@/services/reference";

const humanise = (id: string) => id.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Reference Library on the Explorer: the quick-ref study cards (GET /api/subtopics/reference). Finished pages open a card;
 * the rest are listed as "Coming soon". Kept apart from the topic tree on purpose: its ids are not the practice :Skill names.
 */
export function QuickReference() {
  const { data: pages, isLoading, isError, refetch } = useReferencePages();

  const ready = (pages ?? []).filter(isReadyPage);
  const soon = (pages ?? []).filter((p) => !isReadyPage(p));

  return (
    <GlassCard className="mt-6 p-5 max-[359px]:p-4" data-testid="quick-reference">
      <p className="text-micro font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase">Quick reference</p>
      <p className="mt-1 text-[11px] text-muted-foreground/50">Short study cards for each trick: the method, common traps and a worked example.</p>

      {isLoading && <div className="mt-4 h-16 animate-pulse rounded-2xl bg-white/[0.05]" aria-busy="true" data-testid="reference-loading" />}

      {isError && !isLoading && (
        <div role="alert" data-testid="reference-error" className="mt-4 text-center">
          <p className="text-[12px] font-semibold text-destructive">Couldn&apos;t load the quick reference.</p>
          <Button onClick={() => void refetch()} className="mt-3 px-5 py-2.5">
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && pages && pages.length === 0 && (
        <p role="status" data-testid="reference-empty" className="mt-4 text-[12px] text-muted-foreground/60">
          No reference pages yet.
        </p>
      )}

      {ready.length > 0 && (
        <ul className="mt-4 grid gap-2" data-testid="reference-ready">
          {ready.map((p) => (
            <li key={p.subtopic_id}>
              <Link
                href={`/learn/technique/${encodeURIComponent(p.subtopic_id)}`}
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BookOpen size={15} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">{humanise(p.subtopic_id)}</span>
                  <span className="block text-[11px] text-muted-foreground/50">
                    {p.topic}
                    {p.attached_templates > 0 ? ` · ${p.attached_templates} practice problems` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {soon.length > 0 && (
        <details className="mt-4" data-testid="reference-soon">
          <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground/60">Coming soon ({soon.length})</summary>
          <ul className="mt-2 grid gap-1.5">
            {soon.map((p: ReferencePageSummary) => (
              <li key={p.subtopic_id} className="flex items-center gap-2 text-[12px] text-muted-foreground/45">
                <Lock size={12} className="shrink-0" />
                <span className="truncate">{humanise(p.subtopic_id)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

    </GlassCard>
  );
}
