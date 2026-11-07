"use client";
import Link from "next/link";
import { ChevronRight, Clock, Sparkles } from "lucide-react";
import { useWarmupOffer } from "@/hooks/queries/use-warmup";
import { CARD_CLASS, CardLabel, IconTile } from "@/components/adaptive/adaptive-card";
import { GLASS_BORDER } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** A short invitation for a learner the app does not know yet (or one who left the warm-up half way). Hidden for everyone else. */
export function WarmupCard() {
  const { data } = useWarmupOffer();
  if (data !== "start" && data !== "resume") return null;
  const resuming = data === "resume";
  return (
    <Link
      href="/learn/warmup"
      className={cn(
        CARD_CLASS,
        "group block outline-none transition-all hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]",
      )}
      style={{ borderColor: GLASS_BORDER }}
      data-testid="warmup-card"
    >
      <CardLabel
        action={
          <span className="inline-flex items-center gap-1 text-micro font-semibold text-muted-foreground/50">
            <Clock size={10} aria-hidden /> 2 min
          </span>
        }
      >
        {resuming ? "Pick up where you left off" : "Start here"}
      </CardLabel>
      <div className="mt-3.5 flex items-center gap-3.5">
        <IconTile>
          <Sparkles size={18} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
            {resuming ? "Finish your warm-up" : "Take a 2-minute warm-up"}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground/60">
            Six quick questions so we know where to start you. You can skip it.
          </p>
        </div>
        <ChevronRight
          size={16}
          aria-hidden
          className="shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
