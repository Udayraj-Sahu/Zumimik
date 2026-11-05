"use client";

import { Crown, Users, X } from "lucide-react";
import { ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useClub, useClubLeaderboard, useJoinClub, useLeaveClub } from "@/hooks/queries/use-clubs";

const TYPE_LABEL: Record<string, string> = { city: "City", society: "Society", school: "School", college: "College", cafe: "Café" };

/**
 * One club: GET /clubs/{id} (name, type, city, member count, your role) and, for members only, its weekly leaderboard
 * GET /clubs/{id}/leaderboard (XP over the last 7 days). The server refuses the leaderboard to non-members (403), so it is not
 * requested until the detail says you are in; Join / Leave work from here too.
 */
export function ClubDetailDialog({ hubId, onClose }: { hubId: string | null; onClose: () => void }) {
  const me = useAuthStore((s) => s.user?.id);
  const club = useClub(hubId);
  const isMember = !!club.data?.your_role;
  const board = useClubLeaderboard(hubId, isMember);
  const join = useJoinClub();
  const leave = useLeaveClub();
  const busy = join.isPending || leave.isPending;
  const actionError = (join.error ?? leave.error) as unknown;

  const toggle = () => {
    if (!hubId || busy) return;
    (isMember ? leave : join).mutate(hubId);
  };

  const rows = board.data?.leaderboard ?? [];
  const days = board.data?.window_days ?? 7;

  return (
    <Dialog
      open={!!hubId}
      onClose={onClose}
      placement="center"
      className="max-h-[85dvh] max-w-[400px] overflow-y-auto border-[var(--glass-border)] bg-[var(--glass-02)]"
      ariaLabel="Club details"
    >
      <div className="p-5" data-testid="club-detail">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Club</span>
          <button type="button" onClick={onClose} aria-label="Close club" className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-foreground active:scale-90">
            <X size={15} />
          </button>
        </div>

        {club.isLoading && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/[0.05]" aria-busy="true" />}

        {club.isError && !club.isLoading && (
          <div role="alert" data-testid="club-detail-error" className="mt-4 text-center">
            <p className="text-[12px] font-semibold text-destructive">
              {club.error instanceof ApiError && club.error.status === 404 ? "This club no longer exists." : "Couldn't load this club."}
            </p>
            <Button onClick={() => void club.refetch()} className="mt-3 px-5 py-2.5">
              Retry
            </Button>
          </div>
        )}

        {club.data && (
          <>
            <h3 className="mt-3 text-[16px] font-bold leading-tight text-foreground">{club.data.name}</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground/60">
              {TYPE_LABEL[club.data.hub_type] ?? club.data.hub_type}
              {club.data.city ? ` · ${club.data.city}` : ""}
              {club.data.your_role === "owner" ? " · You own this club" : club.data.your_role === "officer" ? " · You are an officer" : club.data.your_role ? " · You are a member" : ""}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground/70">
              <Users size={12} /> {club.data.members} {club.data.members === 1 ? "member" : "members"}
              {!club.data.is_active && <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider">Archived</span>}
            </p>

            <Button onClick={toggle} disabled={busy} size="sm" className="mt-4 min-h-[44px] w-full" aria-label={`${isMember ? "Leave" : "Join"} this club`}>
              {busy ? "…" : isMember ? "Leave club" : "Join club"}
            </Button>
            {actionError ? (
              <p role="alert" data-testid="club-detail-action-error" className="mt-2 text-center text-[12px] text-destructive">
                {actionError instanceof Error ? actionError.message : "That didn't work. Please try again."}
              </p>
            ) : null}

            <p className="mt-5 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">Weekly leaderboard</p>
            {!isMember ? (
              <p role="status" data-testid="club-leaderboard-locked" className="mt-2 text-[12px] text-muted-foreground/60">
                Join this club to see its leaderboard.
              </p>
            ) : board.isLoading ? (
              <div className="mt-2 h-16 animate-pulse rounded-2xl bg-white/[0.05]" aria-busy="true" />
            ) : board.isError ? (
              <div role="alert" data-testid="club-leaderboard-error" className="mt-2 text-center">
                <p className="text-[12px] text-destructive">Couldn&apos;t load the leaderboard.</p>
                <Button onClick={() => void board.refetch()} className="mt-2 px-5 py-2.5">
                  Retry
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <p role="status" data-testid="club-leaderboard-empty" className="mt-2 text-[12px] text-muted-foreground/60">
                No one has earned XP here in the last {days} days.
              </p>
            ) : (
              <ol className="mt-2 space-y-1.5" data-testid="club-leaderboard">
                {rows.map((r) => {
                  const you = !!me && r.user_id === me;
                  return (
                    <li key={`${r.rank}-${r.user_id ?? r.display_name}`} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-[12px]", you ? "bg-primary/10" : "bg-white/[0.04]")}>
                      <span className="w-6 shrink-0 text-center font-mono font-bold text-muted-foreground">{r.rank === 1 ? <Crown size={13} className="mx-auto text-chart-4" aria-label="1" /> : r.rank}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                        {r.display_name}
                        {you ? " (you)" : ""}
                      </span>
                      <span className="shrink-0 font-mono text-primary">{r.weekly_xp} XP</span>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-2 text-[10.5px] text-muted-foreground/40">XP earned in the last {days} days. Only members can see this.</p>
          </>
        )}
      </div>
    </Dialog>
  );
}
