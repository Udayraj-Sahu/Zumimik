import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("app info is real, not a hardcoded literal", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@capacitor/core");
    vi.doUnmock("@capacitor/app");
  });

  it("web: reports the build-time package version and does not use the old literals", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "3.4.5");
    const { getAppInfo } = await import("./help");
    const info = await getAppInfo();
    expect(info).toMatchObject({ version: "3.4.5", platform: "Web" });
    expect(JSON.stringify(info)).not.toMatch(/2026\.06\.20|Web \/ Android APK/);
  });

  it("native: reads version and build from the installed app", async () => {
    vi.doMock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" } }));
    vi.doMock("@capacitor/app", () => ({ App: { getInfo: async () => ({ version: "1.2.3", build: "42", name: "x", id: "y" }) } }));
    const { getAppInfo } = await import("./help");
    expect(await getAppInfo()).toEqual({ version: "1.2.3", platform: "Android app", buildNumber: "42" });
  });

  it("the build injects the package.json version into NEXT_PUBLIC_APP_VERSION", async () => {
    const { readFileSync } = await import("node:fs");
    const config = readFileSync("next.config.mjs", "utf8");
    expect(config).toContain("NEXT_PUBLIC_APP_VERSION: pkg.version");
    expect(config).toContain('new URL("./package.json"');
  });
});
