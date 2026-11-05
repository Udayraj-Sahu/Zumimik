"use client";
import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BreakKind = "micro" | "forced" | "block" | "hard_stop";

const COPY: Record<BreakKind, { title: string; body: string; done: string }> = {
  micro: { title: "Quick breather", body: "Take a moment. The next questions will be a little gentler.", done: "Back to it" },
  forced: { title: "Let's take five", body: "A short rest helps. When you are back we will go over a few things you have already seen.", done: "I'm ready" },
  block: { title: "Time for a break", body: "You have worked for a full study block. Stretch, drink some water, then carry on.", done: "I'm ready" },
  hard_stop: { title: "That's a full day of practice", body: "Great work today. Rest now; your progress is saved.", done: "Finish session" },
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * A pause the learning engine asked for. It never blames the learner and never uses the engine's own terms. It is finite: a micro
 * break can be skipped at any time, the others end when the countdown does, and a day-limit stop offers only to finish.
 */
export function BreakOverlay({ kind, seconds, onDone }: { kind: BreakKind; seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(Math.max(0, Math.round(seconds)));
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [left]);
  const copy = COPY[kind];
  const canContinue = kind === "micro" || kind === "hard_stop" || left <= 0;
  return (
    <div role="dialog" aria-modal="true" aria-label={copy.title} data-testid="break-overlay" className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-4 text-center">
        <Coffee size={28} className="mx-auto text-primary" aria-hidden />
        <h2 className="text-[18px] font-bold text-foreground">{copy.title}</h2>
        <p className="text-[13px] text-muted-foreground/70">{copy.body}</p>
        {kind !== "hard_stop" && <p role="timer" className="font-mono text-[28px] font-bold text-foreground" data-testid="break-timer">{fmt(left)}</p>}
        <Button fullWidth onClick={onDone} disabled={!canContinue}>{copy.done}</Button>
      </div>
    </div>
  );
}
