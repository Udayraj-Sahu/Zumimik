"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Dialog } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Share2, KeyRound, QrCode, Copy, Check, X } from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useReferralStore } from "@/stores/referral-store";
import { useReferralStatus } from "@/hooks/queries/use-referral";
import { useFeatureFlags } from "@/hooks/queries/use-feature-flags";
import { isFeatureOff } from "@/services/flags";
import { IS_MOCK } from "@/lib/platform";

const REWARD_XP = 50;

export function InviteCard() {
  const firstName = useOnboardingStore((s) => s.firstName);
  const local = useReferralStore();
  const { invitesSent, ensureCode, markInvited } = local;
  // Real mode: the code and the joined count are the SERVER's (GET /referral). A locally generated code was never issued by the
  // backend and would not redeem. While it loads, or if the feature is off, no code is shown rather than an invented one.
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  // GET /api/config says whether the referral ladder is on. When it is definitely off, say so (a bare 404 is indistinguishable from a bug).
  const referralOff = !IS_MOCK && isFeatureOff(flags, "referral_ladder");
  // Wait for the flag list to settle (loaded or failed) so a feature that is off never gets a pointless request.
  const { data: server } = useReferralStatus({ enabled: !flagsLoading && !referralOff });
  const code = IS_MOCK ? local.code : (server?.code ?? null);
  const friendsJoined = IS_MOCK ? local.friendsJoined : (server?.verifiedReferrals ?? 0);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (IS_MOCK) ensureCode(firstName); // development-only local code
  }, [firstName, ensureCode]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareText = `Join me on Zuzumik — use my invite code ${code} to get started.`;
  const inviteLink = code ? `${origin || ""}/?ref=${code}` : "";
  const earnedXp = friendsJoined * REWARD_XP;

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      markInvited();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (!code) return;
    let shared = false;
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: "Zuzumik invite", text: shareText, dialogTitle: "Invite friends" });
        shared = true;
      } else if (navigator.share) {
        await navigator.share({ title: "Zuzumik invite", text: shareText });
        shared = true;
      }
    } catch {
      shared = false;
    }
    if (shared) markInvited();
    else handleCopy();
  };

  return (
    <GlassCard className="h-full p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-05)] text-primary">
          <Share2 size={17} />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
            style={{ boxShadow: "0 0 8px var(--accent-50)" }}
          />
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Invite friends &amp; family
          </h3>
        </div>

        <span className="shrink-0 rounded-full bg-[var(--accent-10)] px-3 py-1.5 font-mono text-[11px] font-bold tracking-wide text-[var(--primary)] ring-1 ring-[var(--accent-20)]">
          +{REWARD_XP} XP
        </span>
      </div>

      {/* Invite code panel */}
      <div className="mt-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-02)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <KeyRound size={15} className="text-primary" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
              Invite Code
            </span>
          </div>
          <span className="rounded-md bg-[var(--accent-10)] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
            {referralOff ? "Not enabled" : "Active"}
          </span>
        </div>
        {referralOff && (
          <p data-testid="referral-off" role="status" className="mt-2 text-[11px] text-muted-foreground/60">
            Referrals aren&apos;t enabled for your account yet.
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 min-w-0 flex-1 items-center justify-between rounded-full border border-[var(--glass-border)] bg-[var(--glass-05)] px-4">
            <span className="truncate select-all font-mono text-[13px] font-bold tracking-wider text-foreground">
              {code ?? "——————"}
            </span>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="Show invite QR code"
              className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-primary active:scale-90"
            >
              <QrCode size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex h-12 items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-05)] px-5 font-mono text-[12px] font-bold uppercase tracking-wider text-foreground transition-all hover:bg-[var(--glass-07)] active:scale-95"
          >
            {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} className="text-primary" />}
            <span>{copied ? "Done" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Invites" value={`${invitesSent}`} valueClass="text-foreground" />
        <Stat label="Joined" value={`${friendsJoined}`} valueClass="text-[var(--primary)]" />
        <Stat label="Earned" value={`${earnedXp} XP`} valueClass="text-primary" />
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleShare}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2.5 rounded-full font-mono text-[13px] font-bold uppercase tracking-wide text-[var(--on-accent)] transition-all active:scale-[0.98]"
        style={{
          background: `linear-gradient(90deg, var(--cta-from), var(--cta-to))`,
          boxShadow: "0 0 24px var(--accent-30)",
        }}
      >
        <Share2 size={18} />
        Share invite link
      </button>

      <p className="mt-3 px-1 text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
        Your friend gets a head start with {REWARD_XP} bonus XP when they sign up.
      </p>

      {/* QR popup */}
      <Dialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        placement="center"
        className="max-w-[330px] border-[var(--glass-border)] bg-[var(--glass-02)]"
        ariaLabel="Invite QR code"
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <QrCode size={15} className="text-primary" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
                Scan to invite
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              aria-label="Close QR code"
              className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-foreground active:scale-90"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl bg-white p-3" style={{ boxShadow: "0 0 30px var(--accent-15)" }}>
              {inviteLink && (
                <QRCodeSVG value={inviteLink} size={196} level="M" marginSize={0} />
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="select-all font-mono text-[15px] font-bold tracking-[0.18em] text-foreground">
              {code ?? "——————"}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy invite code"
              className="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-[var(--glass-07)] hover:text-primary active:scale-90"
            >
              {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} />}
            </button>
          </div>

          <p className="mt-3 text-center font-mono text-[10.5px] leading-relaxed text-muted-foreground">
            Point your friend&apos;s camera at the code — or share the {REWARD_XP} XP invite.
          </p>
        </div>
      </Dialog>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-02)] px-1 py-3.5">
      <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className={`mt-1.5 font-mono text-[12px] font-bold uppercase ${valueClass}`}>{value}</span>
    </div>
  );
}
