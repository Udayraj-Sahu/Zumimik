"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GLASS_BORDER } from "@/lib/theme";
import {
  useChildFriends,
  useRequestChildFriend,
  useRespondChildFriend,
  useRevokeChildFriend,
} from "@/hooks/queries/use-family";
import type { ChildFriendAction } from "@/lib/types/family";

const SMALL_BTN =
  "flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-micro font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap";

/** A child's friendships and the requests waiting on the parent: GET /family/friends/{child} and the approve/decline/block/revoke/request routes. */
export function ChildFriendsPanel({ childUserId, childName }: { childUserId: string; childName: string }) {
  const { data, isLoading, error, refetch } = useChildFriends(childUserId, true);
  const respond = useRespondChildFriend();
  const revoke = useRevokeChildFriend();
  const request = useRequestChildFriend();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const fail = (err: unknown) => setNote({ kind: "error", text: err instanceof Error ? err.message : "That didn't work." });
  const answer = (friendshipId: string, action: ChildFriendAction) => {
    setNote(null);
    respond.mutate({ friendshipId, action }, { onError: fail });
  };
  const sendRequest = () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setNote({ kind: "error", text: "Enter a valid email address." });
    setNote(null);
    request.mutate(
      { childUserId, email: value },
      {
        onSuccess: () => {
          setNote({ kind: "ok", text: "Request sent." });
          setEmail("");
        },
        onError: fail,
      },
    );
  };

  if (isLoading) return <div className="mt-3 h-16 animate-pulse rounded-2xl bg-white/[0.05]" aria-busy="true" data-testid="child-friends-loading" />;
  if (error || !data) {
    return (
      <div role="alert" data-testid="child-friends-error" className="mt-3 text-center">
        <p className="text-[12px] font-semibold text-destructive">{error instanceof Error ? error.message : "Couldn't load friends."}</p>
        <Button onClick={() => void refetch()} className="mt-2 px-4 py-2">
          Retry
        </Button>
      </div>
    );
  }

  const nothing = data.friends.length + data.awaitingYourApproval.length + data.awaitingOtherSide.length === 0;
  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-white/[0.06] pt-4" data-testid="child-friends-panel">
      {data.awaitingYourApproval.length > 0 && (
        <section aria-label={`Requests waiting for your approval for ${childName}`}>
          <p className="text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">Waiting for your approval</p>
          <ul className="mt-2 flex flex-col gap-2">
            {data.awaitingYourApproval.map((f) => (
              <li key={f.friendshipId} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.06] px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/85">{f.name}</span>
                <button type="button" aria-label={`Approve ${f.name} for ${childName}`} onClick={() => answer(f.friendshipId, "approve")} disabled={respond.isPending} className={`${SMALL_BTN} bg-primary text-primary-foreground`}>
                  <Check size={12} /> Approve
                </button>
                <button type="button" aria-label={`Decline ${f.name} for ${childName}`} onClick={() => answer(f.friendshipId, "decline")} disabled={respond.isPending} className={`${SMALL_BTN} text-muted-foreground`} style={{ border: `1px solid ${GLASS_BORDER}` }}>
                  <X size={12} /> Decline
                </button>
                <button type="button" aria-label={`Block ${f.name} for ${childName}`} onClick={() => answer(f.friendshipId, "block")} disabled={respond.isPending} className={`${SMALL_BTN} text-destructive`}>
                  Block
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.friends.length > 0 && (
        <section aria-label={`${childName}'s friends`}>
          <p className="text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">Friends</p>
          <ul className="mt-2 flex flex-col gap-2">
            {data.friends.map((f) => (
              <li key={f.friendshipId} className="flex items-center gap-2 rounded-2xl border border-white/[0.06] px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/85">{f.name}</span>
                {f.parentApproved === true && <span className="text-micro text-primary/80">Approved</span>}
                <button
                  type="button"
                  aria-label={confirmRevoke === f.friendshipId ? `Confirm remove ${f.name} from ${childName}` : `Remove ${f.name} from ${childName}`}
                  onClick={() => {
                    if (confirmRevoke !== f.friendshipId) return setConfirmRevoke(f.friendshipId);
                    revoke.mutate(f.friendshipId, { onSettled: () => setConfirmRevoke(null), onError: fail });
                  }}
                  disabled={revoke.isPending}
                  className={`${SMALL_BTN} text-muted-foreground hover:text-destructive`}
                >
                  {confirmRevoke === f.friendshipId ? "Confirm" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.awaitingOtherSide.length > 0 && (
        <section aria-label="Requests waiting on the other side">
          <p className="text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">Waiting for a reply</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {data.awaitingOtherSide.map((f) => (
              <li key={f.friendshipId} className="text-[12px] text-muted-foreground/70">
                {f.name === "Learner" ? "Pending request" : f.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {nothing && <p role="status" data-testid="child-friends-empty" className="text-[12px] text-muted-foreground/60">No friends or requests yet.</p>}

      <form
        noValidate
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          sendRequest();
        }}
      >
        <label className="flex-1 text-left text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
          Add a friend for {childName}
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-primary/40"
          />
        </label>
        <Button type="submit" size="sm" disabled={request.isPending || !email.trim()} className="min-h-11">
          {request.isPending ? "Sending…" : "Send request"}
        </Button>
      </form>
      {note && (
        <p role={note.kind === "error" ? "alert" : "status"} data-testid="child-friends-note" className={note.kind === "error" ? "text-[12px] text-destructive" : "text-[12px] text-primary"}>
          {note.text}
        </p>
      )}
    </div>
  );
}
