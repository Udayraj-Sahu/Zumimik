import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cold dynamic imports of the page can exceed the 5s default when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const apiPost = vi.fn();
const push = vi.fn();
let params = new URLSearchParams();

vi.mock("@/services/api", async (orig) => ({
  ...(await orig<object>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => params,
  usePathname: () => "/learn/explorer",
}));

const TOPICS = {
  topics: [
    { topic: "Vedic Mathematics", problems: 130, subtopics: 115 },
    { topic: "Cognitive Deficits", problems: 2, subtopics: 2 },
  ],
};
const TECHNIQUES = {
  techniques: [
    { name: "Arithmetic", topic: "Arithmetic", sub_topic: null, is_root: true, problem_count: 383 },
    { name: "Fractions and Decimals", topic: "Arithmetic", sub_topic: "Fractions and Decimals", is_root: null, problem_count: 91 },
    { name: "Long Division", topic: "Arithmetic", sub_topic: "Division", is_root: null, problem_count: 12 },
    { name: "Mystery Skill", topic: null, sub_topic: null, is_root: null, problem_count: 5 },
  ],
};
const CATALOG = {
  skills: [{ skill: "Fractions and Decimals", servable: 9, feeds_mastery: 9, by_difficulty: {}, generated: 0, parents: [] }],
};
const MASTERY = [
  { name: "Fractions and Decimals", value: 64, color: "primary" },
  { name: "Quadratics", value: 20, color: "primary" },
];

function routeApi(over: Partial<Record<"topics" | "techniques" | "catalog" | "mastery", unknown>> = {}) {
  const table: Record<string, unknown> = {
    "/api/topics": over.topics ?? TOPICS,
    "/api/practice/techniques?limit=500": over.techniques ?? TECHNIQUES,
    "/practice/catalog": over.catalog ?? CATALOG,
    "/dashboard/topics": over.mastery ?? MASTERY,
  };
  apiGet.mockImplementation(async (path: string) => {
    const key = path.startsWith("/dashboard/topics") ? "/dashboard/topics" : path;
    if (!(key in table)) throw new Error(`unexpected GET ${path}`);
    const value = table[key];
    if (value instanceof Error) throw value;
    return value;
  });
}

async function renderExplorer(opts: { mock?: boolean; exam?: string; preps?: string[]; activePath?: string | null } = {}) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", opts.mock ? "true" : "false");
  const { default: Page } = await import("@/app/(app)/learn/explorer/page");
  const { useOnboardingStore } = await import("@/stores/onboarding-store");
  useOnboardingStore.setState({
    targetExam: opts.exam ?? "cat",
    activePreps: opts.preps ?? [opts.exam ?? "cat"],
    activePath: (opts.activePath ?? null) as never,
    isOnboarded: true,
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  return { view, client, store: useOnboardingStore };
}

const calls = (path: string) => apiGet.mock.calls.filter(([p]) => p === path).length;

describe("global topic/technique mapping", () => {
  it("builds subjects from skills (topic → sub-topic → skill), an uncategorised group, and the problem bank", async () => {
    const { buildGlobalExplorerTree } = await import("@/services/explorer-tree");
    const tree = buildGlobalExplorerTree(TOPICS, TECHNIQUES);
    expect(tree.map((s) => s.title)).toEqual(["Arithmetic", "Other skills", "Problem bank"]);

    const arithmetic = tree[0];
    const direct = arithmetic.children!.filter((c) => c.type === "technique").map((c) => c.techniqueId);
    expect(direct).toEqual(["Arithmetic", "Fractions and Decimals"]); // sub_topic === own name is not a grouping
    const division = arithmetic.children!.find((c) => c.type === "subtopic")!;
    expect(division.title).toBe("Division");
    expect(division.children![0]).toMatchObject({ techniqueId: "Long Division", description: "12 problems" });

    expect(tree[1].children![0]).toMatchObject({ techniqueId: "Mystery Skill" }); // null topic is NOT guessed into a topic
    const bank = tree[2];
    expect(bank.children![0]).toMatchObject({ type: "topic", description: "130 problems · 115 subtopics" });
    // Bank topics are not practicable skills: no techniqueId.
    expect(bank.children!.every((c) => c.techniqueId === undefined)).toBe(true);
  });

  it("never labels anything as an exam", async () => {
    const { buildGlobalExplorerTree } = await import("@/services/explorer-tree");
    const text = JSON.stringify(buildGlobalExplorerTree(TOPICS, TECHNIQUES)).toLowerCase();
    for (const exam of ["cat", "gmat", "gre"]) expect(text).not.toMatch(new RegExp(`\\b${exam}\\b`));
  });

  it("an empty backend yields no subjects", async () => {
    const { buildGlobalExplorerTree } = await import("@/services/explorer-tree");
    expect(buildGlobalExplorerTree({ topics: [] }, { techniques: [] })).toEqual([]);
  });
});

describe("query keys: exam and learning path", () => {
  it("global data is keyed without the exam, so switching exams does not refetch or fork the cache", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    const { explorerKeys } = await import("@/hooks/queries/use-explorer");
    expect(explorerKeys.tree("cat")).toEqual(explorerKeys.tree("gmat"));
    expect(explorerKeys.techniques("cat")).toEqual(explorerKeys.techniques("gre"));
    expect(explorerKeys.mastery()).not.toEqual(explorerKeys.tree("cat")); // mastery is separate from the catalog
  });

  it("the exam joins the key only once the backend can scope the catalog to it", async () => {
    const { explorerScopeKey } = await import("@/lib/exam-scope");
    expect(explorerScopeKey("cat", false, false)).toBe("global");
    expect(explorerScopeKey("gmat", false, false)).toBe("global");
    expect(explorerScopeKey("cat", false, true)).toBe("cat");
    expect(explorerScopeKey("gmat", false, true)).toBe("gmat");
  });

  it("mock fixtures are per exam, so mock mode keys include it", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "true");
    const { explorerKeys } = await import("@/hooks/queries/use-explorer");
    expect(explorerKeys.tree("cat")).not.toEqual(explorerKeys.tree("gmat"));
  });

  it("exam and learning path are resolved independently", async () => {
    const { resolveExplorerScope } = await import("@/lib/exam-scope");
    expect(resolveExplorerScope("cat", "vedic_standalone")).toMatchObject({ exam: "cat", activePath: "vedic_standalone", catalog: "global", examCatalogUnavailable: true });
    expect(resolveExplorerScope("gmat", "vedic_standalone").activePath).toBe("vedic_standalone");
    expect(resolveExplorerScope("cat", "exam_prep").exam).toBe("cat");
    expect(resolveExplorerScope(null, "exam_prep").examCatalogUnavailable).toBe(false);
  });
});

