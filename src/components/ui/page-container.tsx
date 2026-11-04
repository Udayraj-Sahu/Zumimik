"use client";

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "default" | "sm";
}

export const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(function PageContainer(
  { size = "default", className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col pt-6 pb-4 min-h-dvh",
        size === "default" ? "max-w-[var(--content-max-width)]" : "max-w-lg",
        "px-[var(--page-padding)]",
        className,
      )}
      {...props}
    />
  );
});