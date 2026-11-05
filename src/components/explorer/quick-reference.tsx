"use client";

import { useState } from "react";
import { BookOpen, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { useReferenceCard, useReferencePages } from "@/hooks/queries/use-explorer";
import { isReadyPage, type ReferenceCard, type ReferencePageSummary } from "@/services/reference";

const humanise = (id: string) => id.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Reference Library on the Explorer: the quick-ref study cards (GET /api/subtopics/reference). Finished pages open a card;
 * the rest are listed as "Coming soon". Kept apart from the topic tree on purpose: its ids are not the practice :Skill names.
 */
export function QuickReference() {
  const { data: pages, isLoading, isError, refetch } = useReferencePages();
  const [openId, setOpenId] = useState<string | null>(null);

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
              <button
                type="button"
                onClick={() => setOpenId(p.subtopic_id)}
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
              </button>
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

      <ReferenceDialog subtopicId={openId} onClose={() => setOpenId(null)} />
    </GlassCard>
  );
}

function ReferenceDialog({ subtopicId, onClose }: { subtopicId: string | null; onClose: () => void }) {
  const { data: card, isLoading, isError, refetch } = useReferenceCard(subtopicId);
  return (
    <Dialog
      open={!!subtopicId}
      onClose={onClose}
      placement="center"
      className="max-h-[85dvh] max-w-[420px] overflow-y-auto border-[var(--glass-border)] bg-[var(--glass-02)]"
      ariaLabel="Quick reference"
    >
      <div className="p-5" data-testid="reference-card">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Quick reference</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick reference"
            className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-foreground active:scale-90"
          >
            <X size={15} />
          </button>
        </div>
        {isLoading && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/[0.05]" aria-busy="true" />}
        {isError && (
          <div role="alert" className="mt-4 text-center">
            <p className="text-[12px] font-semibold text-destructive">Couldn&apos;t load this page.</p>
            <Button onClick={() => void refetch()} className="mt-3 px-5 py-2.5">
              Retry
            </Button>
          </div>
        )}
        {card && <CardBody card={card} />}
      </div>
    </Dialog>
  );
}

function CardBody({ card }: { card: ReferenceCard }) {
  const q = card.quick_ref ?? {};
  const trick = q.the_trick;
  const levels = Object.entries(card.techniques_by_difficulty ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="mt-3 space-y-4">
      <div>
        <h3 className="text-[16px] font-bold leading-tight text-foreground">{card.name}</h3>
        {card.sutra_sanskrit && <p className="mt-1 text-[14px] text-primary">{card.sutra_sanskrit}</p>}
        {card.translation && <p className="mt-0.5 text-[12px] italic text-muted-foreground/70">{card.translation}</p>}
        {(trick?.difficulty_label || trick?.time_saved) && (
          <p className="mt-1 text-[11px] text-muted-foreground/50">{[trick?.difficulty_label, trick?.time_saved].filter(Boolean).join(" · ")}</p>
        )}
      </div>

      {trick?.mental_steps && trick.mental_steps.length > 0 && (
        <Section title="The trick">
          <ol className="space-y-1 text-[12px] text-foreground/80">
            {trick.mental_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {trick.formula_latex && trick.formula_latex.length > 0 && (
            <pre className="mt-2 overflow-x-auto rounded-xl bg-white/[0.04] p-2.5 font-mono text-[11px] text-muted-foreground">{trick.formula_latex.join("\n")}</pre>
          )}
        </Section>
      )}

      {q.when_to_use && (q.when_to_use.conditions?.length || q.when_to_use.range_rule) && (
        <Section title="When to use">
          <ul className="list-disc space-y-1 pl-4 text-[12px] text-foreground/80">
            {(q.when_to_use.conditions ?? []).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          {q.when_to_use.range_rule && <p className="mt-1 text-[11px] text-muted-foreground/60">{q.when_to_use.range_rule}</p>}
        </Section>
      )}

      {q.top_traps && q.top_traps.length > 0 && (
        <Section title="Top traps">
          <ul className="space-y-2">
            {q.top_traps.map((t, i) => (
              <li key={i} className="rounded-xl bg-white/[0.04] p-2.5 text-[12px]">
                <p className="font-semibold text-foreground">{t.name}</p>
                {t.description && <p className="text-muted-foreground/70">{t.description}</p>}
                {t.example && <p className="mt-1 text-muted-foreground/60">e.g. {t.example}</p>}
                {t.prevention && <p className="mt-1 text-primary/80">Fix: {t.prevention}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {q.quick_example?.problem && (
        <Section title="Worked example">
          <p className="font-mono text-[13px] text-foreground">
            {q.quick_example.problem}
            {q.quick_example.answer ? ` = ${q.quick_example.answer}` : ""}
          </p>
        </Section>
      )}

      {levels.length > 0 && (
        <Section title="Techniques by level">
          <ul className="space-y-1.5 text-[12px]">
            {levels.map(([level, items]) => (
              <li key={level} className="flex gap-2">
                <span className="w-7 shrink-0 font-mono font-bold text-primary">{level}</span>
                <span className="text-foreground/80">{(items ?? []).map((t) => t.name).filter(Boolean).join(", ")}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {card.attached_templates > 0 && (
        <p className="text-[11px] text-muted-foreground/50">{card.attached_templates} practice problems are linked to this page.</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">{title}</p>
      {children}
    </section>
  );
}
