import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const PAGES: Array<[string, () => Promise<{ default: () => JSX.Element }>]> = [
  ["Class Calendar", () => import("@/app/(app)/settings/planner/page")],
  ["Linked Devices", () => import("@/app/(app)/settings/linked-devices/page")],
];

describe("pages whose backend API does not exist", () => {
  describe("real mode", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.doMock("@/lib/platform", async (orig) => ({ ...(await orig<object>()), IS_MOCK: false }));
    });

    it.each(PAGES)("%s shows an unavailable state, not fixture records", async (title, load) => {
      const { default: Page } = await load();
      wrap(<Page />);
      expect(screen.getByTestId("feature-unavailable")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    });

    it("Clubs render none of the bundled fixture content", async () => {
      const { MOCK_CLUBS } = await import("@/lib/mock/clubs");
      const clubs = await import("@/app/(app)/dashboard/clubs/page");
      const view = wrap(<clubs.default />);
      for (const club of MOCK_CLUBS) expect(view.container.textContent).not.toContain(club.name);
    });
  });

  describe("explicit mock mode", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.doMock("@/lib/platform", async (orig) => ({ ...(await orig<object>()), IS_MOCK: true }));
    });

    it("Clubs still renders the development fixtures", async () => {
      const { MOCK_CLUBS } = await import("@/lib/mock/clubs");
      const { default: Page } = await import("@/app/(app)/dashboard/clubs/page");
      const view = wrap(<Page />);
      expect(screen.queryByTestId("feature-unavailable")).not.toBeInTheDocument();
      expect(view.container.textContent).toContain(MOCK_CLUBS[0].name);
    });
  });
});
