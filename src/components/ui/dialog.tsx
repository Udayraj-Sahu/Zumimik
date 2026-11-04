"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

type Placement = "bottom-sheet" | "center";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  placement?: Placement;
  className?: string;
  panelStyle?: CSSProperties;
  overlayClassName?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  role?: "dialog" | "alertdialog";
  overlayRef?: RefObject<HTMLDivElement>;
  panelRef?: RefObject<HTMLDivElement>;
}

export function Dialog({
  open,
  onClose,
  children,
  placement = "bottom-sheet",
  className,
  panelStyle,
  overlayClassName,
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
  role = "dialog",
  overlayRef,
  panelRef: externalPanelRef,
}: DialogProps) {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const innerPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = externalPanelRef ?? innerPanelRef;
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables && focusables.length > 0) {
      focusables[0].focus();
    } else {
      panel?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const el = panelRef.current;
      if (!el) return;
      const els = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevFocusRef.current?.focus?.();
    };
  }, [open, onClose, panelRef]);

  if (!open) return null;

  return createPortal(
    <div
        ref={overlayRef}
        data-theme-scope
        data-accent={accent}
        suppressHydrationWarning
        className={cn(
          "fixed inset-0 z-[var(--z-dialog)] flex justify-center bg-black/60 backdrop-blur-sm",
        placement === "center" ? "items-center p-4" : "items-end sm:items-center",
        theme === "light" && "light",
        overlayClassName,
      )}
      role={role}
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md bg-card shadow-2xl outline-none",
          placement === "center"
            ? "rounded-2xl border border-border/60"
            : "max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border/60 sm:rounded-3xl",
          className,
        )}
        style={panelStyle}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}