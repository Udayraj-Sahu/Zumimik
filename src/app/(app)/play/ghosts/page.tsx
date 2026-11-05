"use client";
import { useRouter } from "next/navigation";
import { Ghost as GhostIcon } from "lucide-react";
import { IS_MOCK } from "@/lib/platform";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useGhosts } from "@/hooks/queries/use-ghosts";
import { gatedFeatureMessage } from "@/services/flags";
import { raceHref } from "@/services/ghosts";

function GhostsContent() {
  usePageMeta("Ghost Races — Zuzumik");
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGhosts();

  if (isLoading) return <PageContainer><p role="status" className="py-10 text-center text-[13px] text-muted-foreground/60">Loading ghosts…</p></PageContainer>;
  if (error) {
    const msg = gatedFeatureMessage(error, "Ghost races") ?? (error instanceof Error ? error.message : "Couldn't load ghosts.");
    return (
      <PageContainer className="text-center">
        <p role="alert" className="py-10 text-[13px] text-muted-foreground/70">{msg}</p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </PageContainer>
    );
  }
  const ghosts = data ?? [];
  return (
    <PageContainer>
      <div className="mx-auto w-full space-y-4 md:max-w-xl">
        <div className="flex items-center gap-2">
          <GhostIcon size={18} aria-hidden />
          <h1 className="text-[18px] font-bold tracking-[-0.02em] text-foreground">Ghost races</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/60">Race a saved run from you, a friend or the public. Save your own from the sprint results screen.</p>
        {ghosts.length === 0 && <p role="status" className="py-6 text-center text-[13px] text-muted-foreground/60">No ghosts yet. Finish a sprint and save it as a ghost.</p>}
        <ul className="space-y-3">
          {ghosts.map((g) => {
            const href = raceHref(g);
            return (
              <li key={g.id}>
                <GlassCard className="flex items-center justify-between gap-3 p-4" data-testid="ghost-row">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-foreground">{g.owner} · {g.skill ?? "Mixed"}</p>
                    <p className="text-[12px] text-muted-foreground/60">{g.correct}/{g.problems} correct · {Math.round(g.totalTimeMs / 1000)}s{g.isPublic ? " · public" : ""}</p>
                  </div>
                  <Button size="sm" disabled={!href} onClick={() => href && router.push(href)} aria-label={`Race ${g.owner}`}>Race</Button>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      </div>
    </PageContainer>
  );
}

export default function GhostsPage() {
  if (IS_MOCK) return <FeatureUnavailable title="Ghost races" description="Ghost races need the live server, so they aren't shown in demo mode." />;
  return <GhostsContent />;
}
