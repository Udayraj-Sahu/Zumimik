"use client";

import { Crown, Heart, Sparkles, Users } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { AddChildForm } from "@/components/family/add-child-form";
import { SeatCard } from "@/components/family/seat-card";
import { AdaptiveCard, IconTile } from "@/components/adaptive/adaptive-card";
import { useFamily } from "@/hooks/queries/use-family";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { usePaywallStore } from "@/stores/paywall-store";
import { usePageMeta } from "@/hooks/use-page-meta";
import { cn } from "@/lib/utils";

export default function FamilyPage() {
  usePageMeta("Family — Zuzumik");
  const { data, isLoading, error, refetch } = useFamily();
  const openPaywall = usePaywallStore((s) => s.openPaywall);
  const { headerRef } = useEntranceAnimations();

  const seats = data?.seats ?? [];
  const paid = !!data && data.parentTier !== "free";
  const hasRoom = !!data && seats.length < data.maxSeats;
  const seatsLeft = data ? Math.max(0, data.maxSeats - seats.length) : 0;

  return (
    <PageContainer>
      <div className="mx-auto w-full space-y-5 md:max-w-4xl">
        <header ref={headerRef} className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 max-[359px]:px-3">
            <Users size={12} className="text-primary" aria-hidden />
            <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">FAMILY</span>
          </div>
          <h1 className="mt-3 text-[22px] font-bold leading-tight tracking-[-0.02em] text-foreground">Learning, together</h1>
          <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-muted-foreground/55">
            Seats for children aged 8 to 17, managed from your account.
          </p>
        </header>

        {isLoading && (
          <div className="space-y-4 animate-pulse" aria-busy="true" data-testid="family-loading">
            <div className="h-36 rounded-3xl bg-white/[0.05]" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-40 rounded-3xl bg-white/[0.05]" />
              <div className="h-40 rounded-3xl bg-white/[0.05]" />
            </div>
          </div>
        )}

        {error && !isLoading && (
          <AdaptiveCard className="border-destructive/30 bg-destructive/[0.04] text-center">
            <p role="alert" data-testid="family-error" className="text-[13px] font-semibold text-destructive">
              {error instanceof Error ? error.message : "Couldn't load your family."}
            </p>
            <Button onClick={() => void refetch()} className="mt-4 px-5 py-2.5">
              Retry
            </Button>
          </AdaptiveCard>
        )}

        {data && (
          <>
            <AdaptiveCard
              label="Seats"
              data-testid="family-summary"
              action={
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    paid ? "border-primary/30 bg-primary/10 text-primary" : "border-white/[0.1] text-muted-foreground/70",
                  )}
                >
                  {paid && <Crown size={10} aria-hidden />}
                  {paid ? "Family plan" : "Free plan"}
                </span>
              }
            >
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-[40px] font-black leading-none tracking-[-0.03em] text-foreground">
                  {seats.length}
                  <span className="ml-1.5 text-[14px] font-bold tracking-normal text-muted-foreground/55"> of {data.maxSeats} used</span>
                </p>
                <p className="pb-1 text-right text-[12px] text-muted-foreground/55">
                  {seatsLeft > 0 ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left` : "Every seat is in use"}
                </p>
              </div>
              <div
                role="progressbar"
                aria-label="Seats used"
                aria-valuemin={0}
                aria-valuemax={data.maxSeats}
                aria-valuenow={seats.length}
                className="mt-4 flex gap-1.5"
              >
                {Array.from({ length: data.maxSeats }, (_, i) => (
                  <span
                    key={i}
                    className={cn("h-2 flex-1 rounded-full transition-colors duration-500", i < seats.length ? "bg-primary" : "bg-white/[0.08]")}
                  />
                ))}
              </div>
            </AdaptiveCard>

            {seats.length === 0 && (
              <AdaptiveCard className="flex flex-col items-center py-8 text-center">
                <IconTile>
                  <Heart size={18} />
                </IconTile>
                <p role="status" data-testid="family-empty" className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground/70">
                  No children added yet. Each child gets their own account and learning history under your plan.
                </p>
              </AdaptiveCard>
            )}

            {seats.length > 0 && (
              <div className="grid items-start gap-4 md:grid-cols-2">
                {seats.map((seat) => (
                  <SeatCard key={seat.seatNumber} seat={seat} />
                ))}
              </div>
            )}

            {!paid && (
              <section
                data-testid="family-needs-plan"
                className="relative overflow-hidden rounded-3xl border border-primary/25 p-5 text-center"
                style={{ background: "linear-gradient(135deg, var(--accent-12), transparent 70%)" }}
              >
                <span aria-hidden className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Sparkles size={20} />
                </span>
                <p className="mt-3 text-[15px] font-bold text-foreground">Family seats need a paid subscription.</p>
                <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground/65">
                  Your account is on the free plan, so seats can&apos;t be created yet.
                </p>
                <Button onClick={() => openPaywall("prep")} className="mt-4 px-6 py-2.5">
                  See plans
                </Button>
              </section>
            )}

            {paid && hasRoom && <AddChildForm />}
            {paid && !hasRoom && (
              <p role="status" data-testid="family-full" className="rounded-2xl border border-white/[0.06] px-4 py-3 text-center text-[12px] text-muted-foreground/60">
                All {data.maxSeats} seats are in use. Remove a seat to add another child.
              </p>
            )}
          </>
        )}
      </div>
      <PaywallModal />
    </PageContainer>
  );
}
