import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useWelcomeStore } from "@/stores/welcome-store";

// A synchronous stand-in for the reduced-motion hook. The real hook sets state
// from a mount effect, which the sequence test does not want to race; the
// decision path reads `prefers-reduced-motion` through window.matchMedia
// directly (configured by `setReducedMotion` below).
const { reducedFlag } = vi.hoisted(() => ({ reducedFlag: { value: false } }));
vi.mock("@/hooks/use-reduced-motion", () => ({
  usePrefersReducedMotion: () => reducedFlag.value,
}));

// Stub the AGPL client-only avatar chunk so the test never resolves an async
// module; the focus is the welcome sequence, not the renderer.
vi.mock("next/dynamic", () => ({
  default: () => {
    const DynamicStub = () => <span data-testid="pip-avatar" />;
    DynamicStub.displayName = "DynamicStub";
    return DynamicStub;
  },
}));

// Replace framer-motion with inert divs; transitions never run so the sequence
// is driven purely by the parent's timers and exposed via data-* attributes.
vi.mock("motion/react", () => {
  type MotionProps = Record<string, unknown> & { children?: React.ReactNode };
  const MotionDiv = ({ children, className, style, ...rest }: MotionProps) => {
    const domProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (key.startsWith("data-") || key.startsWith("aria-")) domProps[key] = value;
    }
    return (
      <div className={className as string} style={style as React.CSSProperties} {...domProps}>
        {children}
      </div>
    );
  };
  return { motion: { div: MotionDiv } };
});

import {
  DashboardWelcome,
  WELCOME_CLOUD_MS,
  WELCOME_DELAY_MS,
  WELCOME_SETTLE_MS,
} from "@/components/dashboard/mascot/dashboard-welcome";
import { MASCOT_WALK_FROM, MASCOT_WALK_MS, MASCOT_WALK_TO } from "@/components/dashboard/mascot/dashboard-mascot";

const unitOf = (value: string) => value.replace(/[-\d.]/g, "");

function setReducedMotion(reduced: boolean): void {
  reducedFlag.value = reduced;
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

async function renderWelcome(enabled = true) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<DashboardWelcome enabled={enabled} greeting={<span>Welcome back, Ada</span>} />);
  });
  return result;
}

async function rerenderWelcome(view: ReturnType<typeof render>, enabled: boolean) {
  await act(async () => {
    view.rerender(<DashboardWelcome enabled={enabled} greeting={<span>Welcome back, Ada</span>} />);
  });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const mascot = () => document.querySelector("[data-mascot]");
const cloud = () => document.querySelector("[data-mascot-cloud]");

describe("DashboardWelcome", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    useWelcomeStore.getState().reset();
    setReducedMotion(false);
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    sessionStorage.clear();
    useWelcomeStore.getState().reset();
  });

  it("keeps the mascot hidden for the delay, then walks, settles, then opens the cloud and reveals the text", async () => {
    useWelcomeStore.getState().requestOnSignup();
    await renderWelcome();

    // Nothing is animating yet: mascot parked, cloud closed, text hidden.
    expect(mascot()).toHaveAttribute("data-walking", "false");
    expect(cloud()).toHaveAttribute("data-revealed", "false");
    expect(cloud()).toHaveAttribute("data-text", "false");
    expect(useWelcomeStore.getState().status).toBe("played");

    // The delay elapses -> the mascot starts walking.
    advance(WELCOME_DELAY_MS - 1);
    expect(mascot()).toHaveAttribute("data-walking", "false");
    advance(1);
    expect(mascot()).toHaveAttribute("data-walking", "true");
    expect(cloud()).toHaveAttribute("data-revealed", "false");

    // Walk finishes -> settle (idle), cloud still closed.
    advance(MASCOT_WALK_MS);
    expect(mascot()).toHaveAttribute("data-walking", "false");
    expect(cloud()).toHaveAttribute("data-revealed", "false");

    // Settle pause elapses -> the cloud opens, text still hidden.
    advance(WELCOME_SETTLE_MS);
    expect(cloud()).toHaveAttribute("data-revealed", "true");
    expect(cloud()).toHaveAttribute("data-text", "false");

    // Cloud animation finishes -> the greeting text appears.
    advance(WELCOME_CLOUD_MS);
    expect(cloud()).toHaveAttribute("data-text", "true");
    expect(screen.getByTestId("pip-avatar")).toBeInTheDocument();
  });

  it("does not play when no welcome is queued (already played this session)", async () => {
    useWelcomeStore.getState().consume();
    await renderWelcome();

    expect(mascot()).toHaveAttribute("data-walking", "false");
    expect(cloud()).toHaveAttribute("data-revealed", "true");
    expect(cloud()).toHaveAttribute("data-text", "true");
  });

  it("never restarts the walk on re-render", async () => {
    useWelcomeStore.getState().requestOnSignup();
    const view = await renderWelcome();
    advance(WELCOME_DELAY_MS + MASCOT_WALK_MS + WELCOME_SETTLE_MS + WELCOME_CLOUD_MS);
    expect(cloud()).toHaveAttribute("data-text", "true");

    await rerenderWelcome(view, true);
    expect(mascot()).toHaveAttribute("data-walking", "false");
    expect(cloud()).toHaveAttribute("data-revealed", "true");
    expect(useWelcomeStore.getState().status).toBe("played");
  });

  it("respects reduced motion - shows the mascot and cloud immediately", async () => {
    setReducedMotion(true);
    useWelcomeStore.getState().requestOnSignup();
    await renderWelcome();

    expect(mascot()).toHaveAttribute("data-walking", "false");
    expect(cloud()).toHaveAttribute("data-revealed", "true");
    expect(cloud()).toHaveAttribute("data-text", "true");
    expect(useWelcomeStore.getState().status).toBe("played");
  });

  it("waits until the dashboard is visible (enabled) before playing", async () => {
    useWelcomeStore.getState().requestOnSignup();
    const view = await renderWelcome(false);

    advance(WELCOME_DELAY_MS + MASCOT_WALK_MS);
    expect(mascot()).toHaveAttribute("data-walking", "false");
    expect(cloud()).toHaveAttribute("data-revealed", "false");
    expect(useWelcomeStore.getState().status).toBe("pending");

    await rerenderWelcome(view, true);
    advance(WELCOME_DELAY_MS);
    expect(mascot()).toHaveAttribute("data-walking", "true");
    expect(useWelcomeStore.getState().status).toBe("played");
  });

  it("always renders the greeting copy inside the cloud", async () => {
    useWelcomeStore.getState().consume();
    await renderWelcome();
    expect(screen.getByText("Welcome back, Ada")).toBeInTheDocument();
  });

  it("keeps the walk start and end in the same unit so Framer Motion can interpolate", () => {
    // A unit mismatch ("-70vw" -> 0) makes Framer Motion fall back to an instant
    // jump, which is exactly what made the walk look like it was not animating.
    expect(unitOf(MASCOT_WALK_FROM)).not.toBe("");
    expect(unitOf(MASCOT_WALK_FROM)).toBe(unitOf(MASCOT_WALK_TO));
  });
});
