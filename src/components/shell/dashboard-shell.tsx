"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { useAuthStore } from "@/stores/auth-store";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <AppShell>{children}</AppShell>
  );
}
