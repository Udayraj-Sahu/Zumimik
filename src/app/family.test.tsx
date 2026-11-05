import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/family",
}));

const SEAT_A = { seat_number: 1, status: "active", discount_pct: 100, child_user_id: "c-1", email: "kid@example.com", display_name: "Mira", age: 11, effective_tier: "pro", kids_mode: true, parental_consent_at: "2026-11-01T00:00:00" };
const SEAT_B = { seat_number: 2, status: "suspended", discount_pct: 80, child_user_id: "c-2", email: "teen@example.com", display_name: null, age: 15, effective_tier: "free", kids_mode: false, parental_consent_at: null };
const family = (over: Record<string, unknown> = {}) => ({ family_id: "f-1", parent_user_id: "p-1", parent_tier: "pro", max_seats: 3, seats: [SEAT_A, SEAT_B], ...over });
const CHILD_FRIENDS = {
  child_user_id: "c-1",
  friends: [{ friendship_id: "fr-1", user_id: "u-9", name: "Sam", parent_approved: true }],
  awaiting_your_approval: [{ friendship_id: "fr-2", user_id: "u-8", name: "Alex", expires_at: "2026-12-01T00:00:00" }],
  awaiting_the_other_side: [{ friendship_id: "fr-3", status: "pending" }],
};

function routeGets(map: { family?: unknown; friends?: unknown }) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/family") {
      if (map.family instanceof Error) throw map.family;
      return map.family ?? family();
    }
    if (path.startsWith("/family/friends/")) {
      if (map.friends instanceof Error) throw map.friends;
      return map.friends ?? CHILD_FRIENDS;
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

async function renderFamily(mock = false) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", mock ? "true" : "false");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "p-1", name: "Parent", email: "p@example.com", role: "user" }, token: "t", isAuthenticated: true });
  const { default: Page } = await import("@/app/(app)/dashboard/family/page");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  return { invalidate };
}

