import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  it.each(PAGES)("%s says it is not available yet instead of showing made-up records", async (title, load) => {
    const { default: Page } = await load();
    wrap(<Page />);
    expect(screen.getByTestId("feature-unavailable")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });
});