describe("/learn/explorer in real mode", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    push.mockReset();
    params = new URLSearchParams();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/mock/explorer");
    vi.doUnmock("@/lib/mock/topic-node-map");
    vi.doUnmock("@/lib/mock/techniques");
  });

  it("shows the real global catalog, labelled as global, and says the exam catalog is not configured", async () => {
    routeApi();
    await renderExplorer({ exam: "cat" });
    expect(await screen.findByText("Other skills")).toBeInTheDocument();
    expect(screen.getByText("Problem bank")).toBeInTheDocument();
    const notice = screen.getByTestId("global-topics-notice");
    expect(notice).toHaveTextContent("exam-specific catalog for CAT is not configured");
    expect(notice).toHaveTextContent("shared across all exams");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Explore Topics"); // not "Explore CAT"
    expect(calls("/api/topics")).toBe(1);
    expect(apiGet).toHaveBeenCalledWith("/api/practice/techniques?limit=500");
    // no exam is ever sent
    expect(apiGet.mock.calls.every(([p]) => !/exam=|domain=|cat\b/i.test(String(p).replace("catalog", "")))).toBe(true);
  });

  it("changing the exam updates the notice but neither refetches global data nor touches the learning path", async () => {
    routeApi();
    const { store } = await renderExplorer({ exam: "cat", preps: ["cat", "gmat"], activePath: "vedic_standalone" });
    await screen.findByText("Other skills");
    const before = { topics: calls("/api/topics"), techniques: calls("/api/practice/techniques?limit=500") };

    fireEvent.click(screen.getByRole("button", { name: /GMAT/ }));
    await waitFor(() => expect(screen.getByTestId("global-topics-notice")).toHaveTextContent("GMAT"));
    expect(calls("/api/topics")).toBe(before.topics);
    expect(calls("/api/practice/techniques?limit=500")).toBe(before.techniques);
    expect(store.getState().activePath).toBe("vedic_standalone");
    expect(store.getState().targetExam).toBe("cat"); // the tab is a view switch, not a profile change
  });

  it("never presents the global topics as exam topics, whichever exam is selected", async () => {
    routeApi();
    const { view } = await renderExplorer({ exam: "gre" });
    await screen.findByText("Other skills");
    // "GRE" may appear only inside the two explicit disclaimers, never as a title of the data itself.
    const clone = view.container.cloneNode(true) as HTMLElement;
    for (const id of ["global-topics-notice", "mastery-panel"]) clone.querySelector(`[data-testid="${id}"]`)?.remove();
    expect(clone.textContent).not.toMatch(/\bGRE\b/);
    expect(screen.getByTestId("global-topics-notice")).toHaveTextContent("not configured");
  });

  it("shows an error with a working retry when the catalog fails", async () => {
    routeApi({ topics: new Error("boom") });
    await renderExplorer();
    expect(await screen.findByTestId("explorer-error")).toBeInTheDocument();
    routeApi();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Other skills")).toBeInTheDocument();
  });

  it("shows an empty state for an empty catalog", async () => {
    routeApi({ topics: { topics: [] }, techniques: { techniques: [] } });
    await renderExplorer();
    expect(await screen.findByTestId("explorer-empty")).toBeInTheDocument();
  });

  describe("mastery is separate from the catalog", () => {
    it("lists the learner's mastery in its own panel; only catalog-served skills link to Practice", async () => {
      routeApi();
      await renderExplorer();
      const panel = await screen.findByTestId("mastery-panel");
      await waitFor(() => expect(panel).toHaveTextContent("64%"));
      expect(panel).toHaveTextContent("Quadratics");
      expect(panel).toHaveTextContent("not a CAT syllabus");
      // The catalog and mastery resolve independently, so wait for the catalog-gated link.
      const link = await screen.findByRole("link", { name: "Practise Fractions and Decimals" });
      expect(link).toHaveAttribute("href", "/learn/practice?skill=Fractions%20and%20Decimals");
      expect(screen.queryByRole("link", { name: "Practise Quadratics" })).not.toBeInTheDocument();
      expect(apiGet.mock.calls.some(([p]) => String(p).startsWith("/dashboard/topics"))).toBe(true);
    });

    it("mastery failure and emptiness do not affect the catalog", async () => {
      routeApi({ mastery: new Error("nope") });
      await renderExplorer();
      expect(await screen.findByTestId("mastery-error")).toBeInTheDocument();
      expect(screen.getByText("Other skills")).toBeInTheDocument();

      routeApi({ mastery: [] });
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(await screen.findByTestId("mastery-empty")).toBeInTheDocument();
    });
  });

  it("opens Practice with the verified skill id from a technique node", async () => {
    routeApi();
    await renderExplorer();
    await screen.findByText("Other skills");
    const node = await screen.findByRole("button", { name: /Fractions and Decimals/ });
    fireEvent.click(node);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/learn/practice?skill=Fractions%20and%20Decimals"));
  });

  it("does not open Practice for a skill the practice catalog does not serve", async () => {
    routeApi({ catalog: { skills: [] } });
    await renderExplorer();
    await screen.findByText("Other skills");
    const node = await screen.findByRole("button", { name: /Fractions and Decimals/ });
    fireEvent.click(node);
    expect(push).not.toHaveBeenCalled();
  });

  it("focuses a node from ?topic= using real names (case-insensitive)", async () => {
    routeApi();
    params = new URLSearchParams({ topic: "fractions and decimals" });
    await renderExplorer();
    await waitFor(() => expect(screen.getByRole("button", { name: /Fractions and Decimals/ })).toBeInTheDocument());
  });

  it("uses no mock fixtures: no mock tree, topic map or bundled lessons are loaded", async () => {
    const touched = vi.fn();
    for (const m of ["explorer", "topic-node-map", "techniques"]) {
      vi.doMock(`@/lib/mock/${m}`, () => {
        touched(m);
        return {};
      });
    }
    routeApi({ topics: new Error("down") });
    await renderExplorer({ exam: "cat" });
    await screen.findByTestId("explorer-error");
    expect(touched).not.toHaveBeenCalled();
    expect(screen.queryByText("Quantitative Aptitude")).not.toBeInTheDocument();
  });
});

