import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXAM_TOPIC_CATALOG_SUPPORTED,
  globalTopicsNotice,
  isActivePath,
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

  it("declares that the backend has no exam-specific topic catalog", () => {
    expect(EXAM_TOPIC_CATALOG_SUPPORTED).toBe(false);
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

  it("selecting CAT does not send an exam filter to /api/topics or return CAT-labelled nodes", async () => {
    const { getSubjectTree } = await import("@/services/explorer");
    apiGet.mockImplementation(async (path: string) =>
      path === "/api/topics"
        ? { topics: [{ topic: "Trigonometry", problems: 7, subtopics: 7 }] }
        : { techniques: [] },
    );
    const tree = await getSubjectTree("cat");
    expect(apiGet).toHaveBeenCalledWith("/api/topics");
    expect(apiGet.mock.calls.every(([path]) => !/cat|exam|domain/i.test(String(path)))).toBe(true);
    expect(JSON.stringify(tree).toLowerCase()).not.toContain("cat");
    expect(tree[0].children?.[0].title).toBe("Trigonometry");
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
