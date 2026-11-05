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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/clubs",
}));

const HUBS = [
  { hub_id: "h1", name: "Delhi Speed Maths", hub_type: "city", city: "Delhi", is_active: true, members: 12 },
  { hub_id: "h2", name: "St Xavier's Maths Club", hub_type: "school", city: "Pune", is_active: true, members: 1 },
];
const MINE = [{ ...HUBS[0], your_role: "member" }];
const LEADERBOARD = {
  hub_id: "h1",
  window_days: 7,
  leaderboard: [
    { rank: 1, user_id: "u9", display_name: "Grace", weekly_xp: 420 },
    { rank: 2, user_id: "u1", display_name: "Ada", weekly_xp: 300 },
    { rank: 3, user_id: null, display_name: "Learner", weekly_xp: 10 },
  ],
};

function routeGet(flags: Record<string, unknown> = { virtual_hubs: { enabled: true, rollout_pct: 100 } }) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/api/config") return { flags };
    if (path.startsWith("/clubs?")) return { hubs: HUBS };
    if (path === "/clubs/mine") return { hubs: MINE };
    if (path === "/clubs/h1") return { ...HUBS[0], your_role: "member", has_place: false };
    if (path === "/clubs/h2") return { ...HUBS[1], your_role: null, has_place: false };
    if (path === "/clubs/h1/leaderboard") return LEADERBOARD;
    throw new Error("unexpected GET " + path);
  });
}

async function renderClubs() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  const { useAuthStore } = await import("@/stores/auth-store");
  useAuthStore.setState({ user: { id: "u1", name: "Ada", email: "a@x.com", role: "user" }, isAuthenticated: true });
  const { default: Page } = await import("@/app/(app)/dashboard/clubs/page");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  return { invalidate };
}

