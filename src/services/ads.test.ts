import { beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
const apiPost = vi.fn();

class FakeApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

vi.mock("./api", () => ({ apiGet: (...a: unknown[]) => apiGet(...a), apiPost: (...a: unknown[]) => apiPost(...a), ApiError: FakeApiError }));

const UNIT = { unit_id: "house_referral", title: "Bring a study partner", body: "…", cta_label: "Invite a friend", cta_route: "/dashboard/referral" };
const imp = (n: number) => ({ token: `t${n}`, unit_id: "house_referral", placement: "dashboard_banner" as const, screen: "dashboard", shown_at: 1000 + n, duration_ms: 5000 });

describe("ad decision (GET /ads/decision)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
    vi.resetModules();
  });

  it("asks for the placement together with the screen it belongs on", async () => {
    const { getAdDecision } = await import("./ads");
    apiGet.mockResolvedValue({ show: false, reason: "paid tier: ad-free", retry_after_seconds: null });
    await getAdDecision("post_session_interstitial");
    expect(apiGet).toHaveBeenCalledWith("/ads/decision?placement=post_session_interstitial&screen=post_session");
    await getAdDecision("settings_banner");
    expect(apiGet).toHaveBeenLastCalledWith("/ads/decision?placement=settings_banner&screen=settings");
  });

  it("returns the unit and token the server gave", async () => {
    const { getAdDecision } = await import("./ads");
    apiGet.mockResolvedValue({ show: true, placement: "dashboard_banner", duration_seconds: 5, unit: UNIT, token: "tok", token_expires_at: "2026-11-08T00:00:00Z" });
    const d = await getAdDecision("dashboard_banner");
    expect(d).toMatchObject({ show: true, duration_seconds: 5, token: "tok", unit: { unit_id: "house_referral" } });
  });

  it("a refusal keeps the server's reason; a malformed 'show' answer is treated as no ad", async () => {
    const { getAdDecision } = await import("./ads");
    apiGet.mockResolvedValueOnce({ show: false, reason: "cooldown: 10 minutes between ads", retry_after_seconds: 601 });
    expect(await getAdDecision("dashboard_banner")).toEqual({ show: false, reason: "cooldown: 10 minutes between ads", retry_after_seconds: 601 });
    apiGet.mockResolvedValueOnce({ show: true, unit: UNIT }); // no token, no duration
    expect(await getAdDecision("dashboard_banner")).toMatchObject({ show: false });
  });

  it("404 (the kill switch) and 403 mean no ads; other errors are not swallowed", async () => {
    const { getAdDecision } = await import("./ads");
    apiGet.mockRejectedValueOnce(new FakeApiError(404, "not found"));
    expect(await getAdDecision("dashboard_banner")).toBeNull();
    apiGet.mockRejectedValueOnce(new FakeApiError(403, "no"));
    expect(await getAdDecision("dashboard_banner")).toBeNull();
    apiGet.mockRejectedValueOnce(new FakeApiError(500, "boom"));
    await expect(getAdDecision("dashboard_banner")).rejects.toThrow("boom");
  });
});

