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
  fireEvent.click(await screen.findByRole("tab", { name: /Requests/ }));
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
    fireEvent.click((await screen.findAllByRole("button", { name: /^Add friend$/ }))[0]);
    fireEvent.change(screen.getByPlaceholderText("friend@example.com"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByTestId("add-friend-message")).toHaveTextContent("valid email");
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("a valid email POSTs { email }, says only that it was sent, and refreshes the list", async () => {
    apiPost.mockResolvedValue({ friendship_id: "f-77", status: "pending" });
    const { invalidate } = await renderFriends();
    fireEvent.click((await screen.findAllByRole("button", { name: /^Add friend$/ }))[0]);
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
    fireEvent.click((await screen.findAllByRole("button", { name: /^Add friend$/ }))[0]);
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

describe("adding a friend with a QR code uses the backend's qr/redeem contract", () => {
  const SIG = "b".repeat(64);
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

  async function openCodeForm() {
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
    fireEvent.click((await screen.findAllByRole("button", { name: /^Add friend$/ }))[0]);
    return { invalidate, input: screen.getByPlaceholderText("Code from their Add friend QR") };
  }

  it("a valid code.sig POSTs { code, sig }, says they are friends, and refreshes the list", async () => {
    apiPost.mockResolvedValue({ friendship_id: "f-5", status: "accepted" });
    const { invalidate, input } = await openCodeForm();
    fireEvent.change(input, { target: { value: ` friendcode123456.${SIG} ` } });
    fireEvent.click(screen.getByRole("button", { name: "Add with code" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/friends/qr/redeem", { code: "friendcode123456", sig: SIG }));
    expect(await screen.findByTestId("friend-code-message")).toHaveTextContent("now friends");
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friends"] }));
  });

  it("text that is not a friend code is rejected locally with no request", async () => {
    const { input } = await openCodeForm();
    fireEvent.change(input, { target: { value: "hello world" } });
    fireEvent.click(screen.getByRole("button", { name: "Add with code" }));
    expect(await screen.findByTestId("friend-code-message")).toHaveTextContent(/doesn't look like a friend code/);
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("shows the server's refusal as returned (expired, own code)", async () => {
    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValueOnce(new ApiError(410, "code expired or already used"));
    const { input } = await openCodeForm();
    fireEvent.change(input, { target: { value: `friendcode123456.${SIG}` } });
    fireEvent.click(screen.getByRole("button", { name: "Add with code" }));
    expect(await screen.findByTestId("friend-code-message")).toHaveTextContent("code expired or already used");
  });
});

describe("scanning a friend's QR with the camera", () => {
  const SIG = "c".repeat(64);
  const stopTrack = vi.fn();
  const jsQR = vi.fn();

  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    stopTrack.mockReset();
    jsQR.mockReset();
    localStorage.clear();
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/social/friends") return FRIENDS;
      throw new Error(`unexpected GET ${path}`);
    });
    vi.doMock("jsqr", () => ({ default: (...a: unknown[]) => jsQR(...a) }));
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 64 });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 64 });
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 64, height: 64 }),
    }) as never;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("jsqr");
  });

  async function openScanner(getUserMedia: unknown) {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    const { default: Page } = await import("@/app/(app)/dashboard/friends/page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Page />
      </QueryClientProvider>,
    );
    fireEvent.click((await screen.findAllByRole("button", { name: /^Add friend$/ }))[0]);
    fireEvent.click(screen.getByRole("button", { name: /Scan QR with camera/ }));
  }

  it("a scanned friend code is redeemed and the camera is switched off", async () => {
    jsQR.mockReturnValue({ data: `friendcode123456.${SIG}` });
    apiPost.mockResolvedValue({ friendship_id: "f-6", status: "accepted" });
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    await openScanner(getUserMedia);
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/social/friends/qr/redeem", { code: "friendcode123456", sig: SIG }));
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    expect(stopTrack).toHaveBeenCalled();
    expect(await screen.findByTestId("friend-code-message")).toHaveTextContent("now friends");
  });

  it("a QR that is not a friend code is ignored (no request)", async () => {
    jsQR.mockReturnValue({ data: "https://app.example/?ref=ABCD1234" });
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    await openScanner(getUserMedia);
    await waitFor(() => expect(jsQR).toHaveBeenCalled());
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("a blocked camera says so and points to pasting the code", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    await openScanner(getUserMedia);
    expect(await screen.findByTestId("scanner-error")).toHaveTextContent(/Camera access was blocked/);
    expect(apiPost).not.toHaveBeenCalled();
  });
});

describe("the Duel button on a friend", () => {
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

  it("is unavailable and says why, because the server has no friend-duel invitation; it sends nothing", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    const { default: Page } = await import("@/app/(app)/dashboard/friends/page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Page />
      </QueryClientProvider>,
    );
    const duel = await screen.findByTestId("friend-duel");
    expect(duel).toBeDisabled();
    expect(duel).toHaveAttribute("aria-describedby", "friend-duel-note");
    expect(screen.getByTestId("friend-duel-note")).toHaveTextContent("isn't available yet");
    expect(screen.getByRole("link", { name: /find a match/i })).toHaveAttribute("href", "/play/duel");
    fireEvent.click(duel);
    expect(apiPost).not.toHaveBeenCalled();
  });
});
