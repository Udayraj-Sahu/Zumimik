import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXAM_TOPIC_CATALOG_SUPPORTED,
  globalTopicsNotice,
  isActivePath,
  isExamScopedDomain,
  resolveExplorerScope,
  examMasteryNotice,
  masteryNotice,
  toBackendTargetExam,
} from "./exam-scope";
import { useOnboardingStore } from "@/stores/onboarding-store";

describe("exam scope contracts", () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it("maps frontend exam ids to backend users.target_exam values only when one exists", () => {
    expect(toBackendTargetExam("cat")).toBe("CAT");
    expect(toBackendTargetExam("gmat")).toBe("GMAT");
    expect(toBackendTargetExam("gre")).toBe("GRE");
    expect(toBackendTargetExam("vedic-math")).toBeNull();
    expect(toBackendTargetExam("")).toBeNull();
  });

  it("changing target exam never changes the active learning path", () => {
    const store = useOnboardingStore.getState();
    store.setActivePath("vedic_standalone");
    store.setTargetExam("cat");
    expect(useOnboardingStore.getState().activePath).toBe("vedic_standalone");
    store.setTargetExam("gre");
    expect(useOnboardingStore.getState().activePath).toBe("vedic_standalone");
    store.setActivePath("exam_prep");
    expect(useOnboardingStore.getState().targetExam).toBe("gre");
  });

  it("validates active_path against the backend enum", () => {
    expect(isActivePath("exam_prep")).toBe(true);
    expect(isActivePath("core_math_vedic")).toBe(true);
    expect(isActivePath("cat")).toBe(false);
    expect(isActivePath(null)).toBe(false);
  });

  it("declares that the backend scopes topics per exam, for the exams it knows", () => {
    expect(EXAM_TOPIC_CATALOG_SUPPORTED).toBe(true);
    for (const d of ["cat", "gmat", "gre", "banking", "vedic-math"]) expect(isExamScopedDomain(d)).toBe(true);
    for (const d of ["school", "", null, undefined]) expect(isExamScopedDomain(d)).toBe(false);
  });

  it("an exam the backend does not scope (it answers with the global catalog) is still reported as unavailable", () => {
    expect(resolveExplorerScope("cat", null)).toMatchObject({ catalog: "exam", examCatalogUnavailable: false });
    expect(resolveExplorerScope("school", null)).toMatchObject({ catalog: "global", examCatalogUnavailable: true });
    expect(examMasteryNotice("CAT")).toBe("Your mastery across CAT topics.");
  });

  it("never labels global topics or mastery as exam content", () => {
    expect(globalTopicsNotice("CAT")).toMatch(/aren't available yet/);
    expect(globalTopicsNotice("CAT")).toMatch(/shared across all exams/);
    expect(masteryNotice("CAT")).toMatch(/not a CAT syllabus/);
  });
});

describe("services: global topics, mastery and practice stay distinct (real API mode)", () => {
  const apiGet = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    apiGet.mockReset();
    vi.doMock("./../services/api", () => ({ apiGet, apiPost: vi.fn() }));
    vi.doMock("@/lib/platform", () => ({ IS_MOCK: false }));
  });

  it("selecting CAT sends the exam as domain to /api/topics and /api/practice/techniques", async () => {
    const { getSubjectTree } = await import("@/services/explorer");
    apiGet.mockImplementation(async (path: string) =>
      path.startsWith("/api/topics")
        ? { topics: [{ topic: "Quantitative Aptitude", problems: 25, subtopics: 4 }] }
        : { techniques: [] },
    );
    const tree = await getSubjectTree("cat");
    expect(apiGet).toHaveBeenCalledWith("/api/topics?domain=cat");
    expect(apiGet).toHaveBeenCalledWith("/api/practice/techniques?domain=cat&limit=500");
    expect(tree[0].children?.[0].title).toBe("Quantitative Aptitude");
  });

  it("with no exam selected, both calls stay global", async () => {
    const { getSubjectTree } = await import("@/services/explorer");
    apiGet.mockResolvedValue({ topics: [], techniques: [] });
    await getSubjectTree("");
    expect(apiGet).toHaveBeenCalledWith("/api/topics");
    expect(apiGet).toHaveBeenCalledWith("/api/practice/techniques?limit=500");
  });

  it("dashboard topics are fetched as mastery only and returned unmodified", async () => {
    const { getTopicMastery } = await import("@/services/dashboard");
    const mastery = [{ name: "Nikhilam", value: 40 }];
    apiGet.mockResolvedValueOnce(mastery);
    expect(await getTopicMastery("cat")).toBe(mastery);
    expect(apiGet).toHaveBeenCalledWith("/dashboard/topics?domain=cat");
  });

  it("practice sessions POST the skill as a slot to /practice/session, never sending an exam or domain", async () => {
    const apiPost = vi.fn().mockResolvedValue({ items: [], summary: { requested: 5, served: 0 } });
    vi.doMock("./../services/api", () => ({ apiGet, apiPost }));
    const { getPracticeSession } = await import("@/services/practice");
    await getPracticeSession("nikhilam", 5, "Beginner", "cat");
    expect(apiPost).toHaveBeenCalledWith("/practice/session", { slots: [{ skill: "nikhilam", bucket: "primary", n: 5 }] });
    expect(JSON.stringify(apiPost.mock.calls[0])).not.toMatch(/exam|domain|cat/);
  });

  it("real API mode never reads from the mock layer", async () => {
    const mockModule = vi.fn();
    vi.doMock("@/lib/mock/explorer", () => {
      mockModule();
      return { getSubjectTree: () => [] };
    });
    const { getSubjectTree } = await import("@/services/explorer");
    apiGet.mockResolvedValue({ topics: [], techniques: [] });
    await getSubjectTree("cat");
    expect(mockModule).not.toHaveBeenCalled();
  });
});
