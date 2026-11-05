import { apiGet, apiPost } from "./api";
import { IS_MOCK } from "@/lib/platform";

/**
 * GET /api/v1/referral (feature flag `referral_ladder`) — the learner's server-issued referral code and ladder.
 * Only the fields the app uses are typed here.
 */
export type BackendReferralStatus = {
  code: string;
  verified_referrals: number;
  by_status?: Record<string, number>;
  next_rung?: { threshold: number; name: string; remaining: number } | null;
  claimable?: { threshold: number; name: string } | null;
};

export type ReferralStatus = { code: string; verifiedReferrals: number };

export async function getReferralStatus(): Promise<ReferralStatus | null> {
  // Mock mode has no server; the local development code in the referral store is used instead.
  if (IS_MOCK) return null;
  const res = await apiGet<BackendReferralStatus>("/referral");
  return { code: res.code, verifiedReferrals: res.verified_referrals ?? 0 };
}

// ── Invite link: https://<app>/?ref=<CODE> ──────────────────────────────────────────────────────────────────────
// The backend has no invite-link route: the link is just the app URL carrying the learner's referral code. A friend who opens it
// and then REGISTERS binds the new account to the referrer with POST /api/v1/referral/redeem { code } (needs a session, so it runs
// right after sign-up; flag `referral_ladder`). It grants nothing now: the server verifies the referral later.

const PENDING_REF_KEY = "zuzumik-pending-ref";
const REF_PATTERN = /^[A-Za-z0-9]{4,16}$/; // RedeemRequest.code is 4-16 characters; the server upper-cases it

/** Remember a `?ref=` code from the landing URL until the visitor registers. Anything that is not a plausible code is ignored. */
export function capturePendingReferral(search?: string): void {
  try {
    const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
    const ref = new URLSearchParams(query).get("ref")?.trim();
    if (ref && REF_PATTERN.test(ref)) localStorage.setItem(PENDING_REF_KEY, ref.toUpperCase());
  } catch {
    /* storage unavailable: the referral is simply not remembered */
  }
}

export function readPendingReferral(): string | null {
  try {
    return localStorage.getItem(PENDING_REF_KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferral(): void {
  try {
    localStorage.removeItem(PENDING_REF_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * POST /referral/redeem { code } for the code captured from the invite link. One attempt, then the code is dropped whatever the
 * outcome, so it can never be applied to an account that did not just register. Never throws: a failed or refused redeem (unknown
 * code, 409 "cannot be accepted", feature off, offline) must not break sign-up. Returns whether the server accepted it.
 */
export async function redeemPendingReferral(): Promise<boolean> {
  const code = readPendingReferral();
  if (!code || IS_MOCK) return false;
  clearPendingReferral();
  try {
    await apiPost("/referral/redeem", { code });
    return true;
  } catch {
    return false;
  }
}
