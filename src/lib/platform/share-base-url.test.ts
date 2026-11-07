import { describe, it, expect, vi, beforeEach } from "vitest";

async function load(site: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", site);
  return (await import("./config")).shareBaseUrl;
}

describe("shareBaseUrl", () => {
  beforeEach(() => vi.unstubAllEnvs());
  it("uses the site address for the app and local dev", async () => {
    const f = await load("https://zuzumik.com/");
    expect(f("https://localhost")).toBe("https://zuzumik.com");
    expect(f("http://localhost:3000")).toBe("https://zuzumik.com");
    expect(f("capacitor://localhost")).toBe("https://zuzumik.com");
  });
  it("keeps a real website origin", async () => {
    const f = await load("https://zuzumik.com");
    expect(f("https://app.example.com")).toBe("https://app.example.com");
  });
  it("falls back to the origin when no site address is set", async () => {
    const f = await load("");
    expect(f("http://localhost:3000")).toBe("http://localhost:3000");
  });
});
