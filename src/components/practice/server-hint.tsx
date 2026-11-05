"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { useFeatureFlags } from "@/hooks/queries/use-feature-flags";
import { useChatPolicy } from "@/hooks/queries/use-chat-policy";
import { IS_MOCK } from "@/lib/platform";
import { CTA_04, CTA_20 } from "@/lib/theme";
import { getServerHint, hintErrorMessage, type ServerHint } from "@/services/chat";
import { isFeatureOff } from "@/services/flags";

/**
 * "Need a hint?" for a practice question that has no hint of its own: asks the server (POST /chat/query) for a hint ladder for the
 * problem, one level at a time. Shown only once GET /chat/policy confirms the helper is on for this learner; hidden when the chatbot flag
 * is off, in mock mode, or once the question has been answered. Mount it
 * with the question's id as its key so each question starts again at level 1.
 */
export function ServerHintPanel({ templateId, disabled }: { templateId: string; disabled?: boolean }) {
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  // The switch list can only say "definitely off"; the policy route answers for this learner (rollout included).
  const off = isFeatureOff(flags, "chatbot");
  const policy = useChatPolicy(!disabled && !flagsLoading && !off);
  const [hint, setHint] = useState<ServerHint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wait for the flag list to settle (loaded or failed) so a feature that is off never flashes a button.
  if (IS_MOCK || disabled || flagsLoading || off || !policy.data) return null; // no policy yet, or refused: no button

  const ask = async (level: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setHint(await getServerHint(templateId, level));
    } catch (err) {
      setError(hintErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const more = hint !== null && hint.level < hint.maxLevel;

  return (
    <div className="mb-5" data-testid="server-hint">
      {!hint ? (
        <button
          type="button"
          onClick={() => void ask(1)}
          disabled={busy}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/25 bg-primary/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary outline-none transition-all hover:bg-primary/[0.12] disabled:opacity-50 max-[359px]:px-3"
        >
          <Lightbulb size={12} /> {busy ? "Getting a hint…" : "Need a hint?"}
        </button>
      ) : (
        <div className="rounded-2xl border p-4 backdrop-blur-xl max-[359px]:p-3" style={{ borderColor: CTA_20, background: CTA_04 }}>
          <p className="mb-1.5 flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.18em] text-primary/80">
            <Lightbulb size={12} /> Hint {hint.maxLevel > 1 ? `${hint.level} of ${hint.maxLevel}` : ""}
          </p>
          <p className="text-[13px] leading-relaxed text-foreground/80" data-testid="server-hint-text">{hint.hint}</p>
          {hint.notice && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/60">{hint.notice}</p>}
          {more && (
            <button
              type="button"
              onClick={() => void ask(hint.level + 1)}
              disabled={busy}
              className="mt-3 rounded-full border border-primary/25 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary outline-none transition-all hover:bg-primary/[0.12] disabled:opacity-50"
            >
              {busy ? "…" : "Another hint"}
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" data-testid="server-hint-error" className="mt-2 text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
