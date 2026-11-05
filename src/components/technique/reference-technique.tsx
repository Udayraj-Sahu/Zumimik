"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Lightbulb, Lock } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useCorpusTopicNames, useReferenceCard } from "@/hooks/queries/use-explorer";
import { useSprintTopics } from "@/hooks/queries/use-sprint";
import { GLASS_BG, GLASS_BORDER } from "@/lib/theme";
import { findCorpusTopic, findPracticeSkill, isReadyPage, type ReferenceCard, type ReferenceTechnique } from "@/services/reference";
import { parseLevel } from "@/services/practice";

/**
 * The technique page in real mode: a Reference Library page (GET /api/subtopics/{id}/reference) laid out as Quick Reference +
 * Difficulty Levels. Only a finished page is shown; a draft says it is coming soon. Practice (the whole technique, or one
 * difficulty level) is offered only when the practice catalog serves a skill with the same name, because reference ids are not
 * linked to skills. A level starts the skill's session aimed at that difficulty (see levelToTheta).
 */
export function ReferenceTechniquePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: card, isLoading, isError, refetch } = useReferenceCard(params.id);
  const { headerRef } = useEntranceAnimations();
  usePageMeta(card ? `${card.name} — Zuzumik` : "Technique — Zuzumik");

  // Practice needs a skill the practice catalog serves; the only link from a reference page is its name (see findPracticeSkill).
  const catalog = useSprintTopics(undefined, !!card);
  const skill = card ? findPracticeSkill(card, catalog.data?.topics ?? []) : undefined;
  // No specific skill: fall back to practising the page's whole topic in the problem bank, when the corpus has a matching topic.
  const corpus = useCorpusTopicNames(!!card && !skill && catalog.isFetched);
  const bankTopic = card && !skill ? findCorpusTopic(card.topic, corpus.data ?? []) : undefined;

  if (isLoading) {
    return (
      <PageContainer className="pb-6 animate-pulse">
        <div className="mb-4 h-10 w-32 rounded-xl" style={{ background: GLASS_BG }} />
        <div className="mb-4 h-32 rounded-3xl" style={{ background: GLASS_BG }} />
        <div className="h-64 rounded-3xl" style={{ background: GLASS_BG }} />
      </PageContainer>
    );
  }

  if (isError || !card) {
    return (
      <PageContainer className="pb-6">
        <div role="alert" data-testid="technique-error" className="flex flex-col items-center gap-4 rounded-3xl p-8 text-center" style={{ background: GLASS_BG, border: "1px solid var(--red-12)" }}>
          <p className="text-[13px] font-semibold text-destructive">Technique not found</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void refetch()} className="rounded-xl border border-white/[0.1] px-5 py-2.5 text-micro font-bold uppercase tracking-wider text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Retry
            </button>
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/learn/explorer"))}
              className="rounded-xl bg-primary px-5 py-2.5 text-micro font-bold uppercase tracking-wider text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go Back
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!isReadyPage(card)) {
    return (
      <PageContainer className="pb-6">
        <div className="mx-auto w-full md:max-w-3xl">
          <div ref={headerRef} className="text-center">
            <div className="pill mb-2 inline-flex items-center gap-2 px-4 py-1.5">
              <Lock size={12} className="text-primary" />
              <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">TECHNIQUE</span>
            </div>
            <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-foreground">{card.name}</h1>
          </div>
          <p role="status" data-testid="technique-soon" className="mt-8 text-center text-[13px] text-muted-foreground/60">
            This study card isn&apos;t ready yet. It will appear here once it has been reviewed.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pb-6">
      <div className="mx-auto w-full md:max-w-3xl">
        <div ref={headerRef} className="text-center">
          <div className="pill mb-2 inline-flex items-center gap-2 px-4 py-1.5">
            <Lightbulb size={12} className="text-primary" />
            <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">TECHNIQUE</span>
          </div>
          <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-foreground">{card.name}</h1>
          {card.sutra_sanskrit && <p className="mt-1 text-[14px] text-primary">{card.sutra_sanskrit}</p>}
          {card.translation && <p className="mt-0.5 text-[12px] italic text-muted-foreground/70">{card.translation}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground/50">{[card.topic, card.category].filter(Boolean).join(" › ")}</p>
        </div>

        <SectionPill>Quick Reference</SectionPill>
        <QuickReference card={card} />

        <SectionPill>Difficulty Levels</SectionPill>
        <Levels card={card} skillId={skill?.id} />

        {!skill && bankTopic && (
          <Link
            href={`/learn/practice?bankTopic=${encodeURIComponent(bankTopic)}`}
            data-testid="technique-practice-topic"
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-[13px] font-bold uppercase tracking-wider text-primary-foreground outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
          >
            Practise {bankTopic} <ArrowRight size={16} />
          </Link>
        )}
        {skill && (
          <Link
            href={`/learn/practice?skill=${encodeURIComponent(skill.id)}&start=1`}
            data-testid="technique-practice"
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-[13px] font-bold uppercase tracking-wider text-primary-foreground outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
          >
            Practise {skill.label} <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </PageContainer>
  );
}

function SectionPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 inline-flex items-center rounded-full px-3 py-1" style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">{children}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <p className="mb-2 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">{title}</p>
      {children}
    </div>
  );
}

function QuickReference({ card }: { card: ReferenceCard }) {
  const q = card.quick_ref ?? {};
  const trick = q.the_trick;
  const meta = [trick?.difficulty_label, trick?.time_saved].filter(Boolean).join(" · ");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="technique-quick-reference">
      {trick?.mental_steps && trick.mental_steps.length > 0 && (
        <Panel title="The trick">
          {meta && <p className="mb-1.5 text-[11px] text-muted-foreground/60">{meta}</p>}
          <ol className="space-y-1 text-[12px] text-foreground/80">
            {trick.mental_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {trick.formula_latex && trick.formula_latex.length > 0 && (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-white/[0.04] p-2.5 font-mono text-[11px] text-muted-foreground">{trick.formula_latex.join("\n")}</pre>
          )}
        </Panel>
      )}
      {q.when_to_use && (q.when_to_use.conditions?.length || q.when_to_use.range_rule) && (
        <Panel title="When to use">
          <ul className="list-disc space-y-1 pl-4 text-[12px] text-foreground/80">
            {(q.when_to_use.conditions ?? []).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          {q.when_to_use.range_rule && <p className="mt-1.5 text-[11px] text-muted-foreground/60">{q.when_to_use.range_rule}</p>}
        </Panel>
      )}
      {q.top_traps && q.top_traps.length > 0 && (
        <Panel title="Top traps">
          <ul className="space-y-2">
            {q.top_traps.map((t, i) => (
              <li key={i} className="text-[12px]">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <AlertTriangle size={12} className="shrink-0 text-destructive" /> {t.name}
                </p>
                {t.description && <p className="text-muted-foreground/70">{t.description}</p>}
                {t.prevention && <p className="mt-0.5 text-primary/80">Fix: {t.prevention}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {q.quick_example?.problem && (
        <Panel title="Worked example">
          <p className="font-mono text-[13px] text-foreground">
            {q.quick_example.problem}
            {q.quick_example.answer ? ` = ${q.quick_example.answer}` : ""}
          </p>
        </Panel>
      )}
    </div>
  );
}

function Levels({ card, skillId }: { card: ReferenceCard; skillId?: string }) {
  const levels = Object.entries(card.techniques_by_difficulty ?? {})
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const [active, setActive] = useState(levels[0]?.[0] ?? "");
  if (levels.length === 0) {
    return (
      <p role="status" className="text-[12px] text-muted-foreground/60">
        No difficulty levels are listed for this page yet.
      </p>
    );
  }
  const current: ReferenceTechnique[] = card.techniques_by_difficulty[active] ?? [];
  const problems = card.attached_by_level?.[active];
  const activeLevel = parseLevel(active);
  return (
    <div data-testid="technique-levels">
      <div role="tablist" aria-label="Difficulty level" className="flex gap-2 overflow-x-auto pb-1">
        {levels.map(([level]) => (
          <button
            key={level}
            type="button"
            role="tab"
            aria-selected={active === level}
            onClick={() => setActive(level)}
            className={cn(
              "min-h-[36px] shrink-0 rounded-full px-4 text-micro font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
              active === level ? "bg-primary text-primary-foreground" : "border border-white/[0.08] text-muted-foreground hover:text-foreground",
            )}
          >
            {level}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-2" role="tabpanel">
        {current.map((t, i) => (
          <li key={t.name ?? i} className="rounded-xl border border-border/40 bg-card p-4">
            <p className="text-[13px] font-semibold text-foreground">{t.name}</p>
            {t.focus && <p className="text-[12px] text-muted-foreground/70">{t.focus}</p>}
            {t.example?.problem && (
              <p className="mt-1.5 font-mono text-[12px] text-foreground/80">
                {t.example.problem}
                {t.example.answer ? ` = ${t.example.answer}` : ""}
              </p>
            )}
            {typeof t.template_count === "number" && <p className="mt-1 text-[11px] text-muted-foreground/50">{t.template_count} templates</p>}
          </li>
        ))}
      </ul>
      {typeof problems === "number" && <p className="mt-2 text-[11px] text-muted-foreground/50">{problems} practice problems are linked to this level.</p>}
      {skillId && activeLevel && (
        <Link
          href={`/learn/practice?skill=${encodeURIComponent(skillId)}&level=${activeLevel}`}
          data-testid="technique-practice-level"
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-primary/40 px-5 text-[12px] font-bold uppercase tracking-wider text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Practise level {activeLevel} <ArrowRight size={14} />
        </Link>
      )}
      {!skillId && (
        <p className="mt-2 text-[11px] text-muted-foreground/50" data-testid="technique-level-note">
          Practice by level needs a practice skill linked to this page, and none is yet.
        </p>
      )}
    </div>
  );
}
