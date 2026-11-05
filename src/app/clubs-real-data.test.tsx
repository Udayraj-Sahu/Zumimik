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

function routeGet(flags: Record<string, unknown> = { virtual_hubs: { enabled: true, rollout_pct: 100 } }) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/api/config") return { flags };
    if (path.startsWith("/clubs/search")) return { hubs: HUBS };
    if (path === "/clubs/mine") return { hubs: MINE };
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

  it("lists clubs from GET /clubs/search and marks the ones you are in", async () => {
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
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/clubs/search?q=speed&limit=20"));
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
