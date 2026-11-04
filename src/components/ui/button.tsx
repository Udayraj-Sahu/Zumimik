"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "cta" | "primary" | "glass" | "destructive" | "ghost";
export type ButtonSize = "lg" | "md" | "sm" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  cta: "bg-cta text-[var(--on-accent)]",
  primary: "bg-primary text-primary-foreground hover:bg-primary/85",
  glass: "btn-glass border backdrop-blur-xl text-foreground hover:bg-white/[0.06]",
  destructive:
    "border-[var(--red-soft-25)] bg-[var(--red-soft-06)] text-[var(--red-soft)] hover:bg-[var(--red-soft-12)]",
  ghost: "text-foreground/70 hover:bg-white/[0.06] hover:text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: "gap-2 rounded-3xl px-5 py-4 text-[13px] font-bold uppercase tracking-widest",
  md: "gap-2 rounded-xl px-5 py-3 text-[12px] font-bold",
  sm: "gap-1.5 rounded-full px-4 py-2 text-micro font-bold uppercase tracking-wider",
  icon: "grid size-11 place-items-center rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "cta", size = "md", fullWidth = false, className, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap select-none outline-none transition-[transform,background-color,opacity,border-color] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed",
        fullWidth && "w-full",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});