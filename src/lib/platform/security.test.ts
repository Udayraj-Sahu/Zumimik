import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubLoginFetch } from "@/lib/test-support/stub-login-fetch";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { useAuthStore } from "@/stores/auth-store";
import { isFirebaseConfigured } from "@/lib/firebase/client";

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const srcScriptFiles = () =>
  walk(SRC).filter((f) => !/\.(test|spec)\.(ts|tsx)$/.test(f));

const SECRET_PATTERNS: RegExp[] = [
  /AIza[0-9A-Za-z_-]{20,}/, // Google / Firebase API key
  /sk_(live|test)_[0-9A-Za-z]{16,}/, // Stripe secret key
  /rk_(live|test)_[0-9A-Za-z]{16,}/, // Stripe restricted key
  /SG\.[0-9A-Za-z_-]{20,}/, // SendGrid API key
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private key block
  /service_role|service-role/, // Supabase service role key
  /gh[pousr]_[0-9A-Za-z]{20,}/, // GitHub tokens
];

beforeEach(() => {
  stubLoginFetch();
  localStorage.clear();
  useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("security surface", () => {
  it("1. no hardcoded secrets / private keys / service-role keys anywhere in src", () => {
    const violations: string[] = [];
    for (const file of srcScriptFiles()) {
      const text = readFileSync(file, "utf8");
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(text)) violations.push(`${file} -> ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("2. environment variables referenced in src are NEXT_PUBLIC_* only (browser-bundle safe)", () => {
    const names = new Set<string>();
    for (const file of srcScriptFiles()) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) names.add(m[1]);
    }
    expect(names.size).toBeGreaterThan(0);
    for (const name of names) {
      expect(name === "NODE_ENV" || name.startsWith("NEXT_PUBLIC_")).toBe(true);
    }
  });

  it("3. no console.log / debugger statements ship in src", () => {
    const hits: string[] = [];
    for (const file of srcScriptFiles()) {
      if (/\bconsole\.(log|debug)\b|\bdebugger\b/.test(readFileSync(file, "utf8"))) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it("4. the only dangerouslySetInnerHTML is a static ld+json script (no user input)", () => {
    const files = srcScriptFiles().filter((f) => readFileSync(f, "utf8").includes("dangerouslySetInnerHTML"));
    expect(files.map((f) => f.replace(/\\/g, "/").split("/").slice(-1)[0])).toEqual(["layout.tsx"]);
    const fsys = files.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(fsys).toContain("application/ld+json");
  });

  it("5. firebase client reports unconfigured until all NEXT_PUBLIC_FIREBASE_* vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", undefined as never);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", undefined as never);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", undefined as never);
    expect(isFirebaseConfigured()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "AIza-stubbed");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "zuzumik.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "zuzumik");
    expect(isFirebaseConfigured()).toBe(true);
  });

  it("6. env separation: API url is trimmed and site defaults apply", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/");
    vi.resetModules();
    const mod = await import("@/lib/platform");
    expect(mod.API_BASE_URL).toBe("https://api.example.com");
    expect(mod.apiUrl("sync/foo")).toBe("https://api.example.com/api/v1/sync/foo");
    expect(mod.apiUrl("/api/topics")).toBe("https://api.example.com/api/topics");
    expect(mod.SITE_NAME).toBe("Zuzumik");
  });

  it("8. logout clears auth user + token + refreshToken in state AND in the persisted blob", async () => {
    await useAuthStore.getState().login("alice@zuzumik.com", "pw1234");
    useAuthStore.getState().setRefreshToken("jwt.refresh.secret");
    await new Promise((r) => setTimeout(r, 0));

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe("mock-jwt-token");
    const blobBefore = JSON.parse(localStorage.getItem("zuzumik-auth") as string);
    expect(blobBefore.state.refreshToken).toBe("jwt.refresh.secret");

    useAuthStore.getState().logout();
    await new Promise((r) => setTimeout(r, 0));

    const st = useAuthStore.getState();
    expect(st.user).toBeNull();
    expect(st.token).toBeNull();
    expect(st.refreshToken).toBeNull();
    expect(st.isAuthenticated).toBe(false);
    const blobAfter = JSON.parse(localStorage.getItem("zuzumik-auth") as string);
    expect(blobAfter.state.token).toBeNull();
    expect(blobAfter.state.refreshToken).toBeNull();
    expect(blobAfter.state.user).toBeNull();
  });

  it("9. login flips the authenticated gate - the flag drives protected-route gating", async () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    await useAuthStore.getState().login("bob@zuzumik.com", "pw1234");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("keyboard & mobile input attributes (static)", () => {
  it("10. phone sign-in uses a numeric tel keyboard", () => {
    const text = readFileSync(join(SRC, "components", "auth", "auth-panel.tsx"), "utf8");
    expect(text).toContain('type="tel"');
  });

  it("11. profile editing uses the correct email and tel keyboard types", () => {
    const text = readFileSync(
      join(SRC, "app", "(app)", "settings", "profile", "edit", "page.tsx"),
      "utf8",
    );
    expect(text).toContain('type="email"');
    expect(text).toContain('type="tel"');
  });
});

describe("loading & empty-state inventory (static)", () => {
  const SCAFFOLD_SKELETONS = [
    ["adaptive-dashboard.tsx", "adaptive"],
    ["habit-tracker-modal.tsx", "habit tracker"],
  ] as const;
  for (const [file, label] of SCAFFOLD_SKELETONS) {
    it(`12.${label} page ships an animate-pulse skeleton`, () => {
      const text = readFileSync(
        walk(SRC).find((f) => f.endsWith(file)) as string,
        "utf8",
      );
      expect(text).toContain("animate-pulse");
    });
  }

  it("13. no dedicated EmptyState component exists yet (UI recommendation - data layer is safe)", () => {
    const hits = srcScriptFiles().filter((f) => f.toLowerCase().includes("emptystate"));
    expect(hits).toEqual([]);
  });
});

describe("images & media (static)", () => {
  const FEED = join(SRC, "components", "feed", "feed-live.tsx"); // the Feed page is a thin wrapper; the images live here

  it("14. feed images load lazily with fixed boxes + object-cover (no layout shift)", () => {
    const feed = readFileSync(FEED, "utf8");
    expect(feed).toContain("decoding=\"async\"");
    expect(feed).toContain("loading=\"lazy\"");
    expect(feed).toContain("object-cover");
  });

  it("15. raw <img> is used (no next/image) and there is NO onError fallback - broken/missing image gap is documented", () => {
    const files = srcScriptFiles()
      .filter((f) => readFileSync(f, "utf8").includes("<img"))
      .filter((f) => readFileSync(f, "utf8").includes("onError="));
    expect(files).toEqual([]);
  });
});
