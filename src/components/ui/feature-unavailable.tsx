import { Lock } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Real-backend mode for a feature the backend does not expose yet.
 * Shown instead of fixture data so nothing fabricated is ever presented as the user's own.
 */
export function FeatureUnavailable({
  title,
  description = "This feature isn't available yet. It will appear here once it is supported by the server.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <PageContainer className="text-center">
      <div className="mx-auto w-full md:max-w-xl pt-10">
        <GlassCard className="p-8">
          <Lock size={24} className="mx-auto mb-3 text-muted-foreground/40" aria-hidden />
          <h1 className="text-[18px] font-bold tracking-[-0.02em] text-foreground">{title}</h1>
          <p role="status" data-testid="feature-unavailable" className="mt-2 text-[13px] text-muted-foreground/60">
            {description}
          </p>
        </GlassCard>
      </div>
    </PageContainer>
  );
}
