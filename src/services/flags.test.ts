import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a) }));

describe("feature flags (GET /api/config)", () => {
  beforeEach(() => {
    vi.resetModules();
    apiGet.mockReset();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("maps { enabled, rollout_pct } and requests the public config route", async () => {
    apiGet.mockResolvedValue({ flags: { mock_exams: { enabled: true, rollout_pct: 100 }, referral_ladder: { enabled: false, rollout_pct: 100 } }, degraded: false });
    const { getFeatureFlags } = await import("./flags");
    expect(await getFeatureFlags()).toEqual({ mock_exams: { enabled: true, rolloutPct: 100 }, referral_ladder: { enabled: false, rolloutPct: 100 } });
    expect(apiGet).toHaveBeenCalledWith("/api/config");
  });

  it("a feature counts as OFF only when the list is loaded and says so; unknown or unloaded is never off", async () => {
    const { isFeatureOff } = await import("./flags");
    const flags = { a: { enabled: false, rolloutPct: 100 }, b: { enabled: true, rolloutPct: 0 }, c: { enabled: true, rolloutPct: 100 }, d: { enabled: true, rolloutPct: 30 } };
    expect(isFeatureOff(flags, "a")).toBe(true);
    expect(isFeatureOff(flags, "b")).toBe(true); // enabled but 0% rollout reaches nobody
    expect(isFeatureOff(flags, "c")).toBe(false);
    expect(isFeatureOff(flags, "d")).toBe(false); // partial rollout is per-user: cannot be decided here
    expect(isFeatureOff(flags, "missing")).toBe(false);
    expect(isFeatureOff(undefined, "a")).toBe(false);
  });

  it("a gated route's 404 'not found' becomes a clear message; other errors keep their own", async () => {
    const { gatedFeatureMessage } = await import("./flags");
    const { ApiError } = await import("./api");
    expect(gatedFeatureMessage(new ApiError(404, "not found"), "Mock exams")).toBe("Mock exams isn't enabled for your account yet.");
    expect(gatedFeatureMessage(new ApiError(500, "boom"), "Mock exams")).toBeNull();
    expect(gatedFeatureMessage(new ApiError(404, "no such mock"), "Mock exams")).toBeNull(); // a specific 404 is not a disabled feature
    expect(gatedFeatureMessage(new Error("x"), "Mock exams")).toBeNull();
  });

  it("explicit mock mode gates nothing and makes no request", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "true");
    const { getFeatureFlags } = await import("./flags");
    expect(await getFeatureFlags()).toEqual({});
    expect(apiGet).not.toHaveBeenCalled();
  });
});