describe("impression queue (POST /ads/impressions)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
    vi.resetModules();
  });

  it("sends the queued impressions without bookkeeping fields, then empties the queue whatever the server decided", async () => {
    const { queueImpression, flushImpressions, pendingImpressionCount } = await import("./ads");
    queueImpression(imp(1));
    queueImpression(imp(2));
    expect(pendingImpressionCount()).toBe(2);
    apiPost.mockResolvedValue({ accepted: 1, duplicates: 0, rejected: [{ index: 1, reason: "unknown unit" }] });
    const res = await flushImpressions();
    expect(res).toEqual({ accepted: 1, duplicates: 0, rejected: 1 });
    const body = apiPost.mock.calls[0][1] as { impressions: Array<Record<string, unknown>> };
    expect(apiPost.mock.calls[0][0]).toBe("/ads/impressions");
    expect(body.impressions).toHaveLength(2);
    expect(body.impressions[0]).not.toHaveProperty("queuedAt");
    expect(body.impressions[0]).toMatchObject({ token: "t1", unit_id: "house_referral", placement: "dashboard_banner", screen: "dashboard", duration_ms: 5000 });
    expect(pendingImpressionCount()).toBe(0); // rejected is final too: retrying a forged or expired token cannot succeed
  });

  it("keeps the queue when the request fails (offline / server error) and retries later", async () => {
    const { queueImpression, flushImpressions, pendingImpressionCount } = await import("./ads");
    queueImpression(imp(1));
    apiPost.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await flushImpressions();
    expect(pendingImpressionCount()).toBe(1);
    apiPost.mockRejectedValueOnce(new FakeApiError(503, "down"));
    await flushImpressions();
    expect(pendingImpressionCount()).toBe(1);
    apiPost.mockResolvedValueOnce({ accepted: 1, duplicates: 0, rejected: [] });
    await flushImpressions();
    expect(pendingImpressionCount()).toBe(0);
  });

  it("a 404 means ads are off: the queue is dropped", async () => {
    const { queueImpression, flushImpressions, pendingImpressionCount } = await import("./ads");
    queueImpression(imp(1));
    apiPost.mockRejectedValueOnce(new FakeApiError(404, "not found"));
    await flushImpressions();
    expect(pendingImpressionCount()).toBe(0);
  });

  it("sends at most 50 per request", async () => {
    const { queueImpression, flushImpressions } = await import("./ads");
    for (let i = 0; i < 60; i++) queueImpression(imp(i));
    apiPost.mockResolvedValue({ accepted: 1, duplicates: 0, rejected: [] });
    await flushImpressions();
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect((apiPost.mock.calls[0][1] as { impressions: unknown[] }).impressions).toHaveLength(50);
    expect((apiPost.mock.calls[1][1] as { impressions: unknown[] }).impressions).toHaveLength(10);
  });

  it("discards impressions whose token has expired without sending them", async () => {
    const { queueImpression, flushImpressions, pendingImpressionCount, AD_QUEUE_KEY } = await import("./ads");
    queueImpression(imp(1));
    const stale = JSON.parse(localStorage.getItem(AD_QUEUE_KEY)!) as Array<{ queuedAt: number }>;
    stale[0].queuedAt = Date.now() - 3 * 24 * 3600 * 1000; // the token lives 3 days
    localStorage.setItem(AD_QUEUE_KEY, JSON.stringify(stale));
    await flushImpressions();
    expect(apiPost).not.toHaveBeenCalled();
    expect(pendingImpressionCount()).toBe(0);
  });

  it("does nothing when the queue is empty, and concurrent flushes share one request", async () => {
    const { queueImpression, flushImpressions } = await import("./ads");
    await flushImpressions();
    expect(apiPost).not.toHaveBeenCalled();
    queueImpression(imp(1));
    apiPost.mockResolvedValue({ accepted: 1, duplicates: 0, rejected: [] });
    await Promise.all([flushImpressions(), flushImpressions(), flushImpressions()]);
    expect(apiPost).toHaveBeenCalledTimes(1);
  });
});

describe("call to action", () => {
  it("maps the backend's house-ad routes to what this app has, and offers no button for anything else", async () => {
    const { resolveAdCta } = await import("./ads");
    expect(resolveAdCta("/dashboard/billing")).toEqual({ kind: "paywall" });
    expect(resolveAdCta("/dashboard/referral")).toEqual({ kind: "route", href: "/dashboard" });
    expect(resolveAdCta("/dashboard")).toEqual({ kind: "route", href: "/dashboard" });
    expect(resolveAdCta("/learn/explorer/")).toEqual({ kind: "route", href: "/learn/explorer/" });
    expect(resolveAdCta("/somewhere/else")).toBeNull();
    expect(resolveAdCta("https://evil.example/x")).toBeNull();
  });
});
