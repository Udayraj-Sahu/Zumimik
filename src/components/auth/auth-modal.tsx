"use client";
import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { AuthPanel, type AuthSuccessData } from "./auth-panel";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { hydrateOnboardingFromUser, refreshProfileFromServer } from "@/services/onboarding";
import { useRouter } from "next/navigation";
import { redeemPendingReferral } from "@/services/referral";
type AuthModalProps = {
  onClose: () => void;
};
export function AuthModal({ onClose }: AuthModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const setAuthData = useOnboardingStore((s) => s.setAuthData);
  const authLogin = useAuthStore((s) => s.login);
  const authRegister = useAuthStore((s) => s.register);
  const authLoginWithFirebase = useAuthStore((s) => s.loginWithFirebase);
  useEffect(() => {
    if (overlayRef.current && dialogRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: "power2.out" },
      );
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0, scale: 0.95, y: 8 },
        { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "power2.out" },
      );
    }
    closeBtnRef.current?.focus();
  }, []);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );
  const handleAuthSuccess = async (data: AuthSuccessData) => {
    if (data.authMethod === "email") {
      if (data.intent === "register") {
        await authRegister(data.email, data.password, data.displayName);
        // A new account that arrived through an invite link (/?ref=CODE) is bound to its referrer; best effort.
        void redeemPendingReferral();
      } else {
        await authLogin(data.email, data.password);
      }
      // Prefer the backend's account name (login has no displayName); never overwrite it with the email prefix.
      const account = useAuthStore.getState().user;
      const accountName = account?.name?.trim() || data.displayName || data.email.split("@")[0];
      setAuthData({ name: accountName, email: account?.email ?? data.email, authMethod: "email" });
      const onboarding = useOnboardingStore.getState();
      if (!onboarding.firstName.trim()) onboarding.setFirstName(accountName.split(/\s+/)[0]);
      // The server is the source of truth: wait for the latest profile, then fill the onboarding form from it.
      // (The login response carries the same fields, so a failed /auth/me still hydrates from it.)
      hydrateOnboardingFromUser(useAuthStore.getState().user, { authoritative: true });
      try {
        await refreshProfileFromServer({ authoritative: true });
      } catch {}
    } else {
      setAuthData(data);
      if (data.idToken) {
        await authLoginWithFirebase(data.idToken, data.authMethod);
      } else {
        throw new Error(
          "Google and phone sign-in are not configured for this backend. Use email instead.",
        );
      }
    }
    router.push("/dashboard");
  };
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[var(--z-nav)] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={dialogRef}
        className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ZuzumikMark className="size-7" />
            <span
              id="auth-modal-title"
              className="text-fluid-sm font-bold tracking-wider text-foreground"
            >
              ZUZUMIK
            </span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-lg outline-none transition-colors hover:bg-muted active:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <AuthPanel onAuthSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
}
