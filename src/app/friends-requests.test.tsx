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

describe("add and remove friends use the backend's request/remove contract", () => {
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

  async function renderFriends() {
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
    return { invalidate };
  }

  it("Add opens a form; an invalid email is rejected locally with no request", async () => {
    await renderFriends();
    fireEvent.click(await screen.findByRole("button", { name: /Add/ }));
    fireEvent.change(screen.getByPlaceholderText("friend@example.com"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByTestId("add-friend-message")).toHaveTextContent("valid email");
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("a valid email POSTs { email }, says only that it was sent, and refreshes the list", async () => {
    apiPost.mockResolvedValue({ friendship_id: "f-77", status: "pending" });
    const { invalidate } = await renderFriends();
    fireEvent.click(await screen.findByRole("button", { name: /Add/ }));
    fireEvent.change(screen.getByPlaceholderText("friend@example.com"), { target: { value: " grace@example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/friends/request", { email: "grace@example.com" }));
    expect(await screen.findByTestId("add-friend-message")).toHaveTextContent("Friend request sent.");
    expect(screen.getByTestId("add-friend-message")).not.toHaveTextContent(/accepted|received|seen/i);
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friends"] }));
  });

  it("backend refusals are shown as returned (unknown learner, duplicate)", async () => {
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValueOnce(new ApiError(404, "no such learner"));
    await renderFriends();
    fireEvent.click(await screen.findByRole("button", { name: /Add/ }));
    fireEvent.change(screen.getByPlaceholderText("friend@example.com"), { target: { value: "nobody@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByTestId("add-friend-message")).toHaveTextContent("no such learner");
    apiPost.mockRejectedValueOnce(new ApiError(409, "a request or friendship already exists"));
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(screen.getByTestId("add-friend-message")).toHaveTextContent("already exists"));
  });

  it("Remove needs a second click to confirm, then POSTs the friendship id (not the user id)", async () => {
    apiPost.mockResolvedValue({ friendship_id: "f-1", status: "removed" });
    const { invalidate } = await renderFriends();
    fireEvent.click(await screen.findByRole("button", { name: "Remove Grace Hopper" }));
    expect(apiPost).not.toHaveBeenCalled(); // first click only asks to confirm
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove Grace Hopper" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/friends/remove", { friendship_id: "f-1" }));
    expect(JSON.stringify(apiPost.mock.calls[0][1])).not.toContain("u-2");
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friends"] }));
  });
});
