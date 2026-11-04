"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useRef, useEffect } from "react";
import { Bell, Zap, Award, Swords, Info, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useNotifications } from "@/hooks/queries/use-notifications";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { NotificationItem } from "@/lib/types/notifications";
import { BG, GLASS_BG } from "@/lib/theme";

const TYPE_ICON: Record<NotificationItem["type"], typeof Bell> = {
  sprint_reminder: Zap,
  achievement: Award,
  challenge: Swords,
  system: Info,
};

export default function NotificationsPage() {
  usePageMeta("Notifications — Zuzumik");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data: notifications, isLoading, error } = useNotifications();
  const listRef = useRef<HTMLDivElement>(null);
  const { headerRef, animateSection, staggerIn } = useEntranceAnimations();

  useEffect(() => {
    if (listRef.current && notifications && notifications.length > 0) {
      const items = listRef.current.querySelectorAll<HTMLElement>("[data-notification-item]");
      staggerIn(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: "power2.out" });
    }
  }, [notifications, filter, staggerIn]);

  const filtered = notifications?.filter((n) => filter === "all" || !n.read) ?? [];
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-2xl">
      {/* Header */}
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Bell size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">NOTIFICATIONS</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </p>
        {unreadCount > 0 && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl px-4 py-3 text-micro font-bold uppercase tracking-wider outline-none transition-colors min-h-[44px] max-[359px]:gap-1 max-[359px]:px-3 max-[359px]:py-2.5 whitespace-nowrap"
              style={{ background: `linear-gradient(to right, var(--cta-from), var(--cta-to))`, color: BG }}
            >
              <CheckCheck size={14} />
              Mark All Read
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div ref={animateSection} data-section-index="0" className="mt-5 flex gap-2 max-[359px]:gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "min-h-11 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "border border-white/[0.06] text-muted-foreground hover:text-foreground active:text-foreground",
          )}
          style={filter !== "all" ? { background: GLASS_BG } : undefined}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={cn(
            "min-h-11 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap",
            filter === "unread"
              ? "bg-primary text-primary-foreground"
              : "border border-white/[0.06] text-muted-foreground hover:text-foreground active:text-foreground",
          )}
          style={filter !== "unread" ? { background: GLASS_BG } : undefined}
        >
          Unread {unreadCount > 0 && <span className="ml-1 text-primary">({unreadCount})</span>}
        </button>
      </div>

      {/* Content */}
      <div ref={animateSection} data-section-index="1" className="mt-4">
        {isLoading && (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-3xl" style={{ background: GLASS_BG }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[12px] font-semibold text-destructive">Failed to load notifications</p>
            <p className="mt-1 text-micro text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <Bell size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-[12px] text-muted-foreground/60">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div ref={listRef} className="rounded-3xl border border-white/[0.06] backdrop-blur-xl divide-y divide-white/[0.06] overflow-hidden" style={{ background: GLASS_BG }}>
            {filtered.map((n) => {
              const Icon = TYPE_ICON[n.type];
              return (
                <div
                  key={n.id}
                  data-notification-item
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] max-[359px]:gap-2 max-[359px]:px-3 max-[359px]:py-3"
                >
                  <div className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl mt-0.5",
                    n.read ? "bg-white/[0.06]" : "bg-primary/10",
                  )}>
                    <Icon size={16} className={n.read ? "text-muted-foreground/40" : "text-primary"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 max-[359px]:gap-1.5">
                      {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                      <p className={cn(
                        "text-[11px] font-semibold truncate",
                        n.read ? "text-foreground/60" : "text-foreground",
                      )}>
                        {n.title}
                      </p>
                    </div>
                    <p className={cn(
                      "text-[11px] mt-0.5 leading-relaxed",
                      n.read ? "text-muted-foreground/40" : "text-muted-foreground/60",
                    )}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{n.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </PageContainer>
  );
}
