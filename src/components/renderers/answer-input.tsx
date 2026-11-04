"use client";

import { useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerInputProps {
  expectedAnswer: string;
  onCorrect: () => void;
  onWrong: () => void;
  disabled?: boolean;
}

function keyboardFor(expected: string): "decimal" | "text" {
  return /[a-zA-Z\s/]/.test(expected) ? "text" : "decimal";
}

export default function AnswerInput({
  expectedAnswer,
  onCorrect,
  onWrong,
  disabled,
}: AnswerInputProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    const normalized = value.trim().replace(/,/g, "");
    const expected = expectedAnswer.replace(/,/g, "");
    if (normalized === expected) {
      setStatus("correct");
      onCorrect();
    } else {
      setStatus("wrong");
      onWrong();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleRetry = () => {
    setStatus("idle");
    setValue("");
  };

  return (
    <div className="space-y-2">
      <label className="text-fluid-xs font-bold uppercase tracking-wider text-muted-foreground/50">
        Your Answer
      </label>
      {status === "correct" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
          <Check size={20} className="shrink-0 text-primary" />
          <span className="flex-1 text-fluid-base font-bold text-primary">
            {value} — Correct!
          </span>
        </div>
      ) : status === "wrong" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
            <X size={20} className="shrink-0 text-destructive" />
            <span className="flex-1 text-fluid-base font-bold text-destructive">
              {value} — Not quite
            </span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-xl border border-border/60 bg-card px-4 py-3 text-fluid-xs font-bold text-foreground outline-none transition-colors hover:bg-accent/40 active:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode={keyboardFor(expectedAnswer)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type your answer..."
            aria-label="Your answer"
            className={cn(
              "flex-1 rounded-2xl border border-border/60 bg-card px-5 py-4 text-fluid-base font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_1px_var(--primary)]",
              disabled && "opacity-40 cursor-not-allowed",
            )}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground outline-none transition-transform hover:scale-[1.03] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Submit answer"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
