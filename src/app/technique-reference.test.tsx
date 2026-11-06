import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });

const apiGet = vi.fn();
const catalog = vi.fn();

vi.mock("@/services/api", async (orig) => ({ ...(await orig<object>()), apiGet: (...a: unknown[]) => apiGet(...a) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "nikhilam_sutra" }),
  usePathname: () => "/learn/technique/nikhilam_sutra",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/queries/use-sprint", () => ({ useSprintTopics: () => catalog() }));

const CARD = {
  subtopic_id: "nikhilam_sutra",
  name: "Nikhilam Navatashcaramam Dashatah",
  topic: "Vedic Math",
  category: "Foundation",
  sutra: "Nikhilam Navatashcaramam Dashatah",
  sutra_sanskrit: "निखिलं नवतश्चरमं दशतः",
  translation: "All from 9 and the last from 10",
  quick_ref: {
    the_trick: { mental_steps: ["1. Pick the base from the digit count"], difficulty_label: "Beginner-friendly", time_saved: "5-8x faster" },
    when_to_use: { conditions: ["Both numbers are close to the same power of 10"], range_rule: "within 25% of the base" },
    top_traps: [{ name: "Wrong Base", description: "Choosing a base that does not match the digit count", prevention: "Count digits first" }],
    quick_example: { problem: "96 × 93", answer: "8928" },
  },
  techniques_by_difficulty: {
    L1: [{ name: "Base 10", focus: "Single-digit deviations", example: { problem: "8 × 12", answer: "96" }, template_count: 12 }],
    L2: [{ name: "Base 100", focus: "Two-digit deviations", example: { problem: "97 × 103", answer: "9991" }, template_count: 18 }],
  },
  total_techniques: 2,
  attached_templates: 30,
  attached_by_level: { L2: 18 },
  content_status: "complete",
  review_status: "approved",
  has_defects: false,
};

async function renderPage(card: unknown, skills: Array<{ id: string; label: string }> = [], corpus: string[] = []) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_MOCK", "false");
  catalog.mockReturnValue({ data: { topics: skills }, isFetched: true });
  apiGet.mockImplementation(async (path: string) => {
    if (path === "/api/subtopics/nikhilam_sutra/reference") {
      if (card instanceof Error) throw card;
      return card;
    }
    if (path === "/api/topics") return { topics: corpus.map((topic) => ({ topic, problems: 1, subtopics: 1 })) };
    throw new Error("unexpected GET " + path);
  });
  const { ClientTechniquePage } = await import("@/app/(app)/learn/technique/[id]/client-page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ClientTechniquePage />
    </QueryClientProvider>,
  );
}

