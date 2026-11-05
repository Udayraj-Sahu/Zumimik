"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useWarmupOffer } from "@/hooks/queries/use-warmup";

/** A short invitation for a learner the app does not know yet (or one who left the warm-up half way). Hidden for everyone else. */
export function WarmupCard() {
  const { data } = useWarmupOffer();
  if (data !== "start" && data !== "resume") return null;
  return (
    <Link href="/learn/warmup" className="block" data-testid="warmup-card">
      <GlassCard className="flex items-center gap-3 p-4">
        <Sparkles size={20} className="shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground">{data === "resume" ? "Finish your warm-up" : "Take a 2-minute warm-up"}</p>
          <p className="text-[12px] text-muted-foreground/60">Six quick questions so we know where to start you. You can skip it.</p>
        </div>
      </GlassCard>
    </Link>
  );
}
