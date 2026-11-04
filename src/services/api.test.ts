import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("API error details", () => {
  it("surfaces field validation messages without echoing submitted values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: [{ loc: ["body", "email"], msg: "invalid email", input: "private value" }],
          }),
          { status: 422, statusText: "Unprocessable Entity", headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(apiGet("/test")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "email: invalid email",
    });
  });

  it("retains a plain backend detail string on ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "feature is unavailable" }), {
          status: 403,
          statusText: "Forbidden",
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiGet("/test")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "feature is unavailable",
    });
  });
});
