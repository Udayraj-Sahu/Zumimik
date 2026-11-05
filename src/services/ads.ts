import { ApiError, apiGet, apiPost } from "./api";
import { IS_MOCK } from "@/lib/platform";

/**
 * Ad engine (flag `ad_engine`; house ads only). See routers/ads.py.
 *   GET  /ads/decision?placement=&screen=  -> { show: true, placement, duration_seconds, unit, token, token_expires_at }
 *                                            | { show: false, reason, retry_after_seconds }
 *   POST /ads/impressions { impressions: [...] } -> { accepted, duplicates, rejected: [{ index, reason }] }
 * The server owns every rule (kids, paid tiers, ad-free grants, cooldown, hourly cap, forbidden screens). The app only asks, shows
 * what it is told for as long as it is told, and reports the impression afterwards. A 404 is the kill switch: "no ads".
 * Not built: the offline unit cache (GET /ads/units). Without a connection, no ad is shown.
 */
export const AD_PLACEMENTS = {
  dashboard_banner: "dashboard",
  post_session_interstitial: "post_session",
  profile_banner: "profile",
  settings_banner: "settings",
} as const;
export type AdPlacement = keyof typeof AD_PLACEMENTS;

export type AdUnit = { unit_id: string; title: string; body: string; cta_label: string; cta_route: string };

export type AdShown = {
  show: true;
  placement: AdPlacement;
  duration_seconds: number;
  unit: AdUnit;
  token: string;
  token_expires_at: string;
};
export type AdNotShown = { show: false; reason: string; retry_after_seconds: number | null };
export type AdDecision = AdShown | AdNotShown;

/** null = the engine is off for this account (404) or the response was unusable: show nothing. */
export async function getAdDecision(placement: AdPlacement): Promise<AdDecision | null> {
  if (IS_MOCK) return null;
  try {
    const res = await apiGet<Partial<AdShown> & Partial<AdNotShown>>(
      `/ads/decision?placement=${encodeURIComponent(placement)}&screen=${encodeURIComponent(AD_PLACEMENTS[placement])}`,
    );
    if (res?.show === true && res.unit && typeof res.token === "string" && typeof res.duration_seconds === "number" && res.duration_seconds > 0) {
      return res as AdShown;
    }
    return { show: false, reason: typeof res?.reason === "string" ? res.reason : "no ad", retry_after_seconds: res?.retry_after_seconds ?? null };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null; // dark launch / refused: no ads
    throw err;
  }
}

// ── impression queue ────────────────────────────────────────────────────────

export type AdImpression = {
  token: string;
  unit_id: string;
  placement: AdPlacement;
  screen: string;
  shown_at: number;
  duration_ms: number;
  session_id?: string;
};
type Queued = AdImpression & { queuedAt: number };

export const AD_QUEUE_KEY = "zuzumik-ad-impressions";
const MAX_QUEUED = 100;
const BATCH = 50; // the server's limit per request
const TOKEN_LIFETIME_MS = 3 * 24 * 3600 * 1000;
const TOKEN_MARGIN_MS = 3600 * 1000;

function read(): Queued[] {
  try {
    const raw = localStorage.getItem(AD_QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Queued[]).filter((q) => q && typeof q.token === "string" && typeof q.queuedAt === "number") : [];
  } catch {
    return [];
  }
}

function write(items: Queued[]): void {
  try {
    if (items.length === 0) localStorage.removeItem(AD_QUEUE_KEY);
    else localStorage.setItem(AD_QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUED)));
  } catch {
    /* storage unavailable: the impression is simply not kept */
  }
}

/** Forget every queued impression (sign-out: they carry tokens issued to the learner who is leaving). */
export function clearImpressionQueue(): void {
  write([]);
}

export function pendingImpressionCount(): number {
  return read().length;
}

/** Keep an impression until the server has accepted, deduplicated or refused it (it may be recorded offline). */
export function queueImpression(impression: AdImpression): void {
  write([...read(), { ...impression, queuedAt: Date.now() }]);
}

export type FlushResult = { accepted: number; duplicates: number; rejected: number };

let inFlight: Promise<FlushResult | null> | null = null;

/**
 * Send the queued impressions in batches of up to 50. Whatever the server answers (accepted, duplicate or rejected) is final and
 * leaves the queue; a network or server error keeps the batch for the next attempt. A 404 means ads are off, so the queue is dropped.
 * Impressions whose token has expired are discarded without a request.
 */
export function flushImpressions(): Promise<FlushResult | null> {
  if (IS_MOCK) return Promise.resolve(null);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const total: FlushResult = { accepted: 0, duplicates: 0, rejected: 0 };
    const fresh = read().filter((q) => Date.now() - q.queuedAt < TOKEN_LIFETIME_MS - TOKEN_MARGIN_MS);
    write(fresh);
    let pending = fresh;
    while (pending.length > 0) {
      const batch = pending.slice(0, BATCH);
      try {
        const res = await apiPost<{ accepted?: number; duplicates?: number; rejected?: unknown[] }>("/ads/impressions", {
          impressions: batch.map(({ queuedAt: _queuedAt, ...impression }) => impression),
        });
        total.accepted += res?.accepted ?? 0;
        total.duplicates += res?.duplicates ?? 0;
        total.rejected += Array.isArray(res?.rejected) ? res.rejected.length : 0;
        pending = pending.slice(batch.length);
        write(pending);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          write([]);
          return total;
        }
        break; // offline, 5xx, 401: keep the rest for later
      }
    }
    return total;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// ── call to action ──────────────────────────────────────────────────────────

/** Pages that exist in this app. The backend's house ads point at routes such as /dashboard/billing that the app does not have. */
const KNOWN_ROUTES = new Set([
  "/dashboard", "/dashboard/analytics", "/dashboard/clubs", "/dashboard/family", "/dashboard/feed", "/dashboard/friends",
  "/learn", "/learn/explorer", "/learn/mastery", "/learn/practice", "/play", "/play/configure-sprint",
  "/settings", "/settings/achievements", "/settings/help", "/settings/history", "/settings/leaderboard", "/settings/notifications",
  "/settings/profile", "/settings/reports",
]);

export type AdCta = { kind: "route"; href: string } | { kind: "paywall" } | null;

/** Where an ad's button leads in this app, or null (no button) when the target is not something the app has. */
export function resolveAdCta(route: string): AdCta {
  const path = route.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/dashboard/billing") return { kind: "paywall" }; // Pro upgrade: the plans paywall
  if (path === "/dashboard/referral") return { kind: "route", href: "/dashboard" }; // the invite card lives on the dashboard
  return KNOWN_ROUTES.has(path) ? { kind: "route", href: route } : null;
}
