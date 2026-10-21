"use client";

import { useState, useRef, useEffect } from "react";
import { Users, UserPlus, Swords, Zap, Award, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useFriends } from "@/hooks/queries/use-friends";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { GLASS_06, GLASS_BG, GLASS_BORDER } from "@/lib/theme";

export default function FriendsPage() {
  usePageMeta("Friends — Zuzumik");
  const { data, isLoading, error } = useFriends();
  const [tab, setTab] = useState<"friends" | "activity" | "requests">("friends");
  const listRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();

  useEffect(() => {
    if (listRef.current && data) {
      const items = listRef.current.querySelectorAll<HTMLElement>("[data-friend-item]");
      staggerIn(items, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" });
    }
  }, [data, tab, staggerIn]);

  const requestCount = data?.requests.length ?? 0;

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-3xl">
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Users size={12} className="text-primary" />
          <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">FRIENDS</span>
        </div>
        <h1 className="text-[20px] font-bold tracking-[-0.02em] text-foreground leading-tight">Friends</h1>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Compete and stay motivated together</p>
        <div className="mt-3 flex justify-center">
          <Button
            size="sm"
            className="rounded-xl px-3 py-2.5 min-h-[44px] hover:scale-[1.05] active:scale-[0.95] max-[359px]:px-2.5 max-[359px]:py-2"
          >
            <UserPlus size={14} /> Add
          </Button>
        </div>
      </div>

      <div ref={animateSection} data-section-index="0" className="mt-5 flex gap-2 overflow-x-auto max-[359px]:gap-1.5">
        <button
          type="button"
          onClick={() => setTab("friends")}
          className={cn(
            "rounded-full px-4 py-3 text-micro font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] max-[359px]:px-3 max-[359px]:py-2.5 whitespace-nowrap",
            tab === "friends"
              ? "bg-primary text-primary-foreground"
              : "border border-white/[0.06] text-muted-foreground hover:text-foreground",
            tab !== "friends" && GLASS_BG && { background: GLASS_BG }
          )}
          style={tab !== "friends" ? { background: GLASS_BG, borderColor: GLASS_06 } : undefined}
        >
          Friends
        </button>
        <button
          type="button"
          onClick={() => setTab("activity")}
          className={cn(
            "rounded-full px-4 py-3 text-micro font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] max-[359px]:px-3 max-[359px]:py-2.5 whitespace-nowrap",
            tab === "activity"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          style={tab !== "activity" ? { background: GLASS_BG, border: "1px solid var(--glass-06)" } : undefined}
        >
          Activity
        </button>
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={cn(
            "rounded-full px-4 py-3 text-micro font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] max-[359px]:px-3 max-[359px]:py-2.5 whitespace-nowrap",
            tab === "requests"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          style={tab !== "requests" ? { background: GLASS_BG, border: "1px solid var(--glass-06)" } : undefined}
        >
          Requests {requestCount > 0 && <span className="ml-1 text-primary">({requestCount})</span>}
        </button>
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
            <div className="py-10 text-center max-[359px]:py-8">
              <Users size={28} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-[12px] text-muted-foreground/60">No friends yet</p>
              <p className="text-micro text-muted-foreground/40 mt-1">Compete to stand out on the leaderboard.</p>
            </div>
          )}
          {tab === "friends" && data?.friends.map((f) => (
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
                  <span className="rounded-xl bg-white/[0.06] px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-muted-foreground">
                    {f.level}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-micro text-muted-foreground/40 max-[359px]:gap-2">
                  <span className="flex items-center gap-1 whitespace-nowrap"><Zap size={10} /> {f.xp.toLocaleString()} XP</span>
                  <span className="flex items-center gap-1 whitespace-nowrap">Streak: {f.streak}d</span>
                  <span className="whitespace-nowrap">{f.lastActive}</span>
                </div>
              </div>
              <button
                type="button"
                className="flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-micro font-bold text-primary outline-none transition-colors hover:bg-primary/20 active:bg-primary/30 focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap"
                style={{ background: GLASS_BG }}
              >
                <Swords size={12} /> Duel
              </button>
            </GlassCard>
          ))}

          {tab === "activity" && (!data || data.activity.length === 0) && (
            <div className="py-10 text-center max-[359px]:py-8">
              <Zap size={28} className="mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-[12px] text-muted-foreground/60">No recent activity</p>
              <p className="text-micro text-muted-foreground/40 mt-1">Friend updates will appear here.</p>
            </div>
          )}
          {tab === "activity" && data?.activity.map((a) => {
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

          {tab === "requests" && (
            data?.requests.length === 0 ? (
              <div className="py-10 text-center max-[359px]:py-8">
                <Users size={28} className="mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-[12px] text-muted-foreground/60">No pending requests</p>
              </div>
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
                    <p className="text-micro text-muted-foreground/40">{f.level} &middot; {f.xp.toLocaleString()} XP</p>
                  </div>
                  <div className="flex gap-2 max-[359px]:gap-1.5">
            <button
              type="button"
              aria-label={`Accept friend request from ${f.name}`}
              className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground outline-none transition-transform hover:scale-[1.1] active:scale-[0.9] focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              aria-label={`Reject friend request from ${f.name}`}
              className="grid size-11 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:text-foreground active:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}
            >
              <X size={14} />
            </button>
                  </div>
                </GlassCard>
              ))
            )
          )}
        </div>
      </div>
      </div>
    </PageContainer>
  );
}
