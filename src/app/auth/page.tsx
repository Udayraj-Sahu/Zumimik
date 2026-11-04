"use client";

import { useEffect, useRef, useState } from "react";
import { CYAN, EMERALD_12, GLASS_05, GLASS_BORDER, RED_SOFT_12 } from "@/lib/theme";
import gsap from "gsap";
import {
  Check,
  Copy,
  Lock,
  MonitorSmartphone,
  Smartphone,
  QrCode,
  Loader2,
  RefreshCw,
  Timer,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import {
  useCreatePairingSession,
  usePollPairingStatus,
} from "@/hooks/queries/use-pairing";
import type { PairingStatus } from "@/lib/types/pairing";
import { ZuzumikMark } from "@/components/brand/zuzumik-mark";
import { ZuzumikWordmark } from "@/components/brand/zuzumik-wordmark";
import { QRCodeSVG } from "qrcode.react";
import { IS_MOCK } from "@/lib/platform";

const ACCENT = "var(--primary)";
const POLL_INTERVAL_MS = 2500;

function countdownTo(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const secs = Math.max(0, Math.floor(diff / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AuthPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setToken = useAuthStore((s) => s.setToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  const createSession = useCreatePairingSession();
  const pollStatus = usePollPairingStatus();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [pollToken, setPollToken] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [status, setStatus] = useState<PairingStatus>("pending");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [alreadyApproved, setAlreadyApproved] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSessionRef = useRef<string | null>(null);

  const bootstrapped = useRef(false);

  useEffect(() => {
    if (isAuthenticated) return;
    const tl = gsap.fromTo(
      document.getElementById("auth-root"),
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
    );
    return () => { tl.kill(); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  // Create a new pairing session on mount (or when retrying)
  const boot = useRef<(() => void) | null>(null);
  boot.current = () => {
    setCreateError(null);
    setAlreadyApproved(false);
    createSession.mutate(undefined, {
      onSuccess: (session) => {
        setSessionId(session.sessionId);
        setCode(session.code);
        setSignature(session.signature ?? "");
        setPollToken(session.pollToken ?? "");
        setCreatedAt(session.createdAt);
        setStatus(session.status);
        setExpiresAt(session.expiresAt);
        setNow(Date.now());
      },
      onError: () => setCreateError("Could not start a pairing session. Please try again."),
    });
  };

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    boot.current?.();
  }, []);

  // Countdown ticker
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll the session until approved or expired
  useEffect(() => {
    if (!sessionId) return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    activeSessionRef.current = sessionId;

    const tick = async () => {
      const polledSession = activeSessionRef.current;
      if (!polledSession) return;
      try {
        const session = await pollStatus.mutateAsync(IS_MOCK
          ? polledSession
          : { code: polledSession, pollToken, createdAt, expiresAt });
        if (activeSessionRef.current !== polledSession) return;
        setStatus(session.status);
        setExpiresAt(session.expiresAt);
        if (session.status === "approved") {
          if (session.token) setToken(session.token);
          if (session.refreshToken) setRefreshToken(session.refreshToken);
          if (session.user) setUser(session.user);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setAlreadyApproved(true);
        } else if (session.status === "expired") {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        // transient poll error — keep polling
      }
    };
    tick();
    pollingRef.current = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      activeSessionRef.current = null;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, pollToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const expired = status === "expired" || (!!expiresAt && new Date(expiresAt).getTime() - Date.now() <= 0);
  const showScannerHint = status !== "approved" && !expired && !createError;
  const qrPayload = signature ? JSON.stringify({ code, sig: signature }) : code;

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main id="auth-root" className="relative flex min-h-dvh items-center justify-center bg-background overflow-hidden px-6" style={{ opacity: 0 }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-[0.07]" style={{ background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full opacity-[0.04]" style={{ background: `radial-gradient(circle, ${CYAN} 0%, transparent 70%)` }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <ZuzumikMark className="size-11" />
          <div className="text-center">
            <h1 className="flex justify-center text-foreground">
              <ZuzumikWordmark className="h-[24px] w-auto" />
            </h1>
            <span className="text-[9px] font-bold tracking-[0.3em] text-primary/60">WEB LOGIN</span>
          </div>
        </div>

        <div className="rounded-3xl border backdrop-blur-xl p-6" style={{ borderColor: GLASS_BORDER, background: "linear-gradient(180deg, var(--glass-bg), var(--glass-01))" }}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl grid place-items-center" style={{ background: `${ACCENT}1A` }}>
              <MonitorSmartphone size={18} style={{ color: ACCENT }} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground leading-tight">Link with the app</p>
              <p className="text-[10.5px] text-muted-foreground/45 font-normal">Use your phone to scan &amp; sign in</p>
            </div>
          </div>

          {createError ? (
            <div className="mt-5 flex flex-col items-center justify-center py-6 text-center">
              <p className="text-[13px] font-bold text-foreground">Could not start session</p>
              <p className="mt-1 text-[11px] text-muted-foreground/45 font-normal">{createError}</p>
              <button
                type="button"
                onClick={() => boot.current?.()}
                className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold text-[var(--bg)] transition-all active:scale-95"
                style={{ background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))` }}
              >
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          ) : !showScannerHint && (status === "approved" || alreadyApproved) ? (
            <div className="mt-5 flex flex-col items-center justify-center py-6 text-center">
              <div className="grid size-14 place-items-center rounded-2xl" style={{ background: EMERALD_12 }}>
                <Check size={24} className="text-[var(--emerald)]" />
              </div>
              <p className="mt-3 text-[15px] font-bold text-foreground leading-tight">Linked successfully</p>
              <p className="mt-1 text-[11px] text-muted-foreground/45 font-normal">Redirecting to your dashboard…</p>
            </div>
          ) : expired ? (
            <div className="mt-5 flex flex-col items-center justify-center py-6 text-center">
              <div className="grid size-14 place-items-center rounded-2xl" style={{ background: RED_SOFT_12 }}>
                <Timer size={24} className="text-[var(--red-soft)]" />
              </div>
              <p className="mt-3 text-[15px] font-bold text-foreground leading-tight">Code expired</p>
              <p className="mt-1 text-[11px] text-muted-foreground/45 font-normal">This pairing code is no longer valid.</p>
              <button
                type="button"
                onClick={() => boot.current?.()}
                className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold text-[var(--bg)] transition-all active:scale-95"
                style={{ background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))` }}
              >
                <RefreshCw size={13} /> Generate new code
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 flex justify-center">
                <div className="relative">
                  <div className="rounded-2xl bg-white p-3">
                    <QRCodeSVG value={qrPayload || "PENDING"} size={180} level="M" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: "0 0 30px var(--accent-25) inset" }} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button type="button" onClick={handleCopy} disabled={!code} className="pill flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-foreground/70 transition-all hover:bg-[var(--glass-07)] active:scale-95 disabled:opacity-50">
                  {copied ? <Check size={13} className="text-[var(--emerald)]" /> : <Copy size={13} />}
                  {copied ? "Pairing data copied" : code ? `Code: ${code}` : "Generating code…"}
                </button>
              </div>

              <ol className="mt-5 space-y-3">
                {[
                  { icon: Smartphone, text: "Open Zuzumik on your phone" },
                  { icon: QrCode, text: "Tap “Scan to login on web” on your device" },
                  { icon: Check, text: "Confirm the pairing to continue" },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <div className="grid size-7 place-items-center rounded-lg" style={{ background: GLASS_05 }}>
                        <Icon size={13} className="text-foreground/60" />
                      </div>
                      <span className="flex-1 text-[12px] text-muted-foreground/70 font-medium">{s.text}</span>
                      {i === 0 && status === "scanned" && (
                        <span className="flex items-center gap-1 text-micro font-bold text-[var(--emerald)]">
                          <Loader2 size={11} className="animate-spin" /> Device detected
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {showScannerHint && (
            <div className="mt-5 flex items-center justify-center gap-2 text-micro text-muted-foreground/40">
              <Timer size={11} />
              Code expires in {expiresAt ? countdownTo(expiresAt) : "--:--"}
            </div>
          )}

          {showScannerHint && status === "pending" && (
            <button
              type="button"
              onClick={() => boot.current?.()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[12px] font-bold tracking-[0.02em] text-[var(--bg)] transition-all active:scale-95"
              style={{ background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))` }}
            >
              <RefreshCw size={15} /> New code
            </button>
          )}

          <div className="mt-4 flex items-center justify-center gap-1.5 text-micro text-muted-foreground/60">
            <Lock size={11} />
            End-to-end secured pairing · session expires in ~2 min
          </div>
        </div>

        <p className="mt-5 text-center text-[10.5px] text-muted-foreground/60 leading-relaxed">
          Scan the QR or paste its signed pairing data on your phone to link this browser.<br />
          <span className="text-muted-foreground/40">In preview, the flow is simulated end-to-end.</span>
        </p>
      </div>
    </main>
  );
}
