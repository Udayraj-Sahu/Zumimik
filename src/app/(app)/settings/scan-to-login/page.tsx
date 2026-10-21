"use client";
import { PageContainer } from "@/components/ui/page-container";
import { EMERALD, EMERALD_12, EMERALD_SOLID, GLASS_BORDER, RED_SOFT_12 } from "@/lib/theme";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  X,
  QrCode,
  ShieldCheck,
  Loader2,
  MonitorSmartphone,
  Globe,
  AlertTriangle,
  Smartphone,
} from "lucide-react";
import { useScanPairingCode, useApprovePairing } from "@/hooks/queries/use-pairing";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { cn } from "@/lib/utils";

const STEP_ICON = { phone: Smartphone, web: Globe, check: Check };

export default function ScanToLoginPage() {
  usePageMeta("Scan to Login — Zuzumik");
  const router = useRouter();
  const scan = useScanPairingCode();
  const approve = useApprovePairing();
  const { animateSection } = useEntranceAnimations();

  const [entered, setEntered] = useState("");
  const [step, setStep] = useState<"code" | "scanned" | "approved" | "error">("code");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayCode = entered;

  const handleCodeChange = (raw: string) => {
    setEntered(raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
  };

  const dirty = displayCode.length !== 8;

  const handleScan = async () => {
    if (dirty) return;
    setErrorMsg(null);
    try {
      const ok = await scan.mutateAsync(displayCode);
      if (!ok) {
        setStep("error");
        setErrorMsg("Code not found or already used. Check the code on your screen and try again.");
        return;
      }
      setStep("scanned");
    } catch {
      setStep("error");
      setErrorMsg("Code not found or already used. Check the code on your screen and try again.");
    }
  };

  const handleApprove = async () => {
    setErrorMsg(null);
    try {
      await approve.mutateAsync(displayCode);
      setStep("approved");
    } catch {
      setStep("error");
      setErrorMsg("Could not approve pairing. The code may have expired.");
    }
  };

  const handleCancel = () => {
    setStep("code");
    setEntered("");
    setErrorMsg(null);
  };

  const isBusy = scan.isPending || approve.isPending;

  return (
    <PageContainer>
      <div className="mx-auto w-full md:max-w-2xl">
      <div ref={animateSection} className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <QrCode size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">SCAN TO LOGIN</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal">
            Open a browser at <span className="text-foreground/60">zuzumik.app</span>
          </p>
        </div>

        <div className="mt-6 rounded-3xl border backdrop-blur-xl p-6 max-[359px]:p-4" style={{ borderColor: GLASS_BORDER, background: "linear-gradient(180deg, var(--glass-bg), var(--glass-01))" }}>
          {step === "code" && (
            <>
              <div className="flex items-center gap-3 max-[359px]:gap-2">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10">
                  <MonitorSmartphone size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-foreground leading-tight">Enter the pairing code</p>
                  <p className="text-[10.5px] text-muted-foreground/45 font-normal">Shown on the web screen with the QR</p>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-micro font-semibold tracking-[0.14em] text-muted-foreground/40 uppercase whitespace-nowrap">8-digit code</label>
                <input
                  value={displayCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="E.g. 7K2M9QD"
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-center text-[22px] font-extrabold tracking-[0.3em] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 max-[359px]:px-3 max-[359px]:py-3"
                />
              </div>

              {errorMsg && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive max-[359px]:gap-1.5 max-[359px]:p-2.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleScan}
                disabled={dirty || isBusy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[12px] font-bold tracking-[0.02em] text-[var(--on-accent)] transition-all active:scale-95 disabled:opacity-40 max-[359px]:gap-1.5 max-[359px]:py-3 whitespace-nowrap"
                style={{ background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))` }}
              >
                {scan.isPending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                {scan.isPending ? "Checking code…" : "Continue"}
              </button>
            </>
          )}

          {step === "scanned" && (
            <>
              <div className="flex flex-col items-center py-4 text-center">
                <div className="grid size-14 place-items-center rounded-2xl" style={{ background: EMERALD_12 }}>
                  <Loader2 size={24} className="animate-spin text-[var(--emerald)]" />
                </div>
                <p className="mt-3 text-[16px] font-bold text-foreground leading-tight">Code found</p>
                <p className="mt-1 text-[11px] text-muted-foreground/45 font-normal">
                  Confirm that you&apos;re signing in on <span className="text-foreground/70">Google Chrome · Windows</span>
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 max-[359px]:gap-2 max-[359px]:p-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-white/[0.06]">
                  <Globe size={16} className="text-foreground/60" />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-foreground">Chrome on Windows</p>
                  <p className="text-micro text-muted-foreground/40">
                    <span className="inline-flex items-center gap-1 text-[var(--emerald)]"><ShieldCheck size={9} /> Secured device</span> · Mumbai, IN
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive max-[359px]:gap-1.5 max-[359px]:p-2.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleApprove}
                disabled={isBusy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[12px] font-bold tracking-[0.02em] text-[var(--on-accent)] transition-all active:scale-95 disabled:opacity-40 max-[359px]:gap-1.5 max-[359px]:py-3 whitespace-nowrap"
                style={{ background: `linear-gradient(90deg, ${EMERALD}, ${EMERALD_SOLID})` }}
              >
                {approve.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {approve.isPending ? "Linking…" : "Confirm login"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isBusy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] py-3 text-[12px] font-bold text-foreground/70 transition-all hover:bg-white/[0.06] active:scale-95 disabled:opacity-40 max-[359px]:gap-1.5 whitespace-nowrap"
              >
                <X size={14} /> Cancel
              </button>
            </>
          )}

          {step === "approved" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid size-14 place-items-center rounded-2xl" style={{ background: EMERALD_12 }}>
                <Check size={24} className="text-[var(--emerald)]" />
              </div>
              <p className="mt-3 text-[16px] font-bold text-foreground leading-tight">Device linked</p>
              <p className="mt-1 text-[11px] text-muted-foreground/45 font-normal">
                The browser is now signed in to your account.
              </p>
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[12px] font-bold tracking-[0.02em] text-[var(--on-accent)] transition-all active:scale-95 max-[359px]:gap-1.5 max-[359px]:py-3 whitespace-nowrap"
                style={{ background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))` }}
              >
                Done <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid size-14 place-items-center rounded-2xl" style={{ background: RED_SOFT_12 }}>
                <AlertTriangle size={24} className="text-[var(--red-soft)]" />
              </div>
              <p className="mt-3 text-[15px] font-bold text-foreground leading-tight">Link failed</p>
              <p className="mt-1 text-[11px] text-muted-foreground/45 font-normal">{errorMsg ?? "Something went wrong."}</p>
              <button
                type="button"
                onClick={handleCancel}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[12px] font-bold tracking-[0.02em] text-[var(--on-accent)] transition-all active:scale-95 max-[359px]:gap-1.5 max-[359px]:py-3 whitespace-nowrap"
                style={{ background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))` }}
              >
                Try again <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="mt-6 flex items-center justify-center gap-2 max-[359px]:gap-1.5">
          {(["phone", "web", "check"] as const).map((k, i) => {
            const Icon = STEP_ICON[k];
            const active = step === "approved" ? i <= 2 : i === 0;
            return (
              <div key={k} className="flex items-center gap-2 max-[359px]:gap-1.5">
                {i > 0 && <div className="h-px w-6 bg-white/[0.08]" />}
                <div
                  className={cn(
                    "grid size-7 place-items-center rounded-full border",
                    active ? "border-primary/40 bg-primary/10 text-primary" : "border-white/[0.06] bg-white/[0.03] text-muted-foreground/30",
                  )}
                >
                  <Icon size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </PageContainer>
  );
}
