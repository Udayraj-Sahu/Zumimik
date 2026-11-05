import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPatch = vi.fn();
const push = vi.fn();
vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPatch: (...a: unknown[]) => apiPatch(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/profile/edit",
}));

async function renderEdit() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "ada@example.com", role: "user" }, token: "t", isAuthenticated: true });
  const { default: Page } = await import("@/app/(app)/settings/profile/edit/page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );
  return { auth: useAuthStore };
}

const nameInput = () => screen.getByPlaceholderText("Your name") as HTMLInputElement;

describe("profile edit saves the name to the backend", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPatch.mockReset();
    push.mockReset();
    localStorage.clear();
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/auth/me") return { user: { id: "u1", name: "Ada", email: "ada@example.com", role: "user", tier: "free" } };
      if (path === "/dashboard/streak") return { current: 0, xp: 0 };
      return { achievements: [] };
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("PATCHes /auth/me with the new name and only then updates the local user", async () => {
    apiPatch.mockResolvedValue({ user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", role: "user" } });
    const { auth } = await renderEdit();
    fireEvent.change(nameInput(), { target: { value: "Ada Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith("/auth/me", { name: "Ada Lovelace", display_name: "Ada Lovelace" }));
    await waitFor(() => expect(auth.getState().user?.name).toBe("Ada Lovelace"));
  });

  it("a rejected save shows the error and does NOT change the local name or leave the page", async () => {
    apiPatch.mockRejectedValue(new Error("name is too long"));
    const { auth } = await renderEdit();
    fireEvent.change(nameInput(), { target: { value: "Ada Lovelace" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
    expect(await screen.findByText("name is too long")).toBeInTheDocument();
    expect(auth.getState().user?.name).toBe("Ada");
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("changing only email/phone makes no profile request (they have no backend field)", async () => {
    const { auth } = await renderEdit();
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), { target: { value: "+911234567890" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
    await waitFor(() => expect(auth.getState().user?.phone).toBe("+911234567890"));
    expect(apiPatch).not.toHaveBeenCalled();
  });
});
