"use client";

import { PageContainer } from "@/components/ui/page-container";
import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <p className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
          Loading arena…
        </p>
      </div>
    </PageContainer>
  );
}