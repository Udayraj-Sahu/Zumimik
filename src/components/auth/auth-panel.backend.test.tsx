import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthPanel } from "./auth-panel";

vi.mock("@/lib/platform", () => ({ IS_MOCK: false }));
vi.mock("@/lib/firebase/client", () => ({
  isFirebaseConfigured: () => false,
  getFirebaseAuth: vi.fn(),
  getFirebaseGoogleProvider: vi.fn(),
}));

describe("AuthPanel with the live backend", () => {
  it("offers email auth and does not submit placeholder Google or phone credentials", async () => {
    const onAuthSuccess = vi.fn().mockResolvedValue(undefined);
    render(<AuthPanel onAuthSuccess={onAuthSuccess} />);

    expect(screen.getByRole("status")).toHaveTextContent("Use email and password");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue with Phone Number" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Continue with email" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(onAuthSuccess).toHaveBeenCalledWith({
        authMethod: "email",
        email: "ada@example.com",
        password: "correct-horse-battery",
        intent: "login",
      }),
    );
  });
});
