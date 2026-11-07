import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }), usePathname: () => "/learn" }));

async function load(mock: boolean, offer: "start" | "resume" | "none") {
  vi.resetModules();
  vi.doMock("@/hooks/queries/use-warmup", () => ({ useWarmupOffer: () => ({ data: offer }) }));
  const { AdaptiveEngineSection } = await import("./adaptive-engine-section");
  return render(<QueryClientProvider client={new QueryClient()}><AdaptiveEngineSection /></QueryClientProvider>);
}

afterEach(() => { cleanup(); push.mockReset(); });

describe("adaptive engine section (Adaptive Learning tab)", () => {
  it("offers the warm-up to a new learner and starts the personalised mix with the chosen length", async () => {
    await load(false, "start");
    expect(screen.getByTestId("warmup-card")).toHaveAttribute("href", "/learn/warmup");
    fireEvent.click(screen.getByRole("radio", { name: "15 questions" }));
    fireEvent.click(screen.getByRole("button", { name: /Start mix/ }));
    expect(push).toHaveBeenCalledWith("/play/sprint?topic=adaptive%3Amix&length=15&difficulty=adaptive");
  });

  it("shows only the mix to an established learner", async () => {
    await load(false, "none");
    expect(screen.queryByTestId("warmup-card")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start mix/ })).toBeInTheDocument();
  });

  it("offers to finish a half-done warm-up", async () => {
    await load(false, "resume");
    expect(screen.getByText("Finish your warm-up")).toBeInTheDocument();
  });
});
