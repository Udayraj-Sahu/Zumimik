"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ExamShellProps {
  header?: ReactNode;
  footer?: ReactNode;
  navigator?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ExamShell({ header, footer, navigator, className, children }: ExamShellProps) {
  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      {header ? (
        <header className="sticky top-0 z-20 -mx-[var(--page-padding)] bg-background/85 px-[var(--page-padding)] pt-3 backdrop-blur-xl">
          {header}
        </header>
      ) : null}

      <div className={cn("flex flex-1 gap-6", navigator ? "flex-col md:flex-row" : "flex-col")}>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        {navigator ? (
          <aside className="hidden shrink-0 md:block md:w-[200px]">{navigator}</aside>
        ) : null}
      </div>

      {footer ? (
        <footer className="sticky bottom-0 z-20 -mx-[var(--page-padding)] mt-auto border-t border-white/[0.06] bg-background/85 px-[var(--page-padding)] pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}