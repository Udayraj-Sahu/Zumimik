import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("./auth-panel", () => ({
  AuthPanel: ({ onAuthSuccess }: { onAuthSuccess: (d: unknown) => Promise<void> }) => (
    <button
      type="button"
      onClick={() =>
        void onAuthSuccess({ authMethod: "email", intent: "login", email: "ada@example.com", password: "pw" })
      }
    >
      go
    </button>
  ),
}));

function stubLogin() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "user", tier: "free" },
            token: "access",
            refreshToken: "refresh",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ),
  );
}

describe("login feeds the backend account name into the onboarding identity", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    stubLogin();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("uses the backend name (not the email prefix) and seeds an empty firstName", async () => {
    const { AuthModal } = await import("./auth-modal");
    const { useOnboardingStore } = await import("@/stores/onboarding-store");
    useOnboardingStore.getState().reset();
    render(<AuthModal onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "go" }));

    await waitFor(() => expect(useOnboardingStore.getState().name).toBe("Ada Lovelace"));
    expect(useOnboardingStore.getState().firstName).toBe("Ada");
  });

  it("does not overwrite a firstName the learner already chose", async () => {
    const { AuthModal } = await import("./auth-modal");
    const { useOnboardingStore } = await import("@/stores/onboarding-store");
    useOnboardingStore.getState().reset();
    useOnboardingStore.getState().setFirstName("Countess");
    render(<AuthModal onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "go" }));

    await waitFor(() => expect(useOnboardingStore.getState().name).toBe("Ada Lovelace"));
    expect(useOnboardingStore.getState().firstName).toBe("Countess");
  });
});
