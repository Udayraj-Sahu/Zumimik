"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { Globe, Smartphone, Mail, ArrowRight, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFirebaseConfigured, getFirebaseAuth, getFirebaseGoogleProvider } from "@/lib/firebase/client";

import { IS_MOCK } from "@/lib/platform";

export type AuthSuccessData =
  | {
      authMethod: "email";
      email: string;
      password: string;
      displayName?: string;
      intent: "login" | "register";
    }
  | { name?: string; phone?: string; idToken?: string; authMethod: "google" | "phone" };

type AuthPanelProps = {
  onAuthSuccess: (data: AuthSuccessData) => void | Promise<void>;
  onPauseAutoSlide?: () => void;
  onResumeAutoSlide?: () => void;
};

export function AuthPanel({ onAuthSuccess, onPauseAutoSlide, onResumeAutoSlide }: AuthPanelProps) {
  const [mode, setMode] = useState<"select" | "email" | "phone-input" | "otp" | "verifying">("select");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailIntent, setEmailIntent] = useState<"login" | "register">("login");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<{ type: string; verify: () => Promise<string>; clear: () => void } | null>(null);
  const confirmationResultRef = useRef<{ confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> } | null>(null);

  const firebaseAvailable = !IS_MOCK && isFirebaseConfigured();

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const initFirebase = useCallback(async () => {
    const auth = await getFirebaseAuth();
    const provider = await getFirebaseGoogleProvider();
    return { auth, provider };
  }, []);

  const initRecaptcha = useCallback(async () => {
    if (recaptchaVerifierRef.current) return;
    if (!recaptchaContainerRef.current) return;
    const auth = await getFirebaseAuth();
    const { RecaptchaVerifier } = await import("firebase/auth");
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: "invisible",
    });
  }, []);

  const enterOtp = async () => {
    if (phone.replace(/\D/g, "").length < 10) return;
    setError(null);
    if (!IS_MOCK && !firebaseAvailable) {
      setError("Phone sign-in is not configured. Sign in with email and password instead.");
      return;
    }
    pauseRef.current = true;
    onPauseAutoSlide?.();

    if (firebaseAvailable) {
      setIsLoading(true);
      try {
        await initRecaptcha();
        const auth = await getFirebaseAuth();
        const { signInWithPhoneNumber } = await import("firebase/auth");
        const formattedPhone = `+91${phone.replace(/\D/g, "")}`;
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current!);
        confirmationResultRef.current = confirmation;
        setMode("otp");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to send OTP";
        setError(msg);
        onResumeAutoSlide?.();
        pauseRef.current = false;
      } finally {
        setIsLoading(false);
      }
    } else {
      setMode("otp");
    }
  };

  const exitOtp = () => {
    pauseRef.current = false;
    onResumeAutoSlide?.();
    setMode("phone-input");
    setOtp(["", "", "", "", "", ""]);
    setError(null);
  };

  const handleGoogle = async () => {
    setError(null);
    if (!IS_MOCK && !firebaseAvailable) {
      setError("Google sign-in is not configured. Sign in with email and password instead.");
      return;
    }
    if (firebaseAvailable) {
      setIsLoading(true);
      try {
        const { auth, provider } = await initFirebase();
        const { signInWithPopup } = await import("firebase/auth");
        const result = await signInWithPopup(auth, provider);
        const idToken = await result.user.getIdToken();
        await onAuthSuccess({
          name: result.user.displayName || "Google User",
          idToken,
          authMethod: "google",
        });
      } catch (err: unknown) {
        if (err instanceof Error && "code" in err) {
          const firebaseErr = err as { code: string };
          if (firebaseErr.code === "auth/popup-closed-by-user") {
            return;
          }
        }
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        await onAuthSuccess({ name: "Google User", authMethod: "google" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      }
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onAuthSuccess({
        authMethod: "email",
        email: email.trim(),
        password,
        ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        intent: emailIntent,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = async (val: string, i: number) => {
    setError(null);
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
    const full = next.every((d) => d !== "");
    if (full) {
      if (firebaseAvailable && confirmationResultRef.current) {
        setMode("verifying");
        setIsLoading(true);
        try {
          const otpString = next.join("");
          const result = await confirmationResultRef.current.confirm(otpString);
          const idToken = await result.user.getIdToken();
          await onAuthSuccess({ phone, idToken, authMethod: "phone" });
        } catch (err: unknown) {
          setOtp(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
          setMode("otp");
          if (err instanceof Error && "code" in err) {
            const firebaseErr = err as { code: string };
            if (firebaseErr.code === "auth/invalid-verification-code") {
              setError("Incorrect OTP. Try again.");
            } else if (firebaseErr.code === "auth/code-expired") {
              setError("OTP expired. Request a new one.");
            } else {
              setError(err instanceof Error ? err.message : "Verification failed");
            }
          } else {
            setError("Verification failed. Try again.");
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setMode("verifying");
        setTimeout(() => {
          Promise.resolve(onAuthSuccess({ phone, authMethod: "phone" })).catch((err) => {
            setError(err instanceof Error ? err.message : "Phone sign-in failed");
            setMode("otp");
          });
        }, 1000);
      }
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    if (firebaseAvailable) {
      setIsLoading(true);
      try {
        await initRecaptcha();
        const auth = await getFirebaseAuth();
        const { signInWithPhoneNumber } = await import("firebase/auth");
        const formattedPhone = `+91${phone.replace(/\D/g, "")}`;
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current!);
        confirmationResultRef.current = confirmation;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to resend OTP");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const phoneDigits = phone.replace(/\D/g, "");

  return (
    <div ref={contentRef} className="flex flex-col items-center gap-5">
      <div ref={recaptchaContainerRef} />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 w-full rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-fluid-xs text-red-600"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 outline-none min-h-[44px] min-w-[44px] grid place-items-center"
            aria-label="Dismiss error"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}

      {mode === "select" && (
        <>
          {!IS_MOCK && !firebaseAvailable && (
            <p role="status" className="text-center text-fluid-xs text-muted-foreground/70">
              Google and phone sign-in are not configured for this backend. Use email and password.
            </p>
          )}
          <button
            data-step-el
            type="button"
            onClick={handleGoogle}
            disabled={isLoading || (!IS_MOCK && !firebaseAvailable)}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-fluid-base font-semibold text-foreground outline-none transition-all hover:border-primary/40 hover:bg-accent/40 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <Globe size={20} className="text-muted-foreground" aria-hidden="true" />
            )}
            {isLoading ? "Signing in..." : "Continue with Google"}
          </button>
          <div className="flex w-full items-center gap-3 text-fluid-xs text-muted-foreground/40">
            <span className="flex-1 h-px bg-border" />
            <span>or</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <button
            data-step-el
            type="button"
            onClick={() => {
              setError(null);
              setMode("phone-input");
            }}
            disabled={isLoading || (!IS_MOCK && !firebaseAvailable)}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-fluid-base font-semibold text-foreground outline-none transition-all hover:border-primary/40 hover:bg-accent/40 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
            <Smartphone size={20} className="text-muted-foreground" aria-hidden="true" />
            Continue with Phone Number
          </button>
          <button
            data-step-el
            type="button"
            onClick={() => {
              setError(null);
              setEmailIntent("login");
              setMode("email");
            }}
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-fluid-base font-semibold text-foreground outline-none transition-all hover:border-primary/40 hover:bg-accent/40 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
          >
            <Mail size={20} className="text-muted-foreground" aria-hidden="true" />
            Continue with email
          </button>
        </>
      )}

      {mode === "email" && (
        <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-3">
          <p data-step-el className="text-fluid-sm font-semibold text-foreground/80">
            {emailIntent === "login" ? "Sign in with email" : "Create your account"}
          </p>
          {emailIntent === "register" && (
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name (optional)"
              autoComplete="name"
              className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-fluid-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-fluid-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoComplete={emailIntent === "login" ? "current-password" : "new-password"}
            minLength={emailIntent === "register" ? 8 : undefined}
            required
            className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-fluid-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            data-step-el
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-fluid-sm font-bold uppercase tracking-widest text-primary-foreground outline-none transition-all hover:opacity-90 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={16} />}
            {isLoading ? "Please wait..." : emailIntent === "login" ? "Sign in" : "Create account"}
          </button>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("select");
              }}
              className="min-h-[44px] px-2 text-fluid-xs text-muted-foreground/70 underline underline-offset-2 hover:text-foreground"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setEmailIntent((intent) => (intent === "login" ? "register" : "login"));
              }}
              className="min-h-[44px] px-2 text-fluid-xs text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {emailIntent === "login" ? "Create account" : "Already registered? Sign in"}
            </button>
          </div>
        </form>
      )}

      {mode === "phone-input" && (
        <div className="w-full flex flex-col gap-4">
          <p data-step-el className="text-fluid-sm font-semibold text-foreground/80">Enter your phone number</p>
          <div data-step-el className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-xl border border-border/60 bg-card px-3 py-3 text-fluid-sm font-medium text-foreground">
              <span className="text-muted-foreground">+91</span>
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="9876543210"
              aria-label="Phone number"
              className="flex-1 rounded-xl border border-border/60 bg-card px-4 py-3 text-fluid-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <button
            data-step-el
            type="button"
            onClick={enterOtp}
            disabled={phoneDigits.length < 10 || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-fluid-sm font-bold uppercase tracking-widest text-primary-foreground outline-none transition-all hover:opacity-90 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight size={16} />
            )}
            {isLoading ? "Sending OTP..." : "Send OTP"}
          </button>
        </div>
      )}

      {mode === "otp" && (
        <div className="w-full flex flex-col gap-4">
          <p data-step-el className="text-fluid-sm text-foreground/60 text-center">
            OTP sent to <span className="font-semibold text-foreground">+91 {phone}</span>
          </p>
          <div data-step-el className="flex justify-center gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleOtpChange(e.target.value, i)}
                onKeyDown={(e) => handleOtpKeyDown(e, i)}
                aria-label={`Digit ${i + 1} of 6`}
                disabled={isLoading}
                className={cn(
                  "size-11 rounded-xl border text-center text-fluid-lg font-bold outline-none transition-all",
                  d ? "border-primary bg-primary/5 text-foreground scale-110" : "border-border/60 bg-card text-foreground",
                  isLoading && "opacity-50",
                )}
                autoFocus={i === 0}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              data-step-el
              type="button"
              onClick={exitOtp}
              disabled={isLoading}
              className="text-center text-fluid-xs text-muted-foreground/50 underline underline-offset-2 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring rounded min-h-[44px] flex items-center justify-center px-4 disabled:opacity-40"
            >
              Change phone number
            </button>
            {firebaseAvailable && (
              <button
                data-step-el
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="flex items-center gap-1 text-center text-fluid-xs text-primary underline underline-offset-2 outline-none hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring rounded min-h-[44px] px-4 disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={12} aria-hidden="true" />
                )}
                Resend
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "verifying" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={32} className="animate-spin text-primary" role="status" aria-label="Verifying OTP" />
          <p className="text-fluid-sm text-muted-foreground/60">Verifying OTP...</p>
        </div>
      )}
    </div>
  );
}
