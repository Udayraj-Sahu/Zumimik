"use client";

import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustStatus } from "@/lib/types/sprint-session";

interface TrustBadgeProps {
  status?: TrustStatus;
  className?: string;
}

const TRUST_CONFIG: Record<TrustStatus, { label: string; icon: typeof Shield; colors: string }> = {
  trusted: {
    label: "Verified",
    icon: ShieldCheck,
    colors: "text-chart-3 border-chart-3/20 bg-chart-3/5",
  },
  sandbox: {
    label: "Sandbox",
    icon: Shield,
    colors: "text-chart-4 border-chart-4/20 bg-chart-4/5",
  },
  live: {
    label: "New",
    icon: ShieldAlert,
    colors: "text-muted-foreground border-border/30 bg-card",
  },
};

export default function TrustBadge({ status, className }: TrustBadgeProps) {
  if (!status || status === "trusted") return null;

  const config = TRUST_CONFIG[status] ?? TRUST_CONFIG.live;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-fluid-xs font-bold uppercase tracking-wider",
        config.colors,
        className,
      )}
    >
      <Icon size={10} />
      {config.label}
    </span>
  );
}
