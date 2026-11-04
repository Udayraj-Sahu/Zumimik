"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastType } from "@/stores/toast-store";
import { useThemeStore } from "@/stores/theme-store";

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
};

const ICON_CLASS: Record<ToastType, string> = {
  success: "text-emerald",
  info: "text-sky",
  error: "text-destructive",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);

  // The portal target (document.body) is outside every [data-theme-scope], so the
  // wrapper itself has to be one — otherwise toasts keep resolving the :root dark
  // tokens regardless of the user's theme, and lose the selected accent.
  return createPortal(
    <div
      data-theme-scope
      data-accent={accent}
      suppressHydrationWarning
      className={cn("contents", theme === "light" && "light")}
    >
      <div
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--bottom-nav-height)+1.25rem)] z-[var(--z-toast)] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
        aria-live="polite"
      >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-2xl"
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", ICON_CLASS[t.type])} />
              <div className="min-w-0 flex-1">
                <p className="text-fluid-sm font-bold text-foreground">{t.title}</p>
                {t.message && (
                  <p className="text-fluid-xs mt-0.5 text-muted-foreground/70">{t.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground/40 outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      </div>
    </div>,
    document.body,
  );
}