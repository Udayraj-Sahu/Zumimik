"use client";
import { useState, useLayoutEffect, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { SplashScreen } from "@/components/shell/splash-screen";
import { useAuthStore } from "@/stores/auth-store";
import { refreshProfileFromServer } from "@/services/onboarding";
import { capturePendingReferral } from "@/services/referral";
import { useWelcomeStore } from "@/stores/welcome-store";
import { isNativeRuntime } from "@/lib/native/is-native";
// The whole onboarding flow lives in a single ~3k-line module; statically
// importing it here would pull it into every route's client bundle via the
// root layout. Load it only on the unauthenticated path.
const OnboardingPage = dynamic(() => import("@/app/onboarding/page"), { ssr: false });
export function AppEntry({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "native" | "web">("loading");
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const platformRef = useRef<"native" | "web">("web");
  // Cold app open → queue the dashboard welcome (no-op if one already played
  // earlier in this same session, so it never repeats within a session).
  useEffect(() => {
    useWelcomeStore.getState().requestOnAppOpen();
  }, []);
  // Invite link (/?ref=CODE): remember the code until this visitor registers.
  useEffect(() => {
    capturePendingReferral();
  }, []);
  // Session restored from storage: refresh the profile once from /auth/me. Server values only fill what is blank locally.
  const restoredProfile = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || restoredProfile.current) return;
    restoredProfile.current = true;
    void refreshProfileFromServer({ authoritative: false }).catch(() => {});
  }, [isAuthenticated]);
  useLayoutEffect(() => {
    document.documentElement.classList.remove("loading");
    if (isAuthenticated) {
      router.prefetch("/dashboard");
    }
    try {
      if (isNativeRuntime()) {
        platformRef.current = "native";
        setState("native");
        return;
      }
    } catch {}
    let cancelled = false;
    import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (cancelled) return;
        platformRef.current = Capacitor.isNativePlatform() ? "native" : "web";
        setState(Capacitor.isNativePlatform() ? "native" : "web");
      })
      .catch(() => {
        if (!cancelled) setState("web");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, router]);
  useEffect(() => {
    if (state === "native" && isAuthenticated && pathname !== "/") {
      setState("web");
    }
  }, [state, isAuthenticated, pathname]);
  const isProtectedAppRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/play");
  useEffect(() => {
    if (state === "web" && !isAuthenticated && isProtectedAppRoute) {
      router.replace("/onboarding");
    }
  }, [state, isAuthenticated, pathname, router, isProtectedAppRoute]);
  const handleSplashComplete = useCallback(() => {
    if (useAuthStore.getState().isAuthenticated && pathname === "/") {
      router.replace("/dashboard");
      return;
    }
    setState("web");
  }, [pathname, router]);
  if (state === "loading") return <div className="fixed inset-0 bg-background" />;
  if (state === "native") return <SplashScreen onComplete={handleSplashComplete} />;
  if (!isAuthenticated) {
    if (pathname === "/" && platformRef.current === "web") return <>{children}</>;
    return <OnboardingPage />;
  }
  return <>{children}</>;
}
