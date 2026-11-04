"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockVideoAdProps {
  src: string;
  poster?: string;
  alt?: string;
  className?: string;
  /** Unskippable playback before the skip control unlocks. */
  holdMs?: number;
  onSkip?: () => void;
  onHoldComplete?: () => void;
  skipLabel?: string;
  playLabel?: string;
}

export default function StockVideoAd({
  src,
  poster,
  alt = "",
  className,
  holdMs = 5000,
  onSkip,
  onHoldComplete,
  skipLabel = "Skip ad",
  playLabel = "Play ad",
}: StockVideoAdProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdRef = useRef(onHoldComplete);
  const reduceMotion = useReducedMotion();

  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [skippable, setSkippable] = useState(false);

  holdRef.current = onHoldComplete;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => setInView(entries[0]?.isIntersecting ?? false), {
      rootMargin: "120px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const attemptPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        setPlaying(true);
        setBlocked(false);
      }).catch(() => {
        setPlaying(false);
        setBlocked(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!inView || reduceMotion || document.hidden) return;
    attemptPlay();
  }, [inView, reduceMotion, attemptPlay]);

  useEffect(() => {
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) {
        v.pause();
        setPlaying(false);
      } else if (inView && !reduceMotion) {
        attemptPlay();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [inView, reduceMotion, attemptPlay]);

  useEffect(() => {
    if (!playing || skippable) return;
    const t = window.setTimeout(() => {
      setSkippable(true);
      holdRef.current?.();
    }, holdMs);
    return () => window.clearTimeout(t);
  }, [playing, skippable, holdMs]);

  const handleSkip = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
    onSkip?.();
  }, [onSkip]);

  const handleToggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      attemptPlay();
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [attemptPlay]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden bg-black/20", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        aria-label={alt || undefined}
        className="size-full object-cover"
        onPause={() => setPlaying(false)}
      />

      {(reduceMotion || blocked) && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={playLabel}
          className="absolute inset-0 grid place-items-center bg-black/30 transition-colors hover:bg-black/20"
        >
            <span className="grid size-9 place-items-center rounded-full bg-black/55 text-white dark:text-white">
            <Play size={15} className="ml-0.5" />
          </span>
        </button>
      )}

      {skippable && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white dark:text-white transition hover:bg-black/80"
        >
          <SkipForward size={11} />
          {skipLabel}
        </button>
      )}
    </div>
  );
}
