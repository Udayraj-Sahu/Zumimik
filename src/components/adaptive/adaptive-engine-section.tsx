"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { WarmupCard } from "@/components/adaptive/warmup-card";
import { LearnerProgressCard } from "@/components/adaptive/learner-progress-card";
import { useSprintStore } from "@/stores/sprint-store";
import { useResumeStore } from "@/stores/resume-store";
import { ADAPTIVE_MIX_TOPIC } from "@/services/practice";
import { useReviewItems } from "@/hooks/queries/use-review";
import type { ReviewItem } from "@/lib/learning/review";
const MIX_LENGTHS = [5, 10, 15] as const;
const REVIEW_LENGTH = 5;
const readable = (skill: string) =>
  skill.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
export function reviewReason(item: Pick<ReviewItem, "reason" | "daysIdle">): string {
  if (item.reason === "decay")
    return item.daysIdle > 0 ? `Not practised for ${item.daysIdle} days` : "Due for a refresher";
  return "Worth another go";
}
/**
 * Everything the adaptive engine adds lives here, in the Adaptive Learning tab: the cold-start warm-up (only for a learner the app
 * does not know yet, or one who left it half way) and the personalised mix (a session the engine composes from what the learner
 * knows, what needs review and what comes next). Real backend only: both need the learner's server-side history.
 */
export function AdaptiveEngineSection() {
  const router = useRouter();
  const [length, setLength] = useState<number>(10);
  const { data: review = [] } = useReviewItems();
  const startReview = (skill: string) => {
    useSprintStore.getState().reset();
    useResumeStore.getState().clearSnapshot();
    router.push(
      `/play/sprint?topic=${encodeURIComponent(skill)}&length=${REVIEW_LENGTH}&difficulty=adaptive`,
    );
  };
  const startMix = () => {
    useSprintStore.getState().reset();
    useResumeStore.getState().clearSnapshot();
    router.push(
      `/play/sprint?topic=${encodeURIComponent(ADAPTIVE_MIX_TOPIC)}&length=${length}&difficulty=adaptive`,
    );
  };
  return (
    <div className="mt-5 space-y-3" data-testid="adaptive-engine-section">
      <WarmupCard />
      <LearnerProgressCard />
      {review.length > 0 && (
        <GlassCard className="p-4" data-testid="review-reminders">
          <p className="text-[14px] font-semibold text-foreground">Time to revisit</p>
          <p className="text-[12px] text-muted-foreground/60">
            A short refresher keeps these fresh. Your personalised mix includes them too.
          </p>
          <ul className="mt-3 space-y-2">
            {review.map((item) => (
              <li key={item.skill} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-foreground">
                    {readable(item.skill)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground/60">
                    {reviewReason(item)}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => startReview(item.skill)}
                  aria-label={`Review ${readable(item.skill)}`}
                >
                  Review
                </Button>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
      <GlassCard className="p-4">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-foreground">Personalised mix</p>
            <p className="text-[12px] text-muted-foreground/60">
              Built from what you know, what needs review and what is next.
            </p>
            <div role="radiogroup" aria-label="Mix length" className="mt-3 flex gap-2">
              {MIX_LENGTHS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={length === n}
                  onClick={() => setLength(n)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    length === n
                      ? "border-primary text-primary"
                      : "border-border/60 text-muted-foreground/70",
                  )}
                >
                  {n} questions
                </button>
              ))}
            </div>
            <Button size="sm" className="mt-3" onClick={startMix}>
              Start mix <ArrowRight size={14} aria-hidden />
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