describe("/learn/technique/[id] in real mode (Reference Library)", () => {
  beforeEach(() => {
    apiGet.mockReset();
    catalog.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("shows the header, Quick Reference and Difficulty Levels from the backend card", async () => {
    await renderPage(CARD);
    expect(await screen.findByRole("heading", { level: 1, name: "Nikhilam Navatashcaramam Dashatah" })).toBeInTheDocument();
    expect(screen.getByText("All from 9 and the last from 10")).toBeInTheDocument();
    expect(screen.getByText("Vedic Math › Foundation")).toBeInTheDocument();
    const quick = screen.getByTestId("technique-quick-reference");
    expect(quick).toHaveTextContent("Pick the base from the digit count");
    expect(quick).toHaveTextContent("Both numbers are close to the same power of 10");
    expect(quick).toHaveTextContent("Wrong Base");
    expect(quick).toHaveTextContent("96 × 93 = 8928");
    expect(apiGet).toHaveBeenCalledWith("/api/subtopics/nikhilam_sutra/reference");
  });

  it("level tabs switch between the levels' techniques and examples", async () => {
    await renderPage(CARD);
    const levels = await screen.findByTestId("technique-levels");
    expect(levels).toHaveTextContent("Base 10");
    expect(levels).not.toHaveTextContent("Base 100");
    fireEvent.click(screen.getByRole("tab", { name: "L2" }));
    expect(levels).toHaveTextContent("Base 100");
    expect(levels).toHaveTextContent("97 × 103 = 9991");
    expect(levels).toHaveTextContent("18 practice problems are linked to this level");
  });

  it("offers Practice only when the practice catalog serves a skill with the same name", async () => {
    await renderPage(CARD, [{ id: "Nikhilam Sutra", label: "Nikhilam Sutra" }, { id: "Fractions", label: "Fractions" }]);
    const link = await screen.findByTestId("technique-practice");
    expect(link).toHaveAttribute("href", "/learn/practice?skill=Nikhilam%20Sutra&start=1");
  });

  it("the whole-technique button starts the session straight away", async () => {
    await renderPage(CARD, [{ id: "Nikhilam Sutra", label: "Nikhilam Sutra" }]);
    expect(await screen.findByTestId("technique-practice")).toHaveAttribute("href", "/learn/practice?skill=Nikhilam%20Sutra&start=1");
  });

  it("each difficulty level has its own Practise button that carries that level", async () => {
    await renderPage(CARD, [{ id: "Nikhilam Sutra", label: "Nikhilam Sutra" }]);
    const first = await screen.findByTestId("technique-practice-level");
    expect(first).toHaveTextContent("Practise level 1");
    expect(first).toHaveAttribute("href", "/learn/practice?skill=Nikhilam%20Sutra&level=1");
    fireEvent.click(screen.getByRole("tab", { name: "L2" }));
    expect(screen.getByTestId("technique-practice-level")).toHaveAttribute("href", "/learn/practice?skill=Nikhilam%20Sutra&level=2");
  });

  it("a skill that starts with the page's first word is used when it is the only one (spelling differs)", async () => {
    await renderPage({ ...CARD, subtopic_id: "urdhva_tiryak", name: "Urdhva-Tiryakbhyam", sutra: "Urdhva-Tiryakbhyam" }, [
      { id: "Urdhva Tiryagbhyam (Vertically and Crosswise)", label: "Urdhva Tiryagbhyam" },
      { id: "Fractions", label: "Fractions" },
    ]);
    // the mocked route serves nikhilam_sutra's id, so only the practice link is asserted here
    expect(await screen.findByTestId("technique-practice")).toHaveAttribute("href", expect.stringContaining("Urdhva%20Tiryagbhyam"));
  });

  it("with no matching skill, falls back to practising the page's whole topic when the problem bank has it", async () => {
    await renderPage(CARD, [{ id: "Fractions", label: "Fractions" }], ["Algebra", "Vedic Mathematics"]);
    const link = await screen.findByTestId("technique-practice-topic");
    expect(link).toHaveAttribute("href", "/learn/practice?bankTopic=Vedic%20Mathematics");
    expect(link).toHaveTextContent("Practise Vedic Mathematics");
    expect(screen.queryByTestId("technique-practice")).not.toBeInTheDocument();
    // a level cannot be targeted without a skill: no level button, and the page says why
    expect(screen.queryByTestId("technique-practice-level")).not.toBeInTheDocument();
    expect(screen.getByTestId("technique-level-note")).toBeInTheDocument();
  });

  it("no skill and no matching topic: no Practice button at all", async () => {
    await renderPage(CARD, [{ id: "Fractions", label: "Fractions" }], ["Algebra", "Geometry"]);
    await screen.findByTestId("technique-levels");
    expect(screen.queryByTestId("technique-practice")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technique-practice-topic")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technique-practice-level")).not.toBeInTheDocument();
  });

  it("a draft page says it is not ready and shows no card content", async () => {
    await renderPage({ ...CARD, content_status: "needs_human_review", review_status: "pending_human_review" });
    expect(await screen.findByTestId("technique-soon")).toHaveTextContent("isn't ready yet");
    expect(screen.queryByTestId("technique-quick-reference")).not.toBeInTheDocument();
  });

  it("an id with no study card but a catalog skill of that name is the skill's own page, with Practice", async () => {
    await renderPage(new Error("404"), [{ id: "nikhilam_sutra", label: "Nikhilam Sutra" }]);
    expect(await screen.findByTestId("technique-skill")).toHaveTextContent("Nikhilam Sutra");
    expect(screen.getByTestId("technique-skill-note")).toHaveTextContent("no study card");
    expect(screen.getByTestId("technique-practice")).toHaveAttribute("href", "/learn/practice?skill=nikhilam_sutra&start=1");
    expect(screen.queryByTestId("technique-error")).not.toBeInTheDocument();
  });

  it("a skill's URL slug finds the skill by its name", async () => {
    const { skillSlug } = await import("@/lib/reference-ids");
    expect(skillSlug("Fractions and Decimals")).toBe("fractions-and-decimals");
    expect(skillSlug("Basic Operations (+, -, ×, ÷)")).toBe("basic-operations");
    expect(skillSlug("×÷")).toBe("");
  });

  it("a failed load shows 'Technique not found' with Retry", async () => {
    await renderPage(new Error("down"));
    expect(await screen.findByTestId("technique-error")).toHaveTextContent("Technique not found");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("/learn/technique/[id] static params", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("includes the bundled lesson ids, the snapshot ids and the live ids", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ pages: [{ subtopic_id: "brand_new_page" }, { subtopic_id: "bad id!" }] }), { status: 200 })));
    const { generateStaticParams } = await import("@/app/(app)/learn/technique/[id]/page");
    const ids = (await generateStaticParams()).map((p) => p.id);
    expect(ids).toContain("work-rate"); // bundled lesson
    expect(ids).toContain("nikhilam_sutra"); // snapshot
    expect(ids).toContain("brand_new_page"); // live
    expect(ids).not.toContain("bad id!");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to the snapshot when the API cannot be reached", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { generateStaticParams } = await import("@/app/(app)/learn/technique/[id]/page");
    const ids = (await generateStaticParams()).map((p) => p.id);
    expect(ids).toContain("nikhilam_sutra");
    expect(ids).toContain("work-rate");
  });
});