describe("/dashboard/family", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("loads GET /family and shows the seat meter, each seat's status, age, kids mode and discount", async () => {
    routeGets({});
    await renderFamily();
    expect(screen.getByTestId("family-loading")).toBeInTheDocument();
    const summary = await screen.findByTestId("family-summary");
    expect(summary).toHaveTextContent("2");
    expect(summary).toHaveTextContent("of 3 used");
    const a = screen.getByTestId("seat-1");
    expect(a).toHaveTextContent("Mira");
    expect(a).toHaveTextContent("Age 11");
    expect(a).toHaveTextContent("Kids mode");
    expect(a).toHaveTextContent("100% off");
    expect(a).toHaveTextContent("Active");
    const b = screen.getByTestId("seat-2");
    expect(b).toHaveTextContent("teen@example.com"); // no display name: falls back to the email
    expect(b).toHaveTextContent("suspended");
    expect(b).not.toHaveTextContent("Kids mode");
  });

  it("a family-less free account sees the empty state and 'needs a paid subscription', with no add form", async () => {
    routeGets({ family: family({ family_id: null, parent_tier: "free", seats: [] }) });
    await renderFamily();
    expect(await screen.findByTestId("family-empty")).toBeInTheDocument();
    expect(screen.getByTestId("family-needs-plan")).toBeInTheDocument();
    expect(screen.queryByTestId("add-child-form")).not.toBeInTheDocument();
  });

  it("a full family has no add form", async () => {
    routeGets({ family: family({ seats: [SEAT_A, SEAT_B, { ...SEAT_B, seat_number: 3, child_user_id: "c-3" }] }) });
    await renderFamily();
    expect(await screen.findByTestId("family-full")).toBeInTheDocument();
    expect(screen.queryByTestId("add-child-form")).not.toBeInTheDocument();
  });

  it("a failed load shows the error with a working retry", async () => {
    routeGets({ family: new Error("server down") });
    await renderFamily();
    expect(await screen.findByTestId("family-error")).toHaveTextContent("server down");
    routeGets({});
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("family-summary")).toBeInTheDocument();
  });

  describe("creating a seat (POST /family/sub-account/create)", () => {
    const fill = (over: Partial<Record<"email" | "password" | "name" | "age", string>> = {}) => {
      const v = { email: "new@example.com", password: "longenough1", name: "Nia", age: "12", ...over };
      fireEvent.change(screen.getByPlaceholderText("child@example.com"), { target: { value: v.email } });
      fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: v.password } });
      fireEvent.change(screen.getByPlaceholderText("First name"), { target: { value: v.name } });
      fireEvent.change(screen.getByPlaceholderText("8 to 17"), { target: { value: v.age } });
      fireEvent.click(screen.getByRole("button", { name: "Create seat" }));
    };

    it("rejects an invalid email, a short password and an out-of-range age locally, with no request", async () => {
      routeGets({ family: family({ seats: [SEAT_A] }) });
      await renderFamily();
      await screen.findByTestId("add-child-form");
      fill({ email: "nope" });
      expect(await screen.findByTestId("add-child-message")).toHaveTextContent("valid email");
      fill({ password: "short" });
      expect(screen.getByTestId("add-child-message")).toHaveTextContent("at least 8");
      fill({ age: "18" });
      expect(screen.getByTestId("add-child-message")).toHaveTextContent("8 to 17");
      fill({ age: "7" });
      expect(screen.getByTestId("add-child-message")).toHaveTextContent("8 to 17");
      expect(apiPost).not.toHaveBeenCalled();
    });

    it("sends the backend's field names, then refreshes the family and the subscription", async () => {
      routeGets({ family: family({ seats: [SEAT_A] }) });
      apiPost.mockResolvedValue({ family_id: "f-1", seat: SEAT_B, seats: [SEAT_A, SEAT_B], quote: {} });
      const { invalidate } = await renderFamily();
      await screen.findByTestId("add-child-form");
      fill();
      await waitFor(() =>
        expect(apiPost).toHaveBeenCalledWith("/family/sub-account/create", { email: "new@example.com", password: "longenough1", display_name: "Nia", age: 12 }),
      );
      expect(await screen.findByTestId("add-child-message")).toHaveTextContent("Seat created.");
      await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["family"] }));
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["subscription"] });
    });

    it("omits display_name when it is blank and never logs the password into the page", async () => {
      routeGets({ family: family({ seats: [] }) });
      apiPost.mockResolvedValue({ seats: [] });
      const { container } = (await renderFamily(), { container: document.body });
      await screen.findByTestId("add-child-form");
      fill({ name: "  " });
      await waitFor(() => expect(apiPost).toHaveBeenCalled());
      expect(apiPost.mock.calls[0][1]).not.toHaveProperty("display_name");
      expect(container.textContent).not.toContain("longenough1");
    });

    it("shows the backend's own refusal (paid plan, duplicate email, full)", async () => {
      const { ApiError } = await import("@/services/api");
      routeGets({ family: family({ seats: [SEAT_A] }) });
      await renderFamily();
      await screen.findByTestId("add-child-form");
      apiPost.mockRejectedValueOnce(new ApiError(402, "family seats need a live paid subscription"));
      fill();
      expect(await screen.findByTestId("add-child-message")).toHaveTextContent("live paid subscription");
      apiPost.mockRejectedValueOnce(new ApiError(409, "email already registered"));
      fireEvent.click(screen.getByRole("button", { name: "Create seat" }));
      await waitFor(() => expect(screen.getByTestId("add-child-message")).toHaveTextContent("email already registered"));
    });
  });

  describe("managing a seat", () => {
    it("Suspend/Resume POST /family/sub-account/override with the opposite status", async () => {
      routeGets({});
      apiPost.mockResolvedValue({ family_id: "f-1", seats: [] });
      const { invalidate } = await renderFamily();
      fireEvent.click(await screen.findByRole("button", { name: "Suspend Mira" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/sub-account/override", { child_user_id: "c-1", status: "suspended" }));
      fireEvent.click(screen.getByRole("button", { name: "Resume teen@example.com" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/sub-account/override", { child_user_id: "c-2", status: "active" }));
      await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["family"] }));
    });

    it("Remove asks for a second click, then POSTs the child's id", async () => {
      routeGets({});
      apiPost.mockResolvedValue({ family_id: "f-1", seats: [], quote: {} });
      await renderFamily();
      fireEvent.click(await screen.findByRole("button", { name: "Remove Mira" }));
      expect(apiPost).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Confirm remove Mira" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/sub-account/remove", { child_user_id: "c-1" }));
    });

    it("a refused change shows the reason on that seat and does not refresh as if it worked", async () => {
      const { ApiError } = await import("@/services/api");
      routeGets({});
      apiPost.mockRejectedValue(new ApiError(404, "no such seat in this family"));
      const { invalidate } = await renderFamily();
      fireEvent.click(await screen.findByRole("button", { name: "Suspend Mira" }));
      expect(await within(screen.getByTestId("seat-1")).findByTestId("seat-error")).toHaveTextContent("no such seat");
      expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["family"] });
    });
  });

  describe("a child's friends (GET /family/friends/{child})", () => {
    async function openFriends() {
      routeGets({});
      const r = await renderFamily();
      fireEvent.click(await screen.findByRole("button", { name: "Friends of Mira" }));
      await screen.findByTestId("child-friends-panel");
      return r;
    }

    it("lists friends, requests awaiting approval and pending requests, and fetches with the child id", async () => {
      await openFriends();
      expect(apiGet).toHaveBeenCalledWith("/family/friends/c-1");
      const panel = screen.getByTestId("child-friends-panel");
      expect(panel).toHaveTextContent("Sam");
      expect(panel).toHaveTextContent("Approved");
      expect(panel).toHaveTextContent("Alex");
      expect(panel).toHaveTextContent("Waiting for a reply");
    });

    it("Approve / Decline / Block POST the friendship id with the backend's action names", async () => {
      apiPost.mockResolvedValue({});
      await openFriends();
      fireEvent.click(screen.getByRole("button", { name: "Approve Alex for Mira" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/friends/respond", { friendship_id: "fr-2", action: "approve" }));
      fireEvent.click(screen.getByRole("button", { name: "Decline Alex for Mira" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/friends/respond", { friendship_id: "fr-2", action: "decline" }));
      fireEvent.click(screen.getByRole("button", { name: "Block Alex for Mira" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/friends/respond", { friendship_id: "fr-2", action: "block" }));
    });

    it("removing a friend needs confirmation, then POSTs /family/friends/revoke", async () => {
      apiPost.mockResolvedValue({});
      await openFriends();
      fireEvent.click(screen.getByRole("button", { name: "Remove Sam from Mira" }));
      expect(apiPost).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Confirm remove Sam from Mira" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/friends/revoke", { friendship_id: "fr-1" }));
    });

    it("adding a friend for the child sends { child_user_id, email } and shows backend refusals", async () => {
      const { ApiError } = await import("@/services/api");
      await openFriends();
      const input = within(screen.getByTestId("child-friends-panel")).getByPlaceholderText("friend@example.com");
      apiPost.mockResolvedValueOnce({ friendship_id: "x", status: "pending" });
      fireEvent.change(input, { target: { value: "pal@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));
      await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/family/friends/request", { child_user_id: "c-1", email: "pal@example.com" }));
      expect(await screen.findByTestId("child-friends-note")).toHaveTextContent("Request sent.");
      apiPost.mockRejectedValueOnce(new ApiError(404, "no such learner"));
      fireEvent.change(input, { target: { value: "ghost@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));
      await waitFor(() => expect(screen.getByTestId("child-friends-note")).toHaveTextContent("no such learner"));
    });

    it("a failed friends load shows an error with Retry", async () => {
      routeGets({ friends: new Error("friends down") });
      await renderFamily();
      fireEvent.click(await screen.findByRole("button", { name: "Friends of Mira" }));
      expect(await screen.findByTestId("child-friends-error")).toHaveTextContent("friends down");
    });
  });

  it("explicit mock mode: an empty free family and no requests", async () => {
    await renderFamily(true);
    expect(await screen.findByTestId("family-empty")).toBeInTheDocument();
    expect(screen.getByTestId("family-needs-plan")).toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
  });
});
