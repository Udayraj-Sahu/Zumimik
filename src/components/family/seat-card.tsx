"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { GLASS_BG, GLASS_BORDER } from "@/lib/theme";
import { useRemoveSeat, useSetSeatStatus } from "@/hooks/queries/use-family";
import { ChildFriendsPanel } from "./child-friends-panel";
import type { FamilySeat } from "@/lib/types/family";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** One child seat: status, suspend/resume (POST /family/sub-account/override), remove (POST /family/sub-account/remove), friends. */
export function SeatCard({ seat }: { seat: FamilySeat }) {
  const setStatus = useSetSeatStatus();
  const remove = useRemoveSeat();
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = seat.displayName?.trim() || seat.email || `Seat ${seat.seatNumber}`;
  const active = seat.status === "active";
  const childId = seat.childUserId;
  const fail = (err: unknown) => setError(err instanceof Error ? err.message : "That didn't work.");

  return (
    <GlassCard className="p-4 max-[359px]:p-3" data-testid={`seat-${seat.seatNumber}`}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-[12px] font-black text-primary">{initials(name)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-foreground/85">{name}</p>
          <p className="truncate text-micro text-muted-foreground/50">
            {seat.age != null ? `Age ${seat.age}` : "Age unknown"}
            {seat.email && seat.displayName ? ` · ${seat.email}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{active ? "Active" : seat.status}</span>
            {seat.kidsMode && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kids mode</span>}
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seat {seat.seatNumber} · {seat.discountPct}% off</span>
          </div>
        </div>
      </div>

      {childId && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStatus.mutate({ childUserId: childId, status: active ? "suspended" : "active" }, { onError: fail });
            }}
            disabled={setStatus.isPending}
            aria-label={active ? `Suspend ${name}` : `Resume ${name}`}
            className="min-h-11 rounded-xl px-3 py-2 text-micro font-bold text-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}
          >
            {active ? "Suspend" : "Resume"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (!confirmRemove) return setConfirmRemove(true);
              remove.mutate(childId, { onSettled: () => setConfirmRemove(false), onError: fail });
            }}
            disabled={remove.isPending}
            aria-label={confirmRemove ? `Confirm remove ${name}` : `Remove ${name}`}
            className="min-h-11 rounded-xl px-3 py-2 text-micro font-bold text-muted-foreground outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
          >
            {confirmRemove ? "Confirm remove" : "Remove seat"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`Friends of ${name}`}
            className="ml-auto flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-micro font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Friends <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" data-testid="seat-error" className="mt-2 text-[12px] text-destructive">
          {error}
        </p>
      )}
      {open && childId && <ChildFriendsPanel childUserId={childId} childName={name} />}
    </GlassCard>
  );
}
