"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useAdDecision, useAdImpression } from "@/hooks/queries/use-ads";
import { resolveAdCta } from "@/services/ads";
import { useAdCta } from "@/components/ads/ad-banner";

/**
 * The post-session ad (placement post_session_interstitial). It appears after a session ends, for exactly the duration the server
 * allows (5 s, or 30 s after a long practice stretch), and can be closed only when that time is up; the impression is counted at
 * the same moment. It is never mounted on a practice, mock-exam, duel or onboarding screen: the server refuses those anyway.
 */
export function AdInterstitial() {
  const ad = useAdDecision("post_session_interstitial");
  const [left, setLeft] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);
  const open = useAdCta();
  useAdImpression(closed ? null : ad);

  const token = ad?.token;
  const seconds = ad?.duration_seconds;
  useEffect(() => {
    if (!token || !seconds) return;
    setLeft(seconds);
    const id = setInterval(() => setLeft((s) => (s === null || s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [token, seconds]);

  if (!ad || closed) return null;
  const done = left === 0;
  const hasCta = resolveAdCta(ad.unit.cta_route) !== null;

  return (
    <Dialog
      open
      onClose={() => {
        if (done) setClosed(true);
      }}
      placement="center"
      className="max-w-[360px] border-[var(--glass-border)] bg-[var(--glass-02)]"
      ariaLabel="Promotion from Zuzumik"
    >
      <div className="p-5 text-center" data-testid="ad-interstitial">
        <p className="flex items-center justify-center gap-1.5 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">
          <Megaphone size={11} /> From Zuzumik
        </p>
        <p className="mt-3 text-[16px] font-bold leading-tight text-foreground">{ad.unit.title}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/70">{ad.unit.body}</p>
        {hasCta && (
          <button
            type="button"
            onClick={() => {
              setClosed(true);
              open(ad);
            }}
            className="mt-4 min-h-[44px] w-full rounded-full bg-primary px-5 text-micro font-bold uppercase tracking-wider text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ad.unit.cta_label}
          </button>
        )}
        <button
          type="button"
          onClick={() => setClosed(true)}
          disabled={!done}
          data-testid="ad-interstitial-close"
          className="mt-2 min-h-[44px] w-full rounded-full border border-white/[0.1] px-5 text-micro font-bold uppercase tracking-wider text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {done ? "Continue" : `Continue in ${left ?? ad.duration_seconds}s`}
        </button>
      </div>
    </Dialog>
  );
}
