"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitContentFeedback } from "@/services/content-pipeline";
import { toast } from "@/stores/toast-store";

interface ContentFeedbackProps {
  questionId: string;
  className?: string;
}

export default function ContentFeedback({ questionId, className }: ContentFeedbackProps) {
  const [submitted, setSubmitted] = useState<"up" | "down" | null>(null);

  const sendFeedback = useMutation({
    mutationFn: (feedbackType: "thumbs_up" | "thumbs_down") =>
      submitContentFeedback({ questionId, feedbackType }),
    onSuccess: (_data, feedbackType) => {
      setSubmitted(feedbackType === "thumbs_up" ? "up" : "down");
    },
    onError: () => {
      setSubmitted(null);
      toast.error("Couldn't save your feedback", "Check your connection and try again.");
    },
  });

  const handleFeedback = (feedbackType: "thumbs_up" | "thumbs_down") => {
    if (submitted || sendFeedback.isPending) return;
    setSubmitted(feedbackType === "thumbs_up" ? "up" : "down");
    sendFeedback.mutate(feedbackType);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <p className="text-fluid-xs font-bold uppercase tracking-wider text-muted-foreground/50 mr-1">
        Was this helpful?
      </p>
      <button
        type="button"
        onClick={() => handleFeedback("thumbs_up")}
        disabled={!!submitted}
        className={cn(
          "grid size-8 place-items-center rounded-lg border outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
          submitted === "up"
            ? "border-chart-3/30 bg-chart-3/10 text-chart-3"
            : "border-border/40 text-muted-foreground hover:border-chart-3/30 hover:text-chart-3 active:bg-chart-3/5",
        )}
        aria-label="Helpful"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => handleFeedback("thumbs_down")}
        disabled={!!submitted}
        className={cn(
          "grid size-8 place-items-center rounded-lg border outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
          submitted === "down"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-border/40 text-muted-foreground hover:border-destructive/30 hover:text-destructive active:bg-destructive/5",
        )}
        aria-label="Not helpful"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}