describe("/learn/explorer in explicit mock mode", () => {
  beforeEach(() => {
    apiGet.mockReset();
    localStorage.clear();
    params = new URLSearchParams();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("still renders the per-exam development fixtures without calling the backend", async () => {
    await renderExplorer({ mock: true, exam: "cat" });
    const { getSubjectTree } = await import("@/lib/mock/explorer");
    const first = getSubjectTree("cat")[0];
    expect(await screen.findByText(first.title)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Explore CAT");
    expect(screen.queryByTestId("global-topics-notice")).not.toBeInTheDocument();
    expect(apiGet.mock.calls.filter(([p]) => String(p).startsWith("/api/")).length).toBe(0);
  });
});

describe("Practice deep link from the Explorer", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  async function renderPractice(skill: string) {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    params = new URLSearchParams({ skill });
    routeApi();
    const { default: Practice } = await import("@/app/(app)/learn/practice/page");
    const { useOnboardingStore } = await import("@/stores/onboarding-store");
    useOnboardingStore.setState({ targetExam: "cat", isOnboarded: true });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Practice />
      </QueryClientProvider>,
    );
  }

  it("preselects a skill the catalog serves, enabling Start", async () => {
    await renderPractice("Fractions and Decimals");
    await screen.findByRole("button", { name: "Select Fractions and Decimals" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Start Practice/ })).toBeEnabled());
  });

  it("ignores a skill the catalog does not serve", async () => {
    await renderPractice("Not A Skill");
    await screen.findByRole("button", { name: "Select Fractions and Decimals" });
    expect(screen.getByRole("button", { name: /Start Practice/ })).toBeDisabled();
  });
});
