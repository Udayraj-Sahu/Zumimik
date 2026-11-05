import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPost } from "./api";

vi.mock("./api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/lib/platform", () => ({ IS_MOCK: false }));

const mockedApiGet = vi.mocked(apiGet);
const mockedApiPost = vi.mocked(apiPost);

describe("frontend routes implemented by Speed-Gym", () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
    mockedApiPost.mockReset();
  });

  it("uses dashboard routes for leaderboard and analytics data", async () => {
    const { getLeaderboard } = await import("./leaderboard");
    const { getAnalyticsStats, getWeeklyActivity, getRecentActivity } = await import("./analytics");
    mockedApiGet.mockResolvedValueOnce([] as never);
    await getLeaderboard();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/dashboard/leaderboard");

    mockedApiGet.mockResolvedValueOnce({ accuracy: 80, questions: 40, percentile: 65, speed: 30 } as never);
    await getAnalyticsStats();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/dashboard/stats");

    mockedApiGet.mockResolvedValueOnce({ days: [true], labels: ["M"] } as never);
    await getWeeklyActivity();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/dashboard/streak");

    mockedApiGet.mockResolvedValueOnce([{ label: "Practice", score: "4/5", time: "Today" }] as never);
    await getRecentActivity();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/dashboard/recent-activity");
  });

  it("uses the backend social and mock-blueprint routes", async () => {
    const { getFriendsSummary } = await import("./friends");
    const { getMockPapers } = await import("./mock-exam");
    const { getAchievements } = await import("./achievements");

    mockedApiGet.mockResolvedValueOnce({ friends: [], incoming: [], outgoing: [] } as never);
    await getFriendsSummary();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/social/friends");

    mockedApiGet.mockResolvedValueOnce({ achievements: [] } as never);
    await getAchievements();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/social/achievements");

    mockedApiGet.mockResolvedValueOnce({ blueprints: [] } as never);
    await getMockPapers("cat");
    expect(mockedApiGet).toHaveBeenLastCalledWith("/mocks/blueprints");
  });

  it("uses the backend's unversioned content routes and practice catalog", async () => {
    const { getSubjectTree, getLeafTechniques, getSubjectEdges } = await import("./explorer");

    // The explorer tree combines the two global endpoints; neither is sent an exam.
    mockedApiGet.mockResolvedValueOnce({ topics: [] } as never).mockResolvedValueOnce({ techniques: [] } as never);
    await getSubjectTree("cat");
    expect(mockedApiGet).toHaveBeenCalledWith("/api/topics");
    expect(mockedApiGet).toHaveBeenCalledWith("/api/practice/techniques?limit=500");

    mockedApiGet.mockResolvedValueOnce({ techniques: [] } as never);
    await getLeafTechniques("cat");
    expect(mockedApiGet).toHaveBeenLastCalledWith("/api/practice/techniques?limit=500");

    mockedApiGet.mockResolvedValueOnce({ skills: [] } as never);
    await getSubjectEdges();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/practice/catalog");
  });

  it("requests practice and sprint questions from the backend session contract", async () => {
    const { getPracticeSession } = await import("./practice");
    const { getSprintQuestions } = await import("./sprint-session");
    const emptySession = { items: [], summary: { requested: 10, served: 0 } };

    // Practice requests a catalog skill as a slot (POST); GET filters on corpus topic/technique labels.
    mockedApiPost.mockResolvedValueOnce(emptySession as never);
    await getPracticeSession("nikhilam", 10, "Beginner", "cat");
    expect(mockedApiPost).toHaveBeenLastCalledWith("/practice/session", {
      slots: [{ skill: "nikhilam", bucket: "primary", n: 10 }],
    });

    // Sprint uses the same slot request: GET ?topic= returned no questions for most catalog skills (verified on staging).
    mockedApiPost.mockResolvedValueOnce(emptySession as never);
    await getSprintQuestions("nikhilam", 10, "Beginner", "cat");
    expect(mockedApiPost).toHaveBeenLastCalledWith("/practice/session", { slots: [{ skill: "nikhilam", bucket: "primary", n: 10 }] });
    expect(mockedApiGet).not.toHaveBeenCalledWith(expect.stringContaining("/practice/session"));
  });

  it("uses the server-scored mock history and blueprint routes", async () => {
    const { getHistory, getTopicFilterOptions } = await import("./history");

    mockedApiGet.mockResolvedValueOnce({ attempts: [] } as never);
    await getHistory("cat");
    expect(mockedApiGet).toHaveBeenLastCalledWith("/mocks/history");

    mockedApiGet.mockResolvedValueOnce({ blueprints: [] } as never);
    await getTopicFilterOptions("cat");
    expect(mockedApiGet).toHaveBeenLastCalledWith("/mocks/blueprints");
  });

  it("gets available sprint skills from the backend practice catalog", async () => {
    const { getSprintTopics } = await import("./sprint");
    mockedApiGet.mockResolvedValueOnce({ skills: [] } as never);
    await getSprintTopics("cat");
    expect(mockedApiGet).toHaveBeenLastCalledWith("/practice/catalog");
  });

  it("uses dashboard events and mock history instead of missing route families", async () => {
    const { getNotifications } = await import("./notifications");
    const { getReportsData } = await import("./reports");

    mockedApiGet.mockResolvedValueOnce([{ title: "Daily Challenge", time: "Today", tag: "LIVE" }] as never);
    await getNotifications();
    expect(mockedApiGet).toHaveBeenLastCalledWith("/dashboard/events");

    mockedApiGet.mockResolvedValueOnce({ attempts: [] } as never);
    mockedApiGet.mockResolvedValueOnce({ xp: 0 } as never);
    await getReportsData();
    expect(mockedApiGet).toHaveBeenNthCalledWith(2, "/mocks/history");
    expect(mockedApiGet).toHaveBeenNthCalledWith(3, "/dashboard/streak");
  });

  it("hydrates adaptive state from practice mastery and records sessions through sync", async () => {
    const { getAdaptiveState, recordAdaptiveSession } = await import("./adaptive");
    mockedApiGet.mockResolvedValueOnce({ technique_states: {}, selection: {} } as never);
    await getAdaptiveState("cat");
    expect(mockedApiGet).toHaveBeenLastCalledWith("/practice/mastery");

    mockedApiPost.mockResolvedValueOnce({ accepted: 1 } as never);
    mockedApiGet.mockResolvedValueOnce({ technique_states: {}, selection: {} } as never);
    await recordAdaptiveSession({
      domain: "cat",
      topicId: "qa",
      topicLabel: "Quantitative Aptitude",
      difficulty: "Adaptive",
      score: 6,
      total: 10,
      accuracy: 60,
      xpEarned: 50,
      totalTimeSpent: 120,
      ts: 1_800_000_000_000,
    });
    expect(mockedApiPost).toHaveBeenCalledWith(
      "/sync",
      expect.objectContaining({
        events: [expect.objectContaining({ event_type: "session_end", metadata: expect.objectContaining({
          domain: "cat",
          problems_attempted: 10,
          problems_correct: 6,
        }) })],
      }),
    );
    expect(mockedApiGet).toHaveBeenLastCalledWith("/practice/mastery");
  });

  it("uses the backend signed scanner-login pairing flow", async () => {
    const { createPairingSession, pollPairingStatus, approvePairing } = await import("./pairing");
    const code = "Abcdefgh_12345678";
    const sig = "a".repeat(64);
    mockedApiPost.mockResolvedValueOnce({ code, sig, pollToken: "poll-token", expiresIn: 300 } as never);
    const session = await createPairingSession();
    expect(mockedApiPost).toHaveBeenLastCalledWith("/auth/scanner-login/generate");

    mockedApiGet.mockResolvedValueOnce({ status: "pending" } as never);
    await pollPairingStatus({ code, pollToken: "poll-token", createdAt: session.createdAt, expiresAt: session.expiresAt });
    expect(mockedApiGet).toHaveBeenLastCalledWith(
      `/auth/scanner-login/poll?code=${code}&pollToken=poll-token`,
    );

    mockedApiPost.mockResolvedValueOnce({ status: "approved" } as never);
    await approvePairing(JSON.stringify({ code, sig }));
    expect(mockedApiPost).toHaveBeenLastCalledWith("/auth/scanner-login/verify", { code, sig });
  });

  it("syncs completed practice attempts through the backend event endpoint", async () => {
    const { syncSprintResult } = await import("./telemetry");
    mockedApiPost.mockResolvedValueOnce({ accepted: 2 } as never);
    await syncSprintResult(
      {
        topic: "nikhilam",
        questions: [{
          id: "problem-1",
          text: "What is 6 × 7?",
          options: [],
          correctIndex: -1,
          answerType: "text",
          expectedAnswer: 42,
          answerCheck: "client_extract",
          feedsMastery: true,
          timeLimit: 30,
          techniqueId: "nikhilam",
        }],
      },
      {
        answers: [{ questionId: "problem-1", selectedIndex: -1, answerText: "42", correct: true, timeSpent: 12 }],
        score: 1,
        total: 1,
        accuracy: 100,
        totalTimeSpent: 12,
        xpEarned: 10,
      },
      "cat",
      "practice",
    );
    expect(mockedApiPost).toHaveBeenCalledWith(
      "/sync",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({ event_type: "problem_attempt", metadata: expect.objectContaining({ problem_id: "problem-1", is_correct: true }) }),
          expect.objectContaining({ event_type: "session_end", metadata: expect.objectContaining({ session_type: "practice", problems_correct: 1 }) }),
        ]),
      }),
    );
  });
});
