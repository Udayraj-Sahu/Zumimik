import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/friends",
}));

const FRIENDS = {
  friends: [{ friendship_id: "f-1", user_id: "u-2", name: "Grace Hopper", since: null }],
  incoming: [{ friendship_id: "f-9", user_id: "u-3", name: "Alan Turing" }],
  outgoing: [],
};

async function renderPage() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { default: Page } = await import("@/app/(app)/dashboard/friends/page");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: /Requests/ }));
  return { invalidate };
}

describe("friend requests use the backend's respond contract", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/social/friends") return FRIENDS;
      throw new Error(`unexpected GET ${path}`);
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("Accept POSTs { friendship_id, action: 'accept' } and refreshes the friends list", async () => {
    apiPost.mockResolvedValue({ friendship_id: "f-9", status: "accepted" });
    const { invalidate } = await renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Accept friend request from Alan Turing" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/friends/respond", { friendship_id: "f-9", action: "accept" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friends"] }));
  });

  it("Reject POSTs action 'decline'", async () => {
    apiPost.mockResolvedValue({ friendship_id: "f-9", status: "declined" });
    await renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Reject friend request from Alan Turing" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/friends/respond", { friendship_id: "f-9", action: "decline" }));
  });

  it("a failed response does not refresh the list as if it succeeded", async () => {
    apiPost.mockRejectedValue(new Error("that request has expired"));
    const { invalidate } = await renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Accept friend request from Alan Turing" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["friends"] });
  });

  it("the friendship id (not the user id) is what gets sent", async () => {
    apiPost.mockResolvedValue({});
    await renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Accept friend request from Alan Turing" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    expect(JSON.stringify(apiPost.mock.calls[0][1])).not.toContain("u-3");
  });
});
