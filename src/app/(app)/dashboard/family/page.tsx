"use client";

import { Users } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { AddChildForm } from "@/components/family/add-child-form";
import { SeatCard } from "@/components/family/seat-card";
import { useFamily } from "@/hooks/queries/use-family";
import { usePaywallStore } from "@/stores/paywall-store";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function FamilyPage() {
  usePageMeta("Family — Zuzumik");
  const { data, isLoading, error, refetch } = useFamily();
  const openPaywall = usePaywallStore((s) => s.openPaywall);

  const seats = data?.seats ?? [];
  const paid = !!data && data.parentTier !== "free";
  const hasRoom = !!data && seats.length < data.maxSeats;

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <Users size={12} className="text-primary" />
            <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">FAMILY</span>
          </div>
          <h1 className="text-[20px] font-bold tracking-[-0.02em] text-foreground leading-tight">Family</h1>
          <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Seats for children aged 8 to 17, managed from your account</p>
        </div>

        {isLoading && (
          <div className="mt-5 animate-pulse space-y-3" aria-busy="true" data-testid="family-loading">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-white/[0.05]" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <GlassCard className="mt-5 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center max-[359px]:p-4">
            <p role="alert" data-testid="family-error" className="text-[12px] font-semibold text-destructive">
              {error instanceof Error ? error.message : "Couldn't load your family."}
            </p>
            <Button onClick={() => void refetch()} className="mt-3 px-5 py-2.5">
              Retry
            </Button>
          </GlassCard>
        )}

        {data && (
          <div className="mt-5 flex flex-col gap-4">
            <GlassCard className="p-4 max-[359px]:p-3" data-testid="family-summary">
              <p className="text-micro font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase">Seats</p>
              <p className="mt-1 text-[22px] font-black text-foreground">
                {seats.length}
                <span className="text-[13px] font-bold text-muted-foreground/50"> of {data.maxSeats} used</span>
              </p>
            </GlassCard>

            {seats.length === 0 && (
              <GlassCard className="p-6 text-center">
                <p role="status" data-testid="family-empty" className="text-[13px] text-muted-foreground/70">
                  No children added yet. Each child gets their own account and learning history under your plan.
                </p>
              </GlassCard>
            )}

            {seats.map((seat) => (
              <SeatCard key={seat.seatNumber} seat={seat} />
            ))}

            {!paid && (
              <GlassCard className="p-5 text-center" data-testid="family-needs-plan">
                <p className="text-[13px] font-semibold text-foreground/85">Family seats need a paid subscription.</p>
                <p className="mt-1 text-[12px] text-muted-foreground/60">Your account is on the free plan, so seats can&apos;t be created yet.</p>
                <Button onClick={() => openPaywall("prep")} className="mt-3 px-5 py-2.5">
                  See plans
                </Button>
              </GlassCard>
            )}

            {paid && hasRoom && <AddChildForm />}
            {paid && !hasRoom && (
              <p role="status" data-testid="family-full" className="text-center text-[12px] text-muted-foreground/60">
                All {data.maxSeats} seats are in use. Remove a seat to add another child.
              </p>
            )}
          </div>
        )}
      </div>
      <PaywallModal />
    </PageContainer>
  );
}
