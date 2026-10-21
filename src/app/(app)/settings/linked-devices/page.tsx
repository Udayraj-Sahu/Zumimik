"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone, Globe, LogOut, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useLinkedDevices, useRevokeDevice } from "@/hooks/queries/use-linked-devices";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { LinkedDevice, LinkedDevicePlatform } from "@/lib/types/linked-devices";
import { GLASS_BG } from "@/lib/theme";

const PLATFORM_META: Record<LinkedDevicePlatform, { label: string; Icon: typeof Smartphone }> = {
  android: { label: "Android", Icon: Smartphone },
  web: { label: "Web", Icon: Globe },
  ios: { label: "iOS", Icon: Smartphone },
};

function timeAgo(lastActive: string): string {
  if (lastActive === "now") return "Active now";
  return `Last active ${lastActive}`;
}

export default function LinkedDevicesPage() {
  usePageMeta("Linked Devices — Zuzumik");
  const router = useRouter();
  const { data: devices, isLoading, error } = useLinkedDevices();
  const revoke = useRevokeDevice();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { headerRef, animateSection } = useEntranceAnimations();

  const handleRevoke = (device: LinkedDevice) => {
    if (!confirmingId) {
      setConfirmingId(device.id);
      return;
    }
    if (confirmingId !== device.id) {
      setConfirmingId(device.id);
      return;
    }
    revoke.mutate(device.id, {
      onSuccess: () => setConfirmingId(null),
    });
  };

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-2xl">
      {/* Header */}
      <div ref={headerRef} className="text-center">
        <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
          <Monitor size={12} className="text-primary" />
          <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">LINKED DEVICES</h1>
        </div>
        <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">
          Devices you&apos;re currently logged in on
        </p>
        {devices && devices.length > 0 && (
          <p className="text-micro text-muted-foreground/60 font-normal mt-0.5">
            {devices.length} device{devices.length === 1 ? "" : "s"} linked
          </p>
        )}
      </div>

      {/* List */}
      <div ref={animateSection} className="mt-6">
        {isLoading && (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-3xl" style={{ background: GLASS_BG }} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-[12px] font-semibold text-destructive">Failed to load devices</p>
            <p className="mt-1 text-micro text-muted-foreground/60">{error instanceof Error ? error.message : "Something went wrong"}</p>
          </div>
        )}

        {devices && devices.length === 0 && !isLoading && (
          <div className="py-14 text-center">
            <Monitor size={32} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-[12px] text-muted-foreground/60">No linked devices yet</p>
          </div>
        )}

        {devices && devices.length > 0 && (
          <div className="rounded-3xl border border-white/[0.06] backdrop-blur-xl divide-y divide-white/[0.06] overflow-hidden" style={{ background: GLASS_BG }}>
            {devices.map((device) => {
              const { Icon } = PLATFORM_META[device.platform];
              const isConfirming = confirmingId === device.id;
              return (
                <div key={device.id} className="flex items-center gap-4 px-5 py-4 max-[359px]:gap-2 max-[359px]:px-4 max-[359px]:py-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/[0.06]">
                    <Icon size={18} className={device.current ? "text-primary" : "text-foreground/60"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 max-[359px]:gap-1.5">
                      <p className="text-[13px] font-semibold text-foreground truncate">{device.name}</p>
                      {device.current && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold tracking-wide text-primary uppercase">
                          <ShieldCheck size={9} /> This device
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/40 font-normal mt-0.5">{device.model}</p>
                    <p className={cn("text-[10px] font-normal mt-0.5", device.current ? "text-primary/70" : "text-muted-foreground/55")}>
                      {device.current
                        ? timeAgo(device.lastActive)
                        : `${timeAgo(device.lastActive)} · ${device.addedAt}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(device)}
                    disabled={revoke.isPending}
                    className={cn(
                      "flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-bold transition-all active:scale-95 max-[359px]:gap-1 max-[359px]:px-3 max-[359px]:py-2 whitespace-nowrap",
                      isConfirming
                        ? "bg-[var(--red-soft-solid)] text-[var(--on-accent)]"
                        : "border border-white/[0.07] bg-white/[0.04] text-[var(--red-soft)]",
                    )}
                  >
                    <LogOut size={13} />
                    {revoke.isPending && confirmingId === device.id
                      ? "Revoking..."
                      : isConfirming
                        ? "Confirm"
                        : "Log out"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmingId && (
        <p className="mt-3 px-1 text-center text-micro text-muted-foreground/40 font-normal">
          Tap again to confirm — this sign-out takes effect immediately.
        </p>
      )}

      {/* Link another */}
      <button
        type="button"
        onClick={() => router.push("/settings/scan-to-login")}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.05] py-4 text-[13px] font-semibold text-primary transition-all hover:border-primary/40 hover:bg-primary/[0.08] active:scale-[0.98] max-[359px]:gap-1.5 max-[359px]:py-3 whitespace-nowrap"
      >
        <Plus size={15} /> Link a new device
      </button>
      </div>
    </PageContainer>
  );
}