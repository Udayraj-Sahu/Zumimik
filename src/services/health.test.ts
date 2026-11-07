import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("silent server check (GET /ready)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks /ready at the server root (not under /api/v1) and reads 200 as ready", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { status: "ready", checks: { postgres: "healthy", neo4j: "healthy", redis: "healthy" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { getReadiness } = await import("./health");
    expect(await getReadiness()).toEqual({ state: "ready" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/ready");
  });

  it("a 503 readiness report names the databases that are down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(503, { status: "degraded", checks: { postgres: "healthy", neo4j: "unavailable: ServiceUnavailable", redis: "healthy" } })));
    const { getReadiness } = await import("./health");
    expect(await getReadiness()).toEqual({ state: "degraded", failing: ["neo4j"] });
  });

  it("a proxy error page, a timeout or no connection means the server cannot be reached", async () => {
    const { getReadiness } = await import("./health");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 })));
    expect(await getReadiness()).toEqual({ state: "unreachable" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await getReadiness()).toEqual({ state: "unreachable" });
  });

  it("an older server without the route (404) is not reported as a problem", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));
    const { getReadiness } = await import("./health");
    expect(await getReadiness()).toEqual({ state: "ready" });
  });

  it("checkServer keeps the answer in the network store and shows nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(503, { status: "degraded", checks: { redis: "unavailable: ConnectionError" } })));
    const { checkServer } = await import("./health");
    const { useNetworkStore } = await import("@/stores/network-store");
    expect(useNetworkStore.getState().serverState).toBe("unknown");
    await checkServer();
    expect(useNetworkStore.getState().serverState).toBe("degraded");
    useNetworkStore.getState().reset();
    expect(useNetworkStore.getState().serverState).toBe("unknown");
    expect(document.body.textContent ?? "").not.toMatch(/having trouble|can't reach the server/i);
  });
});
