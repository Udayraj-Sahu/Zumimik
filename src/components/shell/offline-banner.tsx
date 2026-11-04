"use client";

import { useState } from "react";
import { WifiOff, X } from "lucide-react";
import { useNetworkStore } from "@/stores/network-store";
import { syncAll } from "@/services/offline/sync";

export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const syncQueue = useNetworkStore((s) => s.syncQueue);
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  const pending = syncQueue.length > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-3 border-b border-amber-500/30 bg-[var(--warm-black-95)] px-4 py-2.5 backdrop-blur-xl"
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
        <p className="text-[12px] font-bold tracking-wide text-amber-200">
          You&apos;re offline — showing saved data.
        </p>
        {pending && (
          <p className="hidden text-[11px] font-medium text-amber-400/80 sm:inline">
            {syncQueue.length} action{syncQueue.length === 1 ? "" : "s"} queued to sync
          </p>
        )}
        {syncQueue.length > 0 && (
          <button
            type="button"
            onClick={() => syncAll().catch(() => {})}
            className="rounded-md border border-amber-400/40 px-2 py-1 text-[11px] font-bold text-amber-300 transition-colors hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Retry sync
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notice"
        className="grid size-6 shrink-0 place-items-center rounded text-amber-300/70 transition-colors hover:bg-white/5 hover:text-amber-200"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}