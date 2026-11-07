import { describe, it, expect, beforeEach } from "vitest";
import { useTourStore } from "./tour-store";
import { resetAppState } from "@/lib/platform";

describe("tour store", () => {
  beforeEach(() => useTourStore.setState({ pending: [], seen: [] }));
  it("queues a new account once and records it as seen when finished", () => {
    useTourStore.getState().markNewAccount("u1");
    useTourStore.getState().markNewAccount("u1");
    expect(useTourStore.getState().pending).toEqual(["u1"]);
    useTourStore.getState().finish("u1");
    expect(useTourStore.getState().pending).toEqual([]);
    useTourStore.getState().markNewAccount("u1"); // signing in again must not queue it
    expect(useTourStore.getState().pending).toEqual([]);
  });
  it("is not cleared by sign-out / reset, so a returning user never replays it", async () => {
    useTourStore.getState().markNewAccount("u2");
    useTourStore.getState().finish("u2");
    await resetAppState();
    expect(useTourStore.getState().seen).toContain("u2");
  });
  it("ignores a missing user id", () => {
    useTourStore.getState().markNewAccount(undefined);
    expect(useTourStore.getState().pending).toEqual([]);
  });
});
