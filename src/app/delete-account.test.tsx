import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiDelete = vi.fn();
const resetAppState = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: (...a: unknown[]) => replace(...a), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings",
}));
vi.mock("@/hooks/queries/use-account-summary", () => ({ useAccountSummary: () => ({ data: undefined }) }));
vi.mock("@/hooks/queries/use-subscription", () => ({
  useSubscription: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiDelete: (...a: unknown[]) => apiDelete(...a) }));

async function renderSettings() {
  vi.resetModules();
  vi.doMock("@/lib/platform", async (orig) => ({
    ...(await orig<object>()),
    IS_MOCK: false,
    resetAppState: (...a: unknown[]) => resetAppState(...a),
  }));
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "a@x.com", role: "user", tier: "free" }, isAuthenticated: true });
  const { default: SettingsPage } = await import("@/app/(app)/settings/page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SettingsPage />
    </QueryClientProvider>,
  );
  // Both the phone row and the desktop tile exist in the DOM; either opens the same dialog.
  fireEvent.click(screen.getAllByText(/Delete Account/)[0]);
  return screen.findByTestId("delete-account-dialog");
}

describe("Settings > Delete account (DELETE /auth/me)", () => {
  beforeEach(() => {
    apiDelete.mockReset();
    resetAppState.mockReset().mockResolvedValue(undefined);
    replace.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.doUnmock("@/lib/platform"));

  it("cannot be confirmed until DELETE is typed, and nothing is sent before that", async () => {
    await renderSettings();
    const button = screen.getByRole("button", { name: "Delete forever" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/), { target: { value: "del" } });
    expect(button).toBeDisabled();
    expect(apiDelete).not.toHaveBeenCalled();
  });

  it("deletes on the server first, then clears local data and leaves", async () => {
    apiDelete.mockResolvedValue({ status: "deleted" });
    await renderSettings();
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/), { target: { value: "delete" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/auth/me"));
    await waitFor(() => expect(resetAppState).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(apiDelete.mock.invocationCallOrder[0]).toBeLessThan(resetAppState.mock.invocationCallOrder[0]);
  });

  it("a failed delete shows the error and keeps the user signed in", async () => {
    apiDelete.mockRejectedValue(new Error("Network request failed"));
    await renderSettings();
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete forever" }));
    expect(await screen.findByTestId("delete-account-error")).toHaveTextContent("Network request failed");
    expect(resetAppState).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete forever" })).toBeEnabled();
  });
});
