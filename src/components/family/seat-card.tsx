"use client";

import { useState } from "react";
import { ChevronDown, Pause, Play, Trash2, Users } from "lucide-react";
import { AdaptiveCard } from "@/components/adaptive/adaptive-card";
import { cn } from "@/lib/utils";
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

const CHIP = "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider";
const ACTION =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-micro font-bold outline-none transition-colors hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

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
    <AdaptiveCard data-testid={`seat-${seat.seatNumber}`} className={cn(!active && "opacity-90")}>
      <div className="flex items-center gap-3.5">
        <div
          aria-hidden
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl text-[14px] font-black ring-1",
            active ? "bg-gradient-to-br from-primary/30 to-primary/10 text-primary ring-primary/25" : "bg-white/[0.05] text-muted-foreground/60 ring-white/[0.08]",
          )}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground">{name}</p>
          <p className="truncate text-micro text-muted-foreground/55">
            {seat.age != null ? `Age ${seat.age}` : "Age unknown"}
            {seat.email && seat.displayName ? ` · ${seat.email}` : ""}
          </p>
        </div>
        <span className={cn(CHIP, "shrink-0", active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{active ? "Active" : seat.status}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {seat.kidsMode && <span className={cn(CHIP, "bg-white/[0.06] text-muted-foreground")}>Kids mode</span>}
        <span className={cn(CHIP, "bg-white/[0.06] text-muted-foreground")}>
          Seat {seat.seatNumber} · {seat.discountPct}% off
        </span>
      </div>

      {childId && (
        <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2 border-t border-white/[0.06] pt-4 sm:grid-cols-[auto_auto_1fr]">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStatus.mutate({ childUserId: childId, status: active ? "suspended" : "active" }, { onError: fail });
            }}
            disabled={setStatus.isPending}
            aria-label={active ? `Suspend ${name}` : `Resume ${name}`}
            className={cn(ACTION, "text-foreground/80")}
          >
            {active ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
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
            className={cn(ACTION, confirmRemove ? "border-destructive/40 bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-destructive")}
          >
            <Trash2 size={13} aria-hidden />
            {confirmRemove ? "Confirm remove" : "Remove seat"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`Friends of ${name}`}
            className={cn(ACTION, "col-span-2 text-primary sm:col-span-1 sm:justify-self-end")}
          >
            <Users size={13} aria-hidden /> Friends <ChevronDown size={12} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" data-testid="seat-error" className="mt-3 text-[12px] text-destructive">
          {error}
        </p>
      )}
      {open && childId && <ChildFriendsPanel childUserId={childId} childName={name} />}
    </AdaptiveCard>
  );
}