describe("matching a reference page to a practice skill / corpus topic", () => {
  const card = (subtopic_id: string, name: string) => ({ subtopic_id, name, sutra: name });
  const skills = [
    { id: "Nikhilam Sutra" },
    { id: "Nikhilam Navatashcaramam" },
    { id: "Urdhva Tiryagbhyam (Vertically and Crosswise)" },
    { id: "Addition Basics" },
    { id: "Addition of Fractions" },
  ];

  it("prefers an identical name", async () => {
    const { findPracticeSkill } = await import("@/services/reference");
    expect(findPracticeSkill(card("nikhilam_sutra", "Nikhilam Navatashcaramam Dashatah"), skills)?.id).toBe("Nikhilam Sutra");
  });

  it("accepts a same-first-word skill only when exactly one exists", async () => {
    const { findPracticeSkill } = await import("@/services/reference");
    expect(findPracticeSkill(card("urdhva_tiryak", "Urdhva-Tiryakbhyam"), skills)?.id).toBe("Urdhva Tiryagbhyam (Vertically and Crosswise)");
    expect(findPracticeSkill(card("addition_tricks", "Addition Tricks"), skills)).toBeUndefined(); // two "Addition ..." skills: ambiguous
    expect(findPracticeSkill(card("zzz_unknown", "Zzz Unknown"), skills)).toBeUndefined();
  });

  it("maps a page topic to a problem-bank topic by prefix, never from a short or unrelated name", async () => {
    const { findCorpusTopic } = await import("@/services/reference");
    const corpus = ["Algebra", "Vedic Mathematics", "Mathematics"];
    expect(findCorpusTopic("Vedic Math", corpus)).toBe("Vedic Mathematics");
    expect(findCorpusTopic("Algebra", corpus)).toBe("Algebra");
    expect(findCorpusTopic("Maths", corpus)).toBeUndefined();
    expect(findCorpusTopic("Exam Prep", corpus)).toBeUndefined();
  });
});
