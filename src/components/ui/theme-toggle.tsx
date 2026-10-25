"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccentId } from "@/lib/theme";
import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  WARM_TINT_MAX,
  WARM_TINT_MIN,
  useThemeStore,
  type Theme,
} from "@/stores/theme-store";
import styles from "./theme-toggle.module.css";

/** The three real modes, in the order the reference panel lists them. */
const MODES: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "study", label: "Study" },
];

/**
 * The reference's four palette names map onto the design system's orange/blue/
 * emerald/amber accent token sets; the remaining four app accents keep their own
 * names. Together they expose every supported accent exactly once, so the menu
 * drives the existing `[data-accent]` machinery instead of introducing a second
 * accent system. Swatch paints come from the shared --swatch-* tokens in
 * globals.css, never from a literal hex in this component.
 */
const ACCENTS: { label: string; accent: AccentId; swatch: string }[] = [
  { label: "Lime", accent: "lime", swatch: "var(--swatch-lime)" },
  { label: "Coral", accent: "orange", swatch: "var(--swatch-coral)" },
  { label: "Azure", accent: "blue", swatch: "var(--swatch-azure)" },
  { label: "Mint", accent: "emerald", swatch: "var(--swatch-mint)" },
  { label: "Gold", accent: "amber", swatch: "var(--swatch-gold)" },
  { label: "Cyan", accent: "cyan", swatch: "var(--swatch-cyan)" },
  { label: "Violet", accent: "violet", swatch: "var(--swatch-violet)" },
  { label: "Red", accent: "red", swatch: "var(--swatch-red)" },
];

const MENU_WIDTH = 380;
const VIEWPORT_GAP = 8;

/** Trigger glyph mirrors the active mode, so the button always tells the truth. */
function modeIcon(theme: Theme): LucideIcon {
  if (theme === "light") return Sun;
  if (theme === "study") return BookOpen;
  return Moon;
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const warmTint = useThemeStore((s) => s.warmTint);
  const brightness = useThemeStore((s) => s.brightness);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setWarmTint = useThemeStore((s) => s.setWarmTint);
  const setBrightness = useThemeStore((s) => s.setBrightness);
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const menuId = useId();
  const ModeIcon = modeIcon(theme);
  const activeAccentLabel = ACCENTS.find((option) => option.accent === accent)?.label;

  // Anchor the menu to the trigger, flipping above it when the viewport runs
  // out of room below and clamping to the horizontal gaps on narrow screens.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
      const height = menuRef.current?.offsetHeight ?? 0;
      const below = rect.bottom + VIEWPORT_GAP;
      const above = rect.top - height - VIEWPORT_GAP;
      const top =
        height > 0 && below + height > window.innerHeight - VIEWPORT_GAP
          ? Math.max(VIEWPORT_GAP, above)
          : below;
      const right = Math.min(
        Math.max(window.innerWidth - rect.right, VIEWPORT_GAP),
        window.innerWidth - width - VIEWPORT_GAP,
      );
      setCoords({ top, right });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Focus the active mode once per open, and only after the panel is positioned
  // (it cannot take focus while still hidden). Rerenders never steal it.
  useEffect(() => {
    if (!open) {
      focused.current = false;
      setCoords(null);
      return;
    }
    if (!coords || focused.current) return;
    focused.current = true;
    const target =
      menuRef.current?.querySelector<HTMLElement>(`[data-mode="${theme}"]`) ??
      menuRef.current?.querySelector<HTMLElement>("button, input");
    target?.focus();
  }, [open, coords, theme]);

  // Pointer-down closes on any press outside the trigger or the panel; Escape
  // closes and hands focus back to the trigger from anywhere in the panel.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            data-theme-scope
            data-accent={accent}
            suppressHydrationWarning
            className={cn(
              "contents",
              theme === "light" && "light",
              theme === "study" && "study",
            )}
          >
            <div
              ref={menuRef}
              id={menuId}
              role="dialog"
              aria-label="Appearance settings"
              onBlur={(event) => {
                const next = event.relatedTarget as Node | null;
                if (!next) return;
                if (menuRef.current?.contains(next) || triggerRef.current?.contains(next)) return;
                setOpen(false);
              }}
              className={cn(
                styles.menu,
                styles.panel,
                theme === "light" && styles.menuLight,
                !coords && styles.menuHidden,
              )}
              style={coords ? { top: coords.top, right: coords.right } : undefined}
            >
              <section>
                <div className={styles.label}>
                  <span>Mode</span>
                </div>
                <div className={styles.seg} role="group" aria-label="Mode">
                  {MODES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      data-mode={option.id}
                      aria-pressed={theme === option.id}
                      onClick={() => setTheme(option.id)}
                      className={cn(styles.pill, theme === option.id && styles.pillOn)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className={styles.label}>
                  <span>Accent</span>
                  <span>{activeAccentLabel ?? "Custom"}</span>
                </div>
                <div className={styles.dots} role="group" aria-label="Accent">
                  {ACCENTS.map((option) => (
                    <button
                      key={option.accent}
                      type="button"
                      aria-label={option.label}
                      aria-pressed={accent === option.accent}
                      onClick={() => setAccent(option.accent)}
                      className={cn(styles.dot, accent === option.accent && styles.dotOn)}
                      style={{ backgroundColor: option.swatch }}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className={styles.label}>
                  <span>Warm tint</span>
                  <span>{warmTint === 0 ? "Off" : `${warmTint}%`}</span>
                </div>
                <input
                  type="range"
                  min={WARM_TINT_MIN}
                  max={WARM_TINT_MAX}
                  step={1}
                  value={warmTint}
                  aria-label="Warm tint"
                  onChange={(event) => setWarmTint(Number(event.target.value))}
                  className={styles.range}
                />
              </section>

              <section>
                <div className={styles.label}>
                  <span>Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={BRIGHTNESS_MIN}
                  max={BRIGHTNESS_MAX}
                  step={1}
                  value={brightness}
                  aria-label="Brightness"
                  onChange={(event) => setBrightness(Number(event.target.value))}
                  className={styles.range}
                />
              </section>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open appearance settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        data-pressed={pressed}
        onClick={() => {
          setPressed(false);
          setOpen((value) => !value);
        }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onBlur={() => setPressed(false)}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") setPressed(true);
          if (event.key !== "ArrowDown" || open) return;
          event.preventDefault();
          setOpen(true);
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") setPressed(false);
        }}
        className={cn(styles.trigger, className)}
      >
        <ModeIcon key={theme} size={18} aria-hidden="true" className={styles.triggerIcon} />
      </button>
      {menu}
    </>
  );
}
