"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useParams, useRouter } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useTechnique } from "@/hooks/queries/use-technique";
import { usePageMeta } from "@/hooks/use-page-meta";
import { QuickReferenceCard } from "@/components/technique/quick-reference-card";
import { DifficultyTabs } from "@/components/technique/difficulty-tabs";
import { GLASS_BG, GLASS_BORDER } from "@/lib/theme";
import { IS_MOCK } from "@/lib/platform";
import { ReferenceTechniquePage } from "@/components/technique/reference-technique";

/** Mock mode: the bundled lessons (lib/mock/techniques). */
function MockTechniquePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: technique, isLoading, error } = useTechnique(params.id);
  usePageMeta(technique ? `${technique.name} — Zuzumik` : "Technique — Zuzumik");

  const { headerRef } = useEntranceAnimations();

  if (isLoading) {
    return (
      <PageContainer className="pb-6 animate-pulse">
        <div className="h-10 w-32 rounded-xl mb-4" style={{ background: GLASS_BG }} />
        <div className="h-32 rounded-3xl mb-4" style={{ background: GLASS_BG }} />
        <div className="h-64 rounded-3xl" style={{ background: GLASS_BG }} />
      </PageContainer>
    );
  }

  if (error || !technique) {
    return (
    <PageContainer className="pb-6">
        <div
          className="flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
          style={{ background: GLASS_BG, border: `1px solid var(--red-12)` }}
        >
          <p className="text-[13px] font-semibold text-destructive">Technique not found</p>
          <button
            type="button"
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/learn/explorer"); }}
            className="rounded-xl bg-primary px-5 py-2.5 text-micro font-bold uppercase tracking-wider text-primary-foreground outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go Back
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pb-6">
      <div className="mx-auto w-full md:max-w-3xl">
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-2">
          <Lightbulb size={12} className="text-primary" />
          <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">TECHNIQUE</span>
        </div>

        <h1 className="text-[20px] font-bold tracking-[-0.02em] text-foreground leading-tight">
          {technique.name}
        </h1>

        {technique.topicPath.length > 0 && (
          <p className="text-[11px] text-muted-foreground/50 mt-1">
            {technique.topicPath.join(" › ")}
          </p>
        )}
      </div>

      {/* Quick Reference Card */}
      <div className="mt-6">
        <div
          className="inline-flex items-center rounded-full px-3 py-1 mb-3"
          style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}
        >
          <p className="text-micro font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
            Quick Reference
          </p>
        </div>
        <QuickReferenceCard card={technique.quickReference} />
      </div>

      {/* Difficulty Levels */}
      <div className="mt-5">
        <div
          className="inline-flex items-center rounded-full px-3 py-1 mb-3"
          style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
            Difficulty Levels
          </p>
        </div>
        <DifficultyTabs levels={technique.levels} techniqueName={technique.name} />
      </div>
      </div>
    </PageContainer>
  );
}

/** Real mode shows the backend's Reference Library page for the id; mock mode keeps the bundled lessons. */
export function ClientTechniquePage() {
  return IS_MOCK ? <MockTechniquePage /> : <ReferenceTechniquePage />;
}
