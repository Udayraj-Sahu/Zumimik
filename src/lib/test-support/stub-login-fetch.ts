import { vi } from "vitest";

/** Stubs `fetch` so POST /auth/login answers like the backend would, for tests that only need a signed-in user. */
export function stubLoginFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const { email = "user@example.com" } = JSON.parse(String(init?.body ?? "{}")) as { email?: string };
      return new Response(
        JSON.stringify({
          user: { id: "1", name: email.split("@")[0], email, role: "Champion" },
          token: "mock-jwt-token",
          refreshToken: "test-refresh-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }),
  );
}
