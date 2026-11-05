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

const REFERENCE_PAGES = {
  count: 3,
  pages: [
    { subtopic_id: "nikhilam_sutra", topic: "Vedic Math", category: "Foundation", content_status: "complete", review_status: "approved", has_defects: false, attached_templates: 102 },
    { subtopic_id: "urdhva_tiryak", topic: "Vedic Math", category: "Foundation", content_status: "needs_human_review", review_status: "pending_human_review", has_defects: false, attached_templates: 0 },
    { subtopic_id: "draft_with_defects", topic: "Maths", category: "Foundation", content_status: "complete", review_status: "approved", has_defects: true, attached_templates: 3 },
  ],
};
const REFERENCE_CARD = {
  subtopic_id: "nikhilam_sutra",
  name: "Nikhilam Navatashcaramam Dashatah",
  topic: "Vedic Math",
  category: "Foundation",
  sutra: "Nikhilam Navatashcaramam Dashatah",
  sutra_sanskrit: "निखिलं नवतश्चरमं दशतः",
  translation: "All from 9 and the last from 10",
  quick_ref: {
    the_trick: { mental_steps: ["1. Pick the base from the digit count"], difficulty_label: "Beginner-friendly" },
    top_traps: [{ name: "Wrong Base", description: "Choosing a base that does not match the digit count", prevention: "Count digits first" }],
    quick_example: { problem: "96 × 93", answer: "8928" },
  },
  techniques_by_difficulty: { L1: [{ name: "Base 10" }], L2: [{ name: "Base 100" }] },
  total_techniques: 2,
  attached_templates: 102,
  attached_by_level: { L2: 18 },
  content_status: "complete",
  review_status: "approved",
  has_defects: false,
};

