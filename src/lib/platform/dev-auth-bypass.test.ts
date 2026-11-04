import { describe, expect, it } from "vitest";
import { isDevAuthBypassEnabled } from "./dev-auth-bypass";

describe("development auth bypass", () => {
  it("is enabled only in development when explicitly opted in", () => {
    expect(isDevAuthBypassEnabled("development", "true", "true")).toBe(true);
    expect(isDevAuthBypassEnabled("development", "false", "true")).toBe(false);
    expect(isDevAuthBypassEnabled("development", "true", "false")).toBe(false);
    expect(isDevAuthBypassEnabled("production", "true", "true")).toBe(false);
    expect(isDevAuthBypassEnabled("test", "true", "true")).toBe(false);
  });
});