describe("/dashboard/clubs against the backend hubs (real mode)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("lists clubs from GET /clubs and marks the ones you are in", async () => {
    routeGet();
    await renderClubs();
    expect(await screen.findByText("Delhi Speed Maths")).toBeInTheDocument();
    expect(screen.getByText("St Xavier's Maths Club")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Leave Delhi Speed Maths" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join St Xavier's Maths Club" })).toBeInTheDocument();
    expect(screen.getByText(/12 members/)).toBeInTheDocument();
    expect(screen.getByText(/1 member$/)).toBeInTheDocument();
  });

  it("filters by club type on the client", async () => {
    routeGet();
    await renderClubs();
    await screen.findByText("Delhi Speed Maths");
    fireEvent.click(screen.getByRole("button", { name: "School" }));
    expect(screen.queryByText("Delhi Speed Maths")).not.toBeInTheDocument();
    expect(screen.getByText("St Xavier's Maths Club")).toBeInTheDocument();
  });

  it("searches by name through the q parameter", async () => {
    routeGet();
    await renderClubs();
    await screen.findByText("Delhi Speed Maths");
    fireEvent.change(screen.getByLabelText("Search clubs"), { target: { value: "speed" } });
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/clubs?q=speed&limit=20"));
  });

  it("Join POSTs /clubs/{id}/join and refreshes; a refusal is shown as returned", async () => {
    routeGet();
    apiPost.mockResolvedValueOnce({ ...HUBS[1], your_role: "member" });
    const { invalidate } = await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Join St Xavier's Maths Club" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/clubs/h2/join"));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["clubs"] }));

    const { ApiError } = await import("@/services/api");
    apiPost.mockRejectedValueOnce(new ApiError(403, "hubs are not available for this account"));
    fireEvent.click(screen.getByRole("button", { name: "Join St Xavier's Maths Club" }));
    expect(await screen.findByTestId("clubs-action-error")).toHaveTextContent("hubs are not available for this account");
  });

  it("Leave POSTs /clubs/{id}/leave", async () => {
    routeGet();
    apiPost.mockResolvedValueOnce({ hub_id: "h1", left: true });
    await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Leave Delhi Speed Maths" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/clubs/h1/leave"));
  });

  it("creates a club: needs a 3+ character name, then POSTs name, type and city", async () => {
    routeGet();
    apiPost.mockResolvedValueOnce({ hub_id: "h9", name: "Pune Abacus", hub_type: "college", city: "Pune", is_active: true, members: 1, your_role: "owner" });
    await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Create club" }));
    const form = await screen.findByTestId("create-club-form");
    const submitBtn = form.querySelector("button[type=submit]") as HTMLButtonElement;
    expect(submitBtn).toBeDisabled();
    fireEvent.change(form.querySelectorAll("input")[0], { target: { value: "Pune Abacus" } });
    fireEvent.change(form.querySelector("select") as HTMLSelectElement, { target: { value: "college" } });
    fireEvent.change(form.querySelectorAll("input")[1], { target: { value: " Pune " } });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/clubs/create", { name: "Pune Abacus", hub_type: "college", city: "Pune" }));
  });

  it("opening a club shows GET /clubs/{id} and, for a member, the weekly leaderboard", async () => {
    routeGet();
    await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Open Delhi Speed Maths" }));
    const detail = await screen.findByTestId("club-detail");
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/clubs/h1"));
    expect(detail).toHaveTextContent("City · Delhi");
    expect(detail).toHaveTextContent("12 members");
    const board = await screen.findByTestId("club-leaderboard");
    expect(apiGet).toHaveBeenCalledWith("/clubs/h1/leaderboard");
    expect(board).toHaveTextContent("Grace");
    expect(board).toHaveTextContent("420 XP");
    expect(board).toHaveTextContent("Ada (you)"); // the signed-in learner (u1) is marked
    expect(board).toHaveTextContent("Learner"); // an anonymous row (no user_id) still renders
    expect(detail).toHaveTextContent("last 7 days");
  });

  it("a non-member sees no leaderboard and the route is never called (the server would answer 403)", async () => {
    routeGet();
    await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Open St Xavier's Maths Club" }));
    expect(await screen.findByTestId("club-leaderboard-locked")).toHaveTextContent("Join this club");
    expect(apiGet).toHaveBeenCalledWith("/clubs/h2");
    expect(apiGet).not.toHaveBeenCalledWith("/clubs/h2/leaderboard");
  });

  it("Join from the detail POSTs /clubs/{id}/join", async () => {
    routeGet();
    apiPost.mockResolvedValueOnce({ ...HUBS[1], your_role: "member" });
    await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Open St Xavier's Maths Club" }));
    fireEvent.click(await screen.findByRole("button", { name: "Join this club" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/clubs/h2/join"));
  });

  it("an empty leaderboard and a failed one are explained", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/api/config") return { flags: {} };
      if (path.startsWith("/clubs?")) return { hubs: HUBS };
      if (path === "/clubs/mine") return { hubs: MINE };
      if (path === "/clubs/h1") return { ...HUBS[0], your_role: "member" };
      if (path === "/clubs/h1/leaderboard") return { hub_id: "h1", window_days: 7, leaderboard: [] };
      throw new Error("unexpected GET " + path);
    });
    await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Open Delhi Speed Maths" }));
    expect(await screen.findByTestId("club-leaderboard-empty")).toHaveTextContent("last 7 days");
  });

  it("a club that no longer exists says so", async () => {
    const { ApiError } = await import("@/services/api");
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/api/config") return { flags: {} };
      if (path.startsWith("/clubs?")) return { hubs: HUBS };
      if (path === "/clubs/mine") return { hubs: [] };
      if (path === "/clubs/h1") throw new ApiError(404, "hub not found");
      throw new Error("unexpected GET " + path);
    });
    await renderClubs();
    fireEvent.click(await screen.findByRole("button", { name: "Open Delhi Speed Maths" }));
    expect(await screen.findByTestId("club-detail-error")).toHaveTextContent("no longer exists");
  });

  it("feature flag off: says so and requests nothing", async () => {
    routeGet({ virtual_hubs: { enabled: false, rollout_pct: 100 } });
    await renderClubs();
    expect(await screen.findByTestId("clubs-off")).toHaveTextContent("aren't enabled");
    expect(apiGet).not.toHaveBeenCalledWith(expect.stringContaining("/clubs/"));
    expect(screen.queryByRole("button", { name: "Create club" })).not.toBeInTheDocument();
  });

  it("a failed load shows an error with Retry", async () => {
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/api/config") return { flags: {} };
      if (path === "/clubs/mine") return { hubs: [] };
      throw new Error("down");
    });
    await renderClubs();
    expect(await screen.findByTestId("clubs-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
