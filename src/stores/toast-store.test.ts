import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useToastStore } from "@/stores/toast-store";

const AUTO_DISMISS_MS = 3500;

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("notifications / toasts (src/stores/toast-store.ts)", () => {
  it("1. success toast is pushed with correct type + title", () => {
    toast.success("Question saved");
    const [t] = useToastStore.getState().toasts;
    expect(t.type).toBe("success");
    expect(t.title).toBe("Question saved");
  });

  it("2. info toast renders type + optional message", () => {
    useToastStore.getState().push("info", "New feature", "Practice mode is live");
    const [t] = useToastStore.getState().toasts;
    expect(t.type).toBe("info");
    expect(t.message).toBe("Practice mode is live");
  });

  it("3. error toast keeps type + message verbatim", () => {
    toast.error("Sync failed", "HTTP 500");
    const [t] = useToastStore.getState().toasts;
    expect(t.type).toBe("error");
    expect(t.title).toBe("Sync failed");
    expect(t.message).toBe("HTTP 500");
  });

  it("4. a very long message is preserved intact (no truncation)", () => {
    const long = "x".repeat(2000);
    toast.error("Long message", long);
    expect(useToastStore.getState().toasts[0].message).toBe(long);
  });

  it("5. multiple simultaneous notifications keep distinct ids and order", () => {
    useToastStore.getState().push("success", "a");
    useToastStore.getState().push("info", "b");
    useToastStore.getState().push("error", "c");
    const items = useToastStore.getState().toasts;
    expect(items.map((t) => t.title)).toEqual(["a", "b", "c"]);
    expect(new Set(items.map((t) => t.id)).size).toBe(3);
  });

  it("6. auto-dismiss fires after 3.5s and not a moment before", () => {
    toast.success("Timed");
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(AUTO_DISMISS_MS - 1);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("7. auto-dismiss removes only the toast whose timer expired", () => {
    toast.info("first");
    vi.advanceTimersByTime(AUTO_DISMISS_MS);
    expect(useToastStore.getState().toasts).toHaveLength(0);

    toast.info("second");
    vi.advanceTimersByTime(AUTO_DISMISS_MS - 1);
    expect(useToastStore.getState().toasts.map((t) => t.title)).toEqual(["second"]);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("8. manual dismiss removes only the targeted toast", () => {
    useToastStore.getState().push("success", "a");
    useToastStore.getState().push("error", "b");
    useToastStore.getState().push("info", "c");
    const b = useToastStore.getState().toasts[1];
    useToastStore.getState().dismiss(b.id);
    expect(useToastStore.getState().toasts.map((t) => t.title)).toEqual(["a", "c"]);
  });

  it("9. toast helper is wired to the store and pushes immediately", () => {
    expect(toast.success("x")).toBeUndefined();
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });
});