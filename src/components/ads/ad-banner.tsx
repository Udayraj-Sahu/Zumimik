"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, X } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { usePaywallStore } from "@/stores/paywall-store";
import { useAdDecision, useAdImpression } from "@/hooks/queries/use-ads";
import { resolveAdCta, type AdPlacement, type AdShown } from "@/services/ads";

/** Opens an ad's call to action in this app: a route, or the plans paywall. No-op when the target is not something the app has. */
export function useAdCta() {
  const router = useRouter();
  const openPaywall = usePaywallStore((s) => s.openPaywall);
  return (ad: AdShown) => {
    const cta = resolveAdCta(ad.unit.cta_route);
    if (!cta) return;
    if (cta.kind === "paywall") openPaywall("prep");
    else router.push(cta.href);
  };
}

/**
 * A house-ad banner for dashboard_banner, profile_banner or settings_banner. Renders nothing unless the server says to show one
 * (see useAdDecision), so with `ad_engine` off, for children, paid tiers or inside the cooldown there is no trace of it.
 */
export function AdBanner({ placement, className }: { placement: Exclude<AdPlacement, "post_session_interstitial">; className?: string }) {
  const ad = useAdDecision(placement);
  const [dismissed, setDismissed] = useState(false);
  const open = useAdCta();
  useAdImpression(dismissed ? null : ad);

  if (!ad || dismissed) return null;
  const hasCta = resolveAdCta(ad.unit.cta_route) !== null;

  return (
    <div className={className}>
      <GlassCard data-testid="ad-banner" role="complementary" aria-label="Promotion from Zuzumik" className="relative p-4 pr-10">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-foreground active:scale-90"
        >
          <X size={14} />
        </button>
        <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">
          <Megaphone size={11} /> From Zuzumik
        </p>
        <p className="mt-1.5 text-[13px] font-bold leading-tight text-foreground">{ad.unit.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/70">{ad.unit.body}</p>
        {hasCta && (
          <button
            type="button"
            onClick={() => open(ad)}
            className={cn("mt-3 min-h-[40px] rounded-full bg-primary px-5 text-micro font-bold uppercase tracking-wider text-primary-foreground outline-none transition-transform active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring")}
          >
            {ad.unit.cta_label}
          </button>
        )}
      </GlassCard>
    </div>
  );
}
