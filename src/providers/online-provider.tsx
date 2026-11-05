"use client";

import { useEffect, useRef } from "react";
import { useNetworkStore } from "@/stores/network-store";
import { syncAll, clearExpiredCache } from "@/services/offline/sync";
import { flushImpressions } from "@/services/ads";
import { checkServer } from "@/services/health";
import { isOnline, onOnline, onOffline } from "@/services/device";
import { OfflineBanner } from "@/components/shell/offline-banner";

export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const setOnline = useNetworkStore((s) => s.setOnline);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    setOnline(isOnline());
    clearExpiredCache().catch(() => {});
    // Pending work from a previous session (queued attempts/feedback) is sent as soon as the app starts online.
    if (isOnline()) {
      void syncAll().catch(() => {});
      void flushImpressions().catch(() => {});
      void checkServer(); // silent: records the server's state, shows nothing
    }

    const goOnline = () => {
      setOnline(true);
      syncAll();
      void flushImpressions().catch(() => {});
      void checkServer();
    };
    const goOffline = () => setOnline(false);

    const unsubOnline = onOnline(goOnline);
    const unsubOffline = onOffline(goOffline);

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [setOnline]);

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
