"use client";

import { useMyAvatar } from "@/stores/avatar-store";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { LogOut, Zap } from "lucide-react";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { ZuzumikWordmark } from "@/components/brand/zuzumik-wordmark";
import { cn } from "@/lib/utils";
import { MOBILE_NAV } from "@/lib/config/nav";
import { useAuthStore } from "@/stores/auth-store";
import { useSubscription } from "@/hooks/queries/use-subscription";
import { useThemeStore } from "@/stores/theme-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { resetAppState } from "@/lib/platform";
import { Toaster } from "@/components/ui/toaster";

const Walkthrough = dynamic(
  () => import("@/components/shell/walkthrough").then((m) => ({ default: m.Walkthrough })),
  { ssr: false },
);
const RatePrompt = dynamic(
  () => import("@/components/shell/rate-prompt").then((m) => ({ default: m.RatePrompt })),
  { ssr: false },
);

const EXAM_ROUTES = ["/play/sprint", "/learn/mock/run", "/learn/practice"];

export function AppShell({ children }: { children: React.ReactNode }) {
  useSubscription(); // keep the plan gate in step with the backend entitlement
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);
  const expanded = useSidebarStore((s) => s.expanded);
  const setSidebarExpanded = useSidebarStore((s) => s.setExpanded);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (sidebarRef.current) {
      const els = sidebarRef.current.querySelectorAll<HTMLElement>("[data-sidebar-section]");
      gsap.fromTo(
        els,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" },
      );
    }
  }, []);

  useEffect(() => {
    if (mobileNavRef.current) {
      gsap.fromTo(
        mobileNavRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: "power2.out", delay: 0.25 },
      );
    }
  }, []);

  const pageRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" });
      }
    },
    [],
  );

  useEffect(() => {
    setSidebarExpanded(false);
  }, [pathname, setSidebarExpanded]);

  const visibleItems = MOBILE_NAV;
  const isExamFlow = EXAM_ROUTES.some((route) => pathname.startsWith(route));
  const photo = useMyAvatar();
  const avatarInitial = user?.name?.[0]?.toUpperCase() ?? "U";
  const displayName = (user?.name ?? "Operative").toUpperCase();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div data-theme-scope data-accent={accent} suppressHydrationWarning className={cn("min-h-screen bg-background text-foreground", theme === "light" && "light", theme === "study" && "study")}>
      <aside
        ref={sidebarRef}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className="group fixed inset-y-0 left-0 z-[var(--z-nav)] hidden w-[84px] flex-col border-r border-chrome-border bg-chrome px-4 py-7 transition-[width] duration-300 ease-out hover:w-[250px] min-[1025px]:flex"
      >
        {/* Logo */}
        <div className="mb-12 flex items-center gap-3 pl-1.5">
          <ZuzumikMark className="size-9" />
          <ZuzumikWordmark className="hidden h-[27px] w-auto shrink-0 text-primary group-hover:block" />
        </div>

        {/* Nav */}
        <nav data-sidebar-section data-tour-nav className="relative flex flex-col gap-2.5" aria-label="Primary">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center gap-3.5 rounded-[10px] border border-transparent px-4 py-[13px] text-[13.5px] font-bold uppercase tracking-[0.6px] outline-none transition-[background,color,border-color,justify-content] duration-150 focus-visible:ring-2 focus-visible:ring-ring group-hover:justify-start",
                  active
                    ? "border-primary bg-chrome-active text-primary"
                    : "text-chrome-muted hover:text-chrome-hover",
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="hidden whitespace-nowrap group-hover:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div data-sidebar-section className="mt-auto flex flex-col gap-4 pt-4">
          <Link
            href="/play/configure-sprint"
            data-tour-start-sprint
            aria-label="Start sprint"
            className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-primary-foreground outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Zap className="size-4" aria-hidden="true" />
            <span className="hidden whitespace-nowrap group-hover:inline">START SPRINT</span>
          </Link>

          <div className="flex items-center gap-3 px-1.5">
            <span className="grid size-[34px] shrink-0 place-items-center overflow-hidden rounded-full bg-chrome-avatar text-sm font-bold text-white dark:text-white keep-white">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                avatarInitial
              )}
            </span>
            <span className="hidden flex-1 truncate whitespace-nowrap text-[12.5px] font-bold uppercase tracking-[0.5px] text-chrome-foreground/60 group-hover:block">
              {displayName}
            </span>
            <button
              type="button"
              onClick={() => { void resetAppState().then(() => router.push("/")); }}
              aria-label="Logout"
              className="hidden size-11 shrink-0 place-items-center rounded-lg text-chrome-muted outline-none transition-colors hover:bg-white/5 hover:text-chrome-foreground focus-visible:ring-2 focus-visible:ring-ring group-hover:grid"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <main
        tabIndex={0}
        className={cn(
          "min-[1025px]:ml-[84px] min-[1025px]:transition-[margin-left] min-[1025px]:duration-300 min-[1025px]:ease-out mt-[var(--sat)] h-[calc(100dvh-var(--sat))] overflow-y-auto overflow-x-clip pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] outline-none",
          expanded && "min-[1025px]:ml-[250px]",
          isExamFlow ? "pb-0" : "pb-[max(calc(var(--bottom-nav-height)+2rem),env(safe-area-inset-bottom))] min-[1025px]:pb-0",
        )}
      >
        <div key={pathname} ref={pageRef}>
          {children}
        </div>
      </main>

      {/* Floating mobile nav */}
      <nav
        ref={mobileNavRef}
        data-tour-mobile-nav
        aria-label="Primary mobile"
        className={cn(
          "fixed inset-x-0 top-0 z-40 h-[100dvh] items-end justify-center px-5 pb-[calc(1rem+max(0px,env(safe-area-inset-bottom)))]",
          isExamFlow ? "hidden" : "flex min-[1025px]:hidden",
          "pointer-events-none",
        )}
      >
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-[var(--blackgreen-90)] backdrop-blur-2xl px-2 py-1.5 shadow-[0_8px_32px_var(--black-50)] pointer-events-auto max-[359px]:gap-0.5 max-[359px]:px-1.5">
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary/15 text-primary px-4 py-2.5 gap-2 max-[359px]:px-3 max-[359px]:gap-1.5"
                    : "text-muted-foreground/50 hover:text-muted-foreground px-3 py-2.5 max-[359px]:px-2.5",
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.4 : 1.8} />
                {active && (
                  <span className="text-[11px] font-bold tracking-wide max-[319px]:hidden">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      <Walkthrough />
      <RatePrompt />
      <Toaster />
    </div>
  );
}
