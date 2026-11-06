"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, Loader2, UploadCloud } from "lucide-react";
import { IS_MOCK } from "@/lib/platform";
import { useAuthStore } from "@/stores/auth-store";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { syncAll } from "@/services/offline/sync";
import type { SyncStatusKind } from "@/services/sync-status";

const COPY: Record<SyncStatusKind, string> = {
  synced: "Synced",
  syncing: "Syncing",
  offline: "Offline",
  pending: "Waiting to sync",
  attention: "Needs attention",
};

const FLASH_MS = 2000;

const ICON = { synced: CheckCircle2, syncing: Loader2, offline: CloudOff, pending: UploadCloud, attention: AlertTriangle } as const;

/**
 * A small, always-available note on whether the learner's progress has reached the server: Synced, Syncing, Offline, Waiting to sync
 * (with how many), or Needs attention (events the server refused, kept on the device, with its reasons). It only reads the queue. The
 * one action it offers is to try sending again; nothing here can delete a waiting or refused event.
 */
export function SyncIndicator() {
  const signedIn = useAuthStore((s) => !!s.user?.id);
  const { kind, counts, refresh } = useSyncStatus();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevKind = useRef<SyncStatusKind | null>(null);
  // Offline and Needs attention stay up until resolved. Synced, Syncing and Waiting only flash for a moment when the status
  // changes, then hide; the first status read on load stays silent.
  const sticky = kind === "offline" || kind === "attention";
  useEffect(() => {
    const first = prevKind.current === null;
    const changed = prevKind.current !== kind;
    prevKind.current = kind;
    if (!changed || (first && kind === "synced")) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [kind]);
  if (IS_MOCK || !signedIn) return null;
  const showBadge = sticky || flash || open;
  const Icon = ICON[kind];
  const waiting = counts.pendingEvents;
  const detail = [
    waiting > 0 ? `${waiting} event${waiting === 1 ? "" : "s"} waiting` : null,
    counts.parkedEvents > 0 ? `${counts.parkedEvents} need${counts.parkedEvents === 1 ? "s" : ""} attention` : null,
  ].filter(Boolean).join(" · ");
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-3 z-[60] md:bottom-4" data-testid="sync-indicator" data-kind={kind}>
      {showBadge && <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Sync status: ${COPY[kind]}${detail ? `, ${detail}` : ""}`}
        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon size={13} className={kind === "syncing" ? "animate-spin" : kind === "attention" ? "text-[var(--amber)]" : undefined} aria-hidden />
        <span data-testid="sync-label">{COPY[kind]}</span>
        {waiting > 0 && kind !== "synced" && <span data-testid="sync-count">{waiting}</span>}
      </button>}
      {open && (
        <div role="status" data-testid="sync-details" className="mt-2 w-64 rounded-2xl border border-border/60 bg-card p-3 text-[12px] text-muted-foreground shadow-lg">
          <p className="font-semibold text-foreground">{COPY[kind]}</p>
          {kind === "synced" && <p className="mt-1">Everything you have done is saved on the server.</p>}
          {kind === "offline" && <p className="mt-1">You are offline. Your progress is saved on this device and will be sent when you are back online.</p>}
          {detail && <p className="mt-1" data-testid="sync-detail">{detail}</p>}
          {counts.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4" data-testid="sync-reasons">
              {counts.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          {counts.parkedEvents > 0 && <p className="mt-2">These are kept on this device. They are not retried, because the server will refuse them again.</p>}
          {waiting > 0 && kind !== "syncing" && (
            <button
              type="button"
              onClick={() => { void syncAll().catch(() => {}).finally(refresh); }}
              className="mt-2 rounded-md border border-border/60 px-2 py-1 text-[11px] font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
