"use client";

import { useEffect, useRef, useState } from "react";
import { CYAN, LIME_BRIGHT, PURPLE, YELLOW } from "@/lib/theme";
import gsap from "gsap";
import { Globe, Mail, Smartphone, Zap, Target, Trophy } from "lucide-react";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { useAuthStore } from "@/stores/auth-store";
import { useWelcomeStore } from "@/stores/welcome-store";
import { useRouter } from "next/navigation";
import { ZuzumikWordmark } from "@/components/brand/zuzumik-wordmark";
import { AuthModal } from "@/components/auth/auth-modal";
import { IS_MOCK } from "@/lib/platform";

const FEATURES = [
  { icon: Zap, label: "Speed Drills", color: LIME_BRIGHT },
  { icon: Target, label: "Smart Sprints", color: CYAN },
  { icon: Trophy, label: "Live Rankings", color: YELLOW },
];

export default function OnboardingPage() {
  const authLogin = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      brandRef.current,
      { opacity: 0, y: -20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3 },
    )
      .fromTo(
        taglineRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.25 },
        "-=0.2",
      )
      .fromTo(
        featuresRef.current?.children ? Array.from(featuresRef.current.children) : [],
        { opacity: 0, y: 20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, stagger: 0.05 },
        "-=0.15",
      )
      .fromTo(
        buttonsRef.current?.children ? Array.from(buttonsRef.current.children) : [],
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.2, stagger: 0.04 },
        "-=0.1",
      )
      .fromTo(
        footerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2 },
        "-=0.1",
      );

    return () => { tl.kill(); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const handleLogin = (method: "google" | "phone") => {
    if (!IS_MOCK) {
      setShowAuth(true);
      return;
    }

    const name = method === "google" ? "Google User" : "Phone User";

    gsap.to(buttonsRef.current, {
      opacity: 0,
      y: 10,
      duration: 0.2,
      ease: "power2.in",
      onComplete: async () => {
        await authLogin(`${name}@exam.com`, "mock-password");
        useWelcomeStore.getState().requestOnSignup();
        router.replace("/dashboard");
      },
    });
  };

  return (
    <main className="relative flex h-dvh flex-col items-center justify-between bg-background overflow-hidden max-w-5xl mx-auto">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle, ${LIME_BRIGHT} 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full opacity-[0.04]"
          style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full opacity-[0.04]"
          style={{ background: `radial-gradient(circle, ${PURPLE} 0%, transparent 70%)` }}
        />
      </div>

      {/* Hero */}
      <div ref={heroRef} className="relative flex flex-1 flex-col items-center justify-center px-6 max-[359px]:px-4 w-full">
        {/* Brand */}
        <div ref={brandRef} className="flex flex-col items-center gap-4 mb-8 max-[359px]:gap-3 max-[359px]:mb-6">
          <div className="relative">
            <ZuzumikMark className="size-16" />
            <div className="absolute -inset-2 rounded-3xl bg-primary/5 blur-xl" />
          </div>
          <div className="text-center">
            <h1 className="flex justify-center text-foreground">
              <ZuzumikWordmark className="h-[34px] w-auto md:h-[40px]" />
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <div className="h-px w-6 bg-primary/30" />
              <span className="text-micro font-bold tracking-[0.3em] text-primary/60">
                ARENA OF CHAMPIONS
              </span>
              <div className="h-px w-6 bg-primary/30" />
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div ref={taglineRef} className="text-center mb-10 max-[359px]:mb-8 max-w-xs md:max-w-md">
          <p className="text-sm leading-relaxed text-muted-foreground/70">
            Not a coaching app.
            <br />
            <span className="text-foreground/90 font-semibold">
              A competitive battlefield
            </span>{" "}
            where India&apos;s sharpest minds fight, rank, and rise.
          </p>
        </div>

        {/* Feature pills */}
        <div ref={featuresRef} className="flex flex-wrap items-center justify-center gap-3 mb-12 max-[359px]:gap-2 max-[359px]:mb-10">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-full border border-border/40 bg-card/60 backdrop-blur-sm px-3.5 py-2 max-[359px]:gap-1.5 max-[359px]:px-3 max-[359px]:py-1.5"
              >
                <Icon size={13} style={{ color: f.color }} />
                <span className="text-[11px] font-semibold text-muted-foreground/70">
                  {f.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Auth buttons */}
        <div
          ref={buttonsRef}
          className="flex flex-col gap-3 w-full max-w-xs md:flex-row md:max-w-lg md:gap-4 max-[359px]:gap-2.5"
        >
          <button
            type="button"
            onClick={() => handleLogin("google")}
            className="group flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 text-sm font-bold text-foreground outline-none transition-all hover:border-primary/30 hover:bg-accent/30 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring md:flex-1 max-[359px]:gap-2.5 max-[359px]:px-4 max-[359px]:py-3.5"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-white/10 group-hover:bg-white/15 transition-colors">
              {IS_MOCK ? <Globe size={16} className="text-foreground/80" /> : <Mail size={16} className="text-foreground/80" />}
            </span>
            {IS_MOCK ? "Continue with Google" : "Continue with email"}
          </button>
          {IS_MOCK && (
            <button
              type="button"
              onClick={() => handleLogin("phone")}
              className="group flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 text-sm font-bold text-foreground outline-none transition-all hover:border-primary/30 hover:bg-accent/30 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring md:flex-1 max-[359px]:gap-2.5 max-[359px]:px-4 max-[359px]:py-3.5"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-white/10 group-hover:bg-white/15 transition-colors">
                <Smartphone size={16} className="text-foreground/80" />
              </span>
              Continue with Phone
            </button>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Footer */}
      <div ref={footerRef} className="relative pb-8 max-[359px]:pb-6 max-[359px]:pt-3 pt-4 text-center px-6 max-[359px]:px-4">
        <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
          By continuing, you agree to our{" "}
          <span className="text-muted-foreground/60 font-medium">Terms of Service</span>
          {" & "}
          <span className="text-muted-foreground/60 font-medium">Privacy Policy</span>
        </p>
      </div>
    </main>
  );
}
