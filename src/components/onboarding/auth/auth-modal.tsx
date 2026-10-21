"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { AuthPanel } from "./auth-panel";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useRouter } from "next/navigation";

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
  const authLoginWithFirebase = useAuthStore((s) => s.loginWithFirebase);

  useEffect(() => {
    if (overlayRef.current && dialogRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
      gsap.fromTo(dialogRef.current, { opacity: 0, scale: 0.95, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "power2.out" });
    }
    closeBtnRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  const handleAuthSuccess = async (data: {
    name?: string;
    phone?: string;
    idToken?: string;
    authMethod: "google" | "phone";
  }) => {
    setAuthData(data);
    if (data.idToken) {
      await authLoginWithFirebase(data.idToken, data.authMethod);
    } else {
      await authLogin(data.phone ?? `${data.name ?? "User"}@google.com`, "mock-password");
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
            <span id="auth-modal-title" className="text-fluid-sm font-bold tracking-wider text-foreground">ZUZUMIK</span>
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
