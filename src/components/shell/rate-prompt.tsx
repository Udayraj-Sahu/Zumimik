"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRateStore } from "@/stores/rate-store";
import { Dialog } from "@/components/ui/dialog";

export function RatePrompt() {
  const { sprintCount, dismissed, neverShowAgain, dismiss, neverShow } = useRateStore();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const show = sprintCount >= 3 && !dismissed && !neverShowAgain;

  useEffect(() => {
    if (!show) return;
    if (overlayRef.current && dialogRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
      gsap.fromTo(dialogRef.current, { opacity: 0, scale: 0.95, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "power2.out" });
    }
  }, [show]);

  if (!show) return null;

  const handleRate = () => {
    if (rating === 0) return;
    if (rating >= 4) {
      window.open("https://play.google.com/store/apps/details?id=com.zuzumik.app", "_blank");
    }
    setSubmitted(true);
    neverShow();
  };

  const handleLater = () => {
    dismiss();
  };

  const handleNever = () => {
    neverShow();
  };

  if (submitted) return null;

  return (
    <Dialog
      open
      onClose={handleLater}
      placement="center"
      overlayRef={overlayRef}
      panelRef={dialogRef}
      overlayClassName="bg-black/50"
      className="max-w-sm p-6"
      ariaLabelledby="rate-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="rate-title" className="text-fluid-xl font-black tracking-tight text-foreground">
            Enjoying Zuzumik?
          </h3>
          <button
            type="button"
            onClick={handleLater}
            className="grid size-11 place-items-center rounded-lg text-muted-foreground/40 outline-none hover:text-muted-foreground active:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-fluid-sm text-muted-foreground/70 mb-5">
          Your rating helps other students discover the arena. Tap a star to rate:
        </p>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1.5 transition-transform hover:scale-110 active:scale-95"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                size={32}
                className={cn(
                  "transition-colors duration-150",
                  (hovered || rating) >= star ? "fill-chart-3 text-chart-3" : "text-muted",
                )}
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRate}
            disabled={rating === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-fluid-sm font-bold uppercase tracking-widest text-primary-foreground outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {rating >= 4 ? "Rate Us" : "Submit Rating"}
          </button>
          <div className="flex justify-between mt-1">
            <button
              type="button"
              onClick={handleLater}
              className="text-fluid-xs text-muted-foreground/40 outline-none hover:text-muted-foreground active:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded px-3 py-2 min-h-[44px]"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleNever}
              className="text-fluid-xs text-muted-foreground/40 outline-none hover:text-muted-foreground active:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded px-3 py-2 min-h-[44px]"
            >
              Don&apos;t Ask Again
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
