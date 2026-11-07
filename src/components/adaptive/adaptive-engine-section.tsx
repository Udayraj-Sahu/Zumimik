"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdaptiveCard, IconTile, ROW_CLASS } from "@/components/adaptive/adaptive-card";
import { Button } from "@/components/ui/button";
import { WarmupCard } from "@/components/adaptive/warmup-card";
import { LearnerProgressCard } from "@/components/adaptive/learner-progress-card";
import { NextStepCard } from "@/components/adaptive/next-step-card";
import { useLearnerView } from "@/hooks/queries/use-learner-view";
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
/**
 * `part` places the section on a page that has other content between its pieces: "top" is the warm-up invitation, "bottom" is the
 * personalised mix, the learning progress, the revision list and the recommended next step. The default renders everything together.
 */
export function AdaptiveEngineSection({ part = "all" }: { part?: "all" | "top" | "bottom" } = {}) {
  const router = useRouter();
  const [length, setLength] = useState<number>(10);
  const { data: review = [] } = useReviewItems();
  const { data: learnerView } = useLearnerView();
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
    <div className="mt-5 space-y-4 empty:hidden" data-testid="adaptive-engine-section">
      {part !== "bottom" && <WarmupCard />}
      {part !== "top" && (
        <>
      {/* Bottom of the tab, under Daily Budget and Your Topics: progress and revision, then the next step beside the mix. */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:[&>*:only-child]:col-span-2">
        <LearnerProgressCard />
        {review.length > 0 && (
          <AdaptiveCard
            label="Time to revisit"
            action={
              <span className="text-micro font-semibold text-muted-foreground/50">
                {review.length} {review.length === 1 ? "topic" : "topics"}
              </span>
            }
            data-testid="review-reminders"
          >
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/60">
              A short refresher keeps these fresh. Your personalised mix includes them too.
            </p>
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {review.map((item) => (
                <li key={item.skill} className={cn(ROW_CLASS, "flex items-center justify-between gap-3")}>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-foreground/85">
                      {readable(item.skill)}
                    </span>
                    <span className="mt-0.5 block text-micro text-muted-foreground/55">
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
          </AdaptiveCard>
        )}
      </div>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:[&>*:only-child]:col-span-2">
        <NextStepCard next={learnerView?.next} className="mt-0" />
        <AdaptiveCard label="Personalised mix">
          <div className="mt-3.5 flex items-start gap-3.5">
            <IconTile>
              <Sparkles size={18} />
            </IconTile>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold tracking-[-0.01em] text-foreground">A session made for you</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground/60">
                Built from what you know, what needs review and what is next.
              </p>
            </div>
          </div>
          <div
            role="radiogroup"
            aria-label="Mix length"
            className="mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1"
          >
            {MIX_LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={length === n}
                onClick={() => setLength(n)}
                className={cn(
                  "min-h-10 whitespace-nowrap rounded-xl px-1 text-[11.5px] font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                  length === n
                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--accent-30)]"
                    : "text-muted-foreground/65 hover:text-foreground",
                )}
              >
                {n} questions
              </button>
            ))}
          </div>
          <Button className="mt-3 gap-2" fullWidth size="lg" onClick={startMix}>
            Start mix <ArrowRight size={16} aria-hidden />
          </Button>
        </AdaptiveCard>
      </div>
        </>
      )}
    </div>
  );
}