function routeApi(over: Partial<Record<"topics" | "techniques" | "catalog" | "mastery" | "reference", unknown>> = {}) {
  const table: Record<string, unknown> = {
    "/api/topics": over.topics ?? TOPICS,
    "/api/practice/techniques?limit=500": over.techniques ?? TECHNIQUES,
    "/practice/catalog": over.catalog ?? CATALOG,
    "/dashboard/topics": over.mastery ?? MASTERY,
    "/api/subtopics/reference": over.reference ?? REFERENCE_PAGES,
    "/api/subtopics/nikhilam_sutra/reference": REFERENCE_CARD,
  };
  apiGet.mockImplementation(async (path: string) => {
    let key = path;
    if (path.startsWith("/dashboard/topics")) key = "/dashboard/topics";
    else if (path.startsWith("/api/topics")) key = "/api/topics";
    else if (path.startsWith("/api/practice/techniques")) key = "/api/practice/techniques?limit=500";
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
const callsStarting = (prefix: string) => apiGet.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length;

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

  it("exam topics are shown but not linked to practice (their names are not corpus labels)", async () => {
    const { buildGlobalExplorerTree } = await import("@/services/explorer-tree");
    const examTopics = { topics: [{ topic: "Quantitative Aptitude", problems: 25, subtopics: 4 }] };
    const linked = buildGlobalExplorerTree(examTopics, { techniques: [] });
    expect(linked[0].children![0].bankTopic).toBe("Quantitative Aptitude");
    const unlinked = buildGlobalExplorerTree(examTopics, { techniques: [] }, { linkBankTopics: false });
    expect(unlinked[0].children![0].bankTopic).toBeUndefined();
    expect(unlinked[0].children![0].title).toBe("Quantitative Aptitude");
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
  it("exam-scoped data is keyed per exam, so each exam has its own cache entry", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    const { explorerKeys } = await import("@/hooks/queries/use-explorer");
    expect(explorerKeys.tree("cat")).not.toEqual(explorerKeys.tree("gmat"));
    expect(explorerKeys.techniques("cat")).not.toEqual(explorerKeys.techniques("gre"));
    expect(explorerKeys.mastery("cat")).not.toEqual(explorerKeys.mastery("gmat")); // mastery is per exam too
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
    expect(resolveExplorerScope("cat", "vedic_standalone")).toMatchObject({ exam: "cat", activePath: "vedic_standalone", catalog: "exam", examCatalogUnavailable: false });
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

  it("asks the backend for the selected exam's topics and says so", async () => {
    routeApi();
    await renderExplorer({ exam: "cat" });
    expect(await screen.findByText("Other skills")).toBeInTheDocument();
    expect(screen.getByText("Problem bank")).toBeInTheDocument();
    expect(screen.getByTestId("global-topics-notice")).toHaveTextContent("Showing the topics and techniques for CAT");
    expect(screen.getByTestId("global-topics-notice")).not.toHaveTextContent("shared across all exams");
    expect(apiGet).toHaveBeenCalledWith("/api/topics?domain=cat");
    expect(apiGet).toHaveBeenCalledWith("/api/practice/techniques?domain=cat&limit=500");
    expect(apiGet).toHaveBeenCalledWith("/dashboard/topics?domain=cat");
  });

  it("changing the exam refetches that exam's topics and techniques, and never touches the learning path", async () => {
    routeApi();
    const { store } = await renderExplorer({ exam: "cat", preps: ["cat", "gmat"], activePath: "vedic_standalone" });
    await screen.findByText("Other skills");
    expect(callsStarting("/api/topics?domain=gmat")).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: /GMAT/ }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/api/topics?domain=gmat"));
    expect(apiGet).toHaveBeenCalledWith("/api/practice/techniques?domain=gmat&limit=500");
    expect(apiGet).toHaveBeenCalledWith("/dashboard/topics?domain=gmat");
    await waitFor(() => expect(screen.getByTestId("global-topics-notice")).toHaveTextContent("GMAT"));
    expect(store.getState().activePath).toBe("vedic_standalone");
    expect(store.getState().targetExam).toBe("cat"); // the tab is a view switch, not a profile change
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
      expect(panel).toHaveTextContent("Your mastery across CAT topics.");
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

  it("starts a GET /practice/session for a problem-bank topic label", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
    params = new URLSearchParams({ bankTopic: "Number Theory" });
    apiGet.mockImplementation(async (path: string) => {
      if (path === "/practice/catalog") return CATALOG;
      if (path.startsWith("/practice/session")) return { items: [], summary: { requested: 10, served: 0 } };
      throw new Error(`unexpected GET ${path}`);
    });
    const { default: Practice } = await import("@/app/(app)/learn/practice/page");
    const { useOnboardingStore } = await import("@/stores/onboarding-store");
    useOnboardingStore.setState({ targetExam: "cat", isOnboarded: true });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Practice />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/practice/session?topic=Number%20Theory&size=10"));
    expect(apiPost).not.toHaveBeenCalledWith("/practice/session", expect.anything());
  });
});

describe("/learn/explorer quick reference (GET /api/subtopics/reference)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    localStorage.clear();
    params = new URLSearchParams();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("lists finished pages as cards and the rest, including a page with defects, as coming soon", async () => {
    routeApi();
    await renderExplorer({ exam: "cat" });
    const ready = await screen.findByTestId("reference-ready");
    expect(ready).toHaveTextContent("Nikhilam Sutra");
    expect(ready).toHaveTextContent("102 practice problems");
    expect(ready).not.toHaveTextContent("Urdhva Tiryak");
    const soon = screen.getByTestId("reference-soon");
    expect(soon).toHaveTextContent("Coming soon (2)");
    expect(soon).toHaveTextContent("Urdhva Tiryak");
    expect(soon).toHaveTextContent("Draft With Defects");
  });

  it("opens the card for a finished page from GET /api/subtopics/{id}/reference", async () => {
    routeApi();
    await renderExplorer({ exam: "cat" });
    fireEvent.click(await screen.findByRole("button", { name: /Nikhilam Sutra/ }));
    expect(await screen.findByText("All from 9 and the last from 10")).toBeInTheDocument();
    expect(screen.getByText("Wrong Base")).toBeInTheDocument();
    expect(screen.getByText(/96 × 93 = 8928/)).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith("/api/subtopics/nikhilam_sutra/reference");
  });

  it("shows a retryable error without affecting the rest of the Explorer", async () => {
    routeApi({ reference: new Error("down") });
    await renderExplorer({ exam: "cat" });
    expect(await screen.findByTestId("reference-error")).toBeInTheDocument();
    expect(screen.getByTestId("mastery-panel")).toBeInTheDocument();
  });

  it("is not shown in explicit mock mode (no fixtures, no request)", async () => {
    await renderExplorer({ mock: true, exam: "cat" });
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("quick-reference")).not.toBeInTheDocument();
    expect(apiGet.mock.calls.filter(([path]) => String(path).includes("/api/subtopics")).length).toBe(0);
  });
});
