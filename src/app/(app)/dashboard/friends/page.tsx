"use client";
import { useState, useRef, useEffect } from "react";
import { Users, UserPlus, Swords, Zap, Award, Check, X, Camera, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import {
  useFriends,
  useRespondToFriendRequest,
  useSendFriendRequest,
  useRemoveFriend,
  useRedeemFriendQr,
} from "@/hooks/queries/use-friends";
import { toast } from "@/stores/toast-store";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FriendQrScanner } from "@/components/friends/friend-qr-scanner";
import { GLASS_06, GLASS_BG, GLASS_BORDER } from "@/lib/theme";
const TABS = [
  { id: "friends", label: "Friends" },
  { id: "requests", label: "Requests" },
  { id: "activity", label: "Activity" },
] as const;
const sinceLabel = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};
export default function FriendsPage() {
  usePageMeta("Friends — Zuzumik");
  const { data, isLoading, error } = useFriends();
  const respond = useRespondToFriendRequest();
  const sendRequest = useSendFriendRequest();
  const remove = useRemoveFriend();
  const redeemQr = useRedeemFriendQr();
  const [qrCode, setQrCode] = useState("");
  const [qrMessage, setQrMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const submitQr = (scanned: string = qrCode) => {
    setQrMessage(null);
    redeemQr.mutate(scanned, {
      onSuccess: () => {
        setQrMessage({ kind: "ok", text: "You're now friends." });
        setQrCode("");
      },
      onError: (err) =>
        setQrMessage({
          kind: "error",
          text: err instanceof Error ? err.message : "Couldn't use that code.",
        }),
    });
  };
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addMessage, setAddMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const submitAdd = () => {
    const email = addEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAddMessage({ kind: "error", text: "Enter a valid email address." });
      return;
    }
    setAddMessage(null);
    sendRequest.mutate(email, {
      // The backend answers identically whoever the account is, so this only says the request was sent, not that it was seen.
      onSuccess: () => {
        setAddMessage({ kind: "ok", text: "Friend request sent." });
        setAddEmail("");
      },
      onError: (err) =>
        setAddMessage({
          kind: "error",
          text: err instanceof Error ? err.message : "Couldn't send the request.",
        }),
    });
  };
  const confirmAndRemove = (friendshipId: string | undefined) => {
    if (!friendshipId) return;
    if (confirmRemove !== friendshipId) {
      setConfirmRemove(friendshipId);
      return;
    }
    remove.mutate(friendshipId, {
      onSettled: () => setConfirmRemove(null),
      onError: (err) =>
        toast.error("Couldn't remove this friend", err instanceof Error ? err.message : undefined),
    });
  };
  const answer = (friendshipId: string | undefined, name: string, action: "accept" | "decline") => {
    if (!friendshipId) return;
    respond.mutate(
      { friendshipId, action },
      {
        onError: (err) =>
          toast.error(
            action === "accept" ? "Couldn't accept the request" : "Couldn't decline the request",
            err instanceof Error ? err.message : name,
          ),
      },
    );
  };
  const [tab, setTab] = useState<"friends" | "activity" | "requests">("friends");
  const listRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();
  useEffect(() => {
    if (listRef.current && data) {
      const items = listRef.current.querySelectorAll<HTMLElement>("[data-friend-item]");
      staggerIn(
        items,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" },
      );
    }
  }, [data, tab, staggerIn]);
  const requestCount = data?.requests.length ?? 0;
  const sentCount = data?.sent.length ?? 0;
  const openAdd = () => {
    setAddOpen(true);
    setAddMessage(null);
    setQrMessage(null);
  };
  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
        <div ref={headerRef} className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <Users size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">FRIENDS</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal">
            Compete and stay motivated together
          </p>
        </div>

        <div
          ref={animateSection}
          data-section-index="0"
          className="mt-5 flex items-center gap-2 max-[359px]:gap-1.5"
        >
          <div
            role="tablist"
            aria-label="Friends sections"
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto max-[359px]:gap-1.5"
          >
            {TABS.filter((t) => t.id !== "activity").map((t) => {
              const count =
                t.id === "friends"
                  ? data?.friends.length
                  : t.id === "requests"
                    ? requestCount + sentCount
                    : undefined;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "min-h-[44px] whitespace-nowrap rounded-full px-4 text-[11px] font-bold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring max-[359px]:px-3",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border text-muted-foreground hover:text-foreground",
                  )}
                  style={active ? undefined : { background: GLASS_BG, borderColor: GLASS_06 }}
                >
                  {t.label}
                  {!!count && (
                    <span
                      className={cn("ml-1.5 tabular-nums", active ? "opacity-80" : "text-primary")}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            size="md"
            onClick={openAdd}
            className="hidden shrink-0 md:inline-flex"
            data-testid="add-friend"
          >
            <UserPlus size={15} aria-hidden /> Add friend
          </Button>
        </div>

        <div ref={animateSection} data-section-index="1" className="mt-4">
          {isLoading && (
            <div className="animate-pulse space-y-3 max-[359px]:space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-3xl" style={{ background: GLASS_BG }} />
              ))}
            </div>
          )}

          {error && (
            <GlassCard className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center max-[359px]:p-4">
              <p className="text-[12px] font-semibold text-destructive">Failed to load friends</p>
            </GlassCard>
          )}

          <div ref={listRef} className="flex flex-col gap-3 max-[359px]:gap-1.5">
            {tab === "friends" && (!data || data.friends.length === 0) && (
              <EmptyState
                icon={Users}
                title="Add your first friend"
                description="Friends show up here. Add one by email or with a QR code, and they appear once they accept."
                action={{ label: "Add a friend", onClick: openAdd }}
                data-testid="friends-empty"
              />
            )}
            {tab === "friends" && !!data?.friends.length && (
              <p
                id="friend-duel-note"
                data-testid="friend-duel-note"
                className="px-1 text-[11px] text-muted-foreground/60"
              >
                Challenging a friend isn&apos;t available yet. To play now,{" "}
                <Link
                  href="/play/duel"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  find a match against another player
                </Link>
                .
              </p>
            )}
            {tab === "friends" &&
              data?.friends.map((f) => (
                <GlassCard
                  key={f.id}
                  data-friend-item
                  className="flex items-center gap-3 p-3 sm:p-4 max-[359px]:gap-2"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-[12px] font-black text-primary">
                    {f.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 max-[359px]:gap-1.5">
                      <p className="text-[12px] font-bold text-foreground/80 truncate">{f.name}</p>
                      {f.level && (
                        <span className="rounded-xl bg-white/[0.06] px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-muted-foreground">
                          {f.level}
                        </span>
                      )}
                    </div>
                    {sinceLabel(f.since) && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Friends since {sinceLabel(f.since)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5 text-micro text-muted-foreground/40 max-[359px]:gap-2">
                      {f.xp !== undefined && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Zap size={10} /> {f.xp.toLocaleString()} XP
                        </span>
                      )}
                      {f.streak !== undefined && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          Streak: {f.streak}d
                        </span>
                      )}
                      {f.lastActive && <span className="whitespace-nowrap">{f.lastActive}</span>}
                    </div>
                  </div>
                  {/* Challenging a friend needs a server-side invitation (create, accept, start) that does not exist yet: the duel service
                only pairs strangers from its queue. So this is shown as unavailable rather than as a button that does nothing. */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-describedby="friend-duel-note"
                    data-testid="friend-duel"
                    className="flex min-h-11 cursor-not-allowed items-center gap-1 rounded-xl px-3 py-2 text-micro font-bold text-muted-foreground/40 outline-none whitespace-nowrap"
                    style={{ background: GLASS_BG }}
                  >
                    <Swords size={12} /> Duel
                  </button>
                  {f.friendshipId && (
                    <button
                      type="button"
                      onClick={() => confirmAndRemove(f.friendshipId)}
                      disabled={remove.isPending}
                      aria-label={
                        confirmRemove === f.friendshipId
                          ? `Confirm remove ${f.name}`
                          : `Remove ${f.name}`
                      }
                      className="flex min-h-11 items-center rounded-xl px-3 py-2 text-micro font-bold text-muted-foreground outline-none transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap"
                      style={{ background: GLASS_BG }}
                    >
                      {confirmRemove === f.friendshipId ? "Confirm" : "Remove"}
                    </button>
                  )}
                </GlassCard>
              ))}

            {tab === "activity" && (!data || data.activity.length === 0) && (
              <EmptyState
                icon={Zap}
                title="No recent activity"
                description="Friend updates will appear here."
              />
            )}
            {tab === "activity" &&
              data?.activity.map((a) => {
                const friend = data.friends.find((f) => f.id === a.friendId);
                const Icon = a.type === "sprint" ? Zap : a.type === "duel" ? Swords : Award;
                return (
                  <GlassCard
                    key={a.id}
                    data-friend-item
                    className="flex items-center gap-3 p-3 sm:p-4 max-[359px]:gap-2"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                      <Icon size={14} className="text-muted-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-foreground/80">
                        <span className="font-bold">{friend?.name ?? "Someone"}</span> {a.label}
                      </p>
                      <p className="text-micro text-muted-foreground/50 mt-0.5">{a.time}</p>
                    </div>
                  </GlassCard>
                );
              })}

            {tab === "requests" &&
              (data?.requests.length === 0 && sentCount === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No pending requests"
                  description="Requests you receive or send wait here until they are answered."
                  action={{ label: "Add a friend", onClick: openAdd }}
                />
              ) : (
                data?.requests.map((f) => (
                  <GlassCard
                    key={f.id}
                    data-friend-item
                    className="flex items-center gap-3 p-3 sm:p-4 max-[359px]:gap-2"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-[12px] font-black text-primary">
                      {f.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-foreground/80">{f.name}</p>
                      <p className="text-micro text-muted-foreground/40">Friend request</p>
                    </div>
                    <div className="flex gap-2 max-[359px]:gap-1.5">
                      <button
                        type="button"
                        aria-label={`Accept friend request from ${f.name}`}
                        onClick={() => answer(f.friendshipId, f.name, "accept")}
                        disabled={respond.isPending || !f.friendshipId}
                        className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground outline-none transition-transform hover:scale-[1.1] active:scale-[0.9] focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Reject friend request from ${f.name}`}
                        onClick={() => answer(f.friendshipId, f.name, "decline")}
                        disabled={respond.isPending || !f.friendshipId}
                        className="grid size-11 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:text-foreground active:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </GlassCard>
                ))
              ))}

            {tab === "requests" && sentCount > 0 && (
              <section aria-label="Requests you sent" className="mt-2" data-testid="sent-requests">
                <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Sent
                </h2>
                {data?.sent.map((r) => (
                  <GlassCard
                    key={r.friendshipId}
                    className="mb-2 flex items-center gap-3 p-3 sm:p-4"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-muted-foreground">
                      <Clock size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-foreground/80">Request sent</p>
                      <p className="text-[11px] text-muted-foreground">
                        Waiting for a reply
                        {sinceLabel(r.requestedAt) ? ` · sent ${sinceLabel(r.requestedAt)}` : ""}
                      </p>
                    </div>
                  </GlassCard>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>

      <Button
        aria-label="Add friend"
        size="icon"
        onClick={openAdd}
        aria-haspopup="dialog"
        className="fixed right-5 bottom-20 z-40 size-14 rounded-full shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 max-[359px]:right-4 md:hidden"
      >
        <UserPlus size={22} strokeWidth={2.5} />
      </Button>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        placement="center"
        className="max-w-[380px] border-[var(--glass-border)] bg-[var(--glass-02)]"
        ariaLabel="Add a friend"
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserPlus size={15} className="text-primary" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
                Add a friend
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              aria-label="Close"
              className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-foreground active:scale-90"
            >
              <X size={15} />
            </button>
          </div>
          <form
            data-testid="add-friend-form"
            noValidate
            className="mx-auto mt-3 flex w-full max-w-sm flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitAdd();
            }}
          >
            <label className="text-left text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
              Friend&apos;s email
              <input
                type="email"
                autoComplete="off"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="friend@example.com"
                className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-primary/40"
              />
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={sendRequest.isPending || !addEmail.trim()}
              className="min-h-[44px]"
            >
              {sendRequest.isPending ? "Sending…" : "Send request"}
            </Button>
            {addMessage && (
              <p
                role={addMessage.kind === "error" ? "alert" : "status"}
                data-testid="add-friend-message"
                className={cn(
                  "text-[12px]",
                  addMessage.kind === "error" ? "text-destructive" : "text-primary",
                )}
              >
                {addMessage.text}
              </p>
            )}
          </form>
          <form
            data-testid="friend-code-form"
            noValidate
            className="mx-auto mt-4 flex w-full max-w-sm flex-col gap-2 border-t border-white/[0.06] pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitQr();
            }}
          >
            <label className="text-left text-micro font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
              Or paste a friend&apos;s code
              <input
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Code from their Add friend QR"
                className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-mono text-[13px] font-semibold text-foreground outline-none focus:border-primary/40"
              />
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={redeemQr.isPending || !qrCode.trim()}
              className="min-h-[44px]"
            >
              {redeemQr.isPending ? "Adding…" : "Add with code"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="glass"
              onClick={() => setScanOpen(true)}
              disabled={redeemQr.isPending}
              className="min-h-[44px]"
            >
              <Camera size={14} /> Scan QR with camera
            </Button>
            {qrMessage && (
              <p
                role={qrMessage.kind === "error" ? "alert" : "status"}
                data-testid="friend-code-message"
                className={cn(
                  "text-[12px]",
                  qrMessage.kind === "error" ? "text-destructive" : "text-primary",
                )}
              >
                {qrMessage.text}
              </p>
            )}
          </form>
        </div>
      </Dialog>
      <FriendQrScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(text) => submitQr(text)}
      />
    </PageContainer>
  );
}
